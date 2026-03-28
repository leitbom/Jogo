// ═══════════════════════════════════════════════════════
// Application Service: DeathmatchGameService
// Responsibility: match lifecycle for Deathmatch mode — 
//   countdown, spawn, respawn, kill limit win condition, 
//   timer fallback, end match.
// ═══════════════════════════════════════════════════════

import type { IRoomRepository }   from '../domain/ports/out/IRoomRepository';
import type { IGameEventEmitter } from '../domain/ports/out/IGameEventEmitter';
import type { ILogger }           from '../domain/ports/out/ILogger';
import type { Room, SpawnPoint }  from '../domain/entities/Room';
import { toPublicPlayer }         from '../domain/entities/Player';
import {
  AGENT_STATS, WEAPON_MAG,
  SPAWN_POINTS,
  TICK_HZ_GAME,
} from '../domain/entities/AgentStats';
import type { SecurityGuard } from './SecurityGuard';
import type { IGameModeService } from '../domain/ports/in/IGameModeService';
import { PhysicsUtils } from '../domain/utils/PhysicsUtils';

export class DeathmatchGameService implements IGameModeService {
  constructor(
    private readonly rooms: IRoomRepository,
    private readonly emitter: IGameEventEmitter,
    private readonly logger: ILogger,
    private readonly security?: SecurityGuard,
  ) {}

  // ── COUNTDOWN → START ─────────────────────────────────
  startCountdown(roomCode: string): void {
    const room = this.rooms.findByCode(roomCode);
    if (!room) return;
    room.state = 'countdown';

    let n = 3; // Use constant or room config
    this.emitter.toRoom(roomCode, 'game:countdown', { count: n });

    const iv = setInterval(() => {
      n--;
      if (n > 0) {
        this.emitter.toRoom(roomCode, 'game:countdown', { count: n });
      } else {
        clearInterval(iv);
        this.startMatch(roomCode);
      }
    }, 1_000);
  }

  // ── MATCH START ───────────────────────────────────────
  private startMatch(roomCode: string): void {
    const room = this.rooms.findByCode(roomCode);
    if (!room) return;
    room.state = 'in_game';

    const spawnPoints = this.assignSpawns(room);
    const now         = Date.now();

    room.aliveCount    = room.players.size;
    room.totalPlayers  = room.players.size;
    room.lastDeadIds   = [];
    room.matchStartTime = now;
    room.killLeader    = null;

    for (const p of room.players.values()) {
      const stats = AGENT_STATS[p.agentKey] ?? AGENT_STATS.fable;
      const mag   = WEAPON_MAG[stats.weapon] ?? 30;
      p.alive         = true;
      p.hp            = stats.hp;
      p.armor         = stats.armor;
      p.ammoCurrentMag = mag;
      p.ammoReserve   = mag;
      p.kills         = 0;
      p.deaths        = 0;
      p.damageDealt   = 0;
      p.damageTaken   = 0;
      p.shotsFired    = 0;
      p.shotsHit      = 0;
      p.spawnTime     = now;
      p.deathTime     = null;
      p.winner        = false;
      if (this.security) this.security.resetPosition(p.id);
    }

    this.emitter.toRoom(roomCode, 'game:start', {
      spawnPoints,
      players:      [...room.players.values()].map(toPublicPlayer),
      roomCode,
      totalPlayers: room.totalPlayers,
      timerTotal:   room.gameModeConfig.matchTimeLimitS,
      mapData:      room.mapData,
    });
    this.emitter.toRoom(roomCode, 'game:timer',       { remaining_s: room.gameModeConfig.matchTimeLimitS });
    this.emitter.toRoom(roomCode, 'game:alive_count', { alive: room.aliveCount, total: room.totalPlayers });

    this.logger.info(`[deathmatch:start] ${roomCode} ${room.players.size}p`);
    this.startTimer(room);
    this.startStateTick(room); 
  }

  // ── HANDLE PLAYER DEATH ───────────────────────────────
  handlePlayerDied(socketId: string, killedBy: string | null, cause: string): void {
    const room   = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (!player || !player.alive || room!.state !== 'in_game') return;

    player.alive     = false;
    player.deathTime = Date.now();
    player.deaths++;

    const killer = killedBy ? room!.players.get(killedBy) : null;
    if (killer && killer.id !== socketId) {
      killer.kills++;
      // Update kill leader
      if (!room!.killLeader || killer.kills > (room!.players.get(room!.killLeader)?.kills || 0)) {
        room!.killLeader = killer.id;
      }
    }

    room!.lastDeadIds = [socketId];

    this.emitter.toRoom(room!.code, 'game:kill', {
      killer_id: killedBy,
      victim_id: socketId,
      cause,
    });
    
    this.logger.info(`[kill] ${(killedBy ?? '??').slice(0,6)}→${socketId.slice(0,6)} (${cause})`);

    this.checkWinCondition(room!);

    // Start respawn timer
    if (room!.state === 'in_game') {
      const deadline = Date.now() + room!.gameModeConfig.respawnTimeS * 1000;
      this.emitter.toSocket(socketId, 'respawn_at', { deadline });
      
      setTimeout(() => {
        this.respawnPlayer(room!, socketId);
      }, room!.gameModeConfig.respawnTimeS * 1000);
    }
  }

  private respawnPlayer(room: Room, socketId: string): void {
    const p = room.players.get(socketId);
    if (!p || p.alive || room.state !== 'in_game') return;

    const stats = AGENT_STATS[p.agentKey] ?? AGENT_STATS.fable;
    const mag   = WEAPON_MAG[stats.weapon] ?? 30;
    
    // Assign a random spawn point
    const mapSpawns = room.mapData?.spawnPoints || [];
    let sp: SpawnPoint;
    if (mapSpawns.length > 0) {
      sp = mapSpawns[Math.floor(Math.random() * mapSpawns.length)];
    } else {
      sp = SPAWN_POINTS[Math.floor(Math.random() * 4)];
    }

    // Ensure safe spawn
    const safePos = PhysicsUtils.findSafeSpawn(sp.x, sp.y, 20, room.mapData || {});
    sp = { x: safePos.x, y: safePos.y };

    p.alive = true;
    p.hp = stats.hp;
    p.armor = stats.armor;
    p.ammoCurrentMag = mag;
    p.ammoReserve = mag;
    p.deathTime = null;
    p.x = sp.x;
    p.y = sp.y;
    p.pendingInputs = []; // Clear old inputs so they don't drag the player back
    
    if (this.security) this.security.resetPosition(p.id);

    this.emitter.toRoom(room.code, 'game:respawn', {
      id: p.id,
      x: sp.x,
      y: sp.y,
      hp: p.hp,
      armor: p.armor,
      ammoCurrentMag: p.ammoCurrentMag,
      ammoReserve: p.ammoReserve
    });

    this.logger.info(`[respawn] ${p.id.slice(0,6)} at (${sp.x},${sp.y})`);
  }

  // ── DISCONNECT DEATH ─────────────────────────────────
  handleDisconnectDeath(socketId: string): void {
    this.handlePlayerDied(socketId, null, 'DESCONEXÃO');
    const room = this.rooms.findBySocketId(socketId);
    const roomCode = room?.code;
    if (room) {
      room.players.delete(socketId);
      if (room.players.size === 0) {
        if (room.timerIntervalId) clearInterval(room.timerIntervalId);
        this.rooms.delete(room.code);
      }
    }
    this.rooms.unlinkSocket(socketId);
    if (roomCode) {
      this.emitter.toRoom(roomCode, 'peer_left', { id: socketId });
    }
  }

  // ── SHOT COUNT ───────────────────────────────────────
  incrementShotsFired(socketId: string): void {
    const room   = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (player && room?.state === 'in_game') player.shotsFired++;
  }

  // ── INPUT HANDLING ──────────────────────────────────────
  onClientInput(socketId: string, input: any): void {
    const room = this.rooms.findBySocketId(socketId);
    const p = room?.players.get(socketId);
    if (!p || room?.state !== 'in_game') return;
    
    // Validate input basic structure
    if (typeof input.dt !== 'number') return;
    if (p.pendingInputs.length < 30) {
      p.pendingInputs.push(input);
    }
  }

  // ── WIN CONDITION ────────────────────────────────────
  private checkWinCondition(room: Room): void {
    if (room.state !== 'in_game') return;
    
    const killLimit = room.gameModeConfig.killLimit;
    const topScorer = [...room.players.values()].find(p => p.kills >= killLimit);

    if (topScorer) {
      topScorer.winner = true;
      this.endMatch(room, [topScorer.id]);
    }
  }

  // ── END MATCH ────────────────────────────────────────
  private endMatch(room: Room, winnerIds: string[]): void {
    if (room.state === 'ended') return;
    room.state = 'ended';
    if (room.timerIntervalId)    { clearInterval(room.timerIntervalId);    room.timerIntervalId    = null; }
    if (room.stateTickIntervalId) { clearInterval(room.stateTickIntervalId); room.stateTickIntervalId = null; }

    winnerIds.forEach(id => {
      const p = room.players.get(id);
      if (p) p.winner = true;
    });

    const stats: any = {};
    const now = Date.now();
    for (const p of room.players.values()) {
      const elapsed = p.deathTime != null
        ? Math.round((p.deathTime - (p.spawnTime ?? p.deathTime)) / 1_000)
        : Math.round((now - (p.spawnTime ?? now)) / 1_000);
      stats[p.id] = {
        name:         p.name,
        agentKey:     p.agentKey,
        kills:        p.kills,
        damageDealt:  p.damageDealt,
        damageTaken:  p.damageTaken,
        accuracy:     p.shotsFired > 0 ? Math.round((p.shotsHit / p.shotsFired) * 100) : 0,
        survivalTime: elapsed,
        winner:       p.winner,
      };
    }

    this.logger.info(`[game:end] ${room.code} winners=${winnerIds.join(',')}`);
    this.emitter.toRoom(room.code, 'game:end', { winners: winnerIds, stats });
  }

  // ── TIMER ────────────────────────────────────────────
  private startTimer(room: Room): void {
    room.timerRemaining = room.gameModeConfig.matchTimeLimitS;
    room.timerIntervalId = setInterval(() => {
      if (room.state !== 'in_game') {
        clearInterval(room.timerIntervalId!);
        room.timerIntervalId = null;
        return;
      }
      room.timerRemaining--;
      this.emitter.toRoom(room.code, 'game:timer', { remaining_s: room.timerRemaining });
      if (room.timerRemaining <= 0) {
        clearInterval(room.timerIntervalId!);
        room.timerIntervalId = null;
        
        // Winner is the one with most kills
        let maxKills = -1;
        let winners: string[] = [];
        for (const p of room.players.values()) {
          if (p.kills > maxKills) {
            maxKills = p.kills;
            winners = [p.id];
          } else if (p.kills === maxKills) {
            winners.push(p.id);
          }
        }
        this.endMatch(room, winners);
      }
    }, 1_000);
  }

  // ── SPAWN POINTS ──────────────────────────────────────
  private assignSpawns(room: Room): Record<string, SpawnPoint> {
    const players = [...room.players.values()].sort(() => Math.random() - 0.5);
    const result: Record<string, SpawnPoint> = {};
    
    const mapSpawns = room.mapData?.spawnPoints || [];
    
    players.forEach((p, i) => {
      let sp: SpawnPoint;
      if (mapSpawns.length > 0) {
        sp = mapSpawns[i % mapSpawns.length];
      } else {
        sp = SPAWN_POINTS[i % 4];
      }
      
      const off = i >= (mapSpawns.length || 4)
        ? { x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60 }
        : { x: 0, y: 0 };
        
      result[p.id] = PhysicsUtils.findSafeSpawn(Math.round(sp.x + off.x), Math.round(sp.y + off.y), 20, room.mapData || {});
      p.x = result[p.id].x;
      p.y = result[p.id].y;
      p.pendingInputs = [];
    });
    return result;
  }

  // ── STATE TICK (60 Hz) ────────────────────────────────
  private startStateTick(room: Room): void {
    const intervalMs = Math.round(1_000 / TICK_HZ_GAME);
    const historyBuffer: Array<{ time: number, players: Record<string, {x: number, y: number}> }> = [];
    (room as any).stateTickHistory = historyBuffer; // stash for lag comp

    room.stateTickIntervalId = setInterval(() => {
      if (room.state !== 'in_game') {
        clearInterval(room.stateTickIntervalId!);
        room.stateTickIntervalId = null;
        return;
      }
      
      const now = Date.now();
      const changedFields: Record<string, any> = {};
      const snapshotPlayers: Record<string, {x: number, y: number}> = {};

      for (const [id, p] of room.players) {
        if (!p.alive) continue;

        const inputs = p.pendingInputs || [];
        let walked = false;
        let latestVisual: any = null;

        while (inputs.length > 0) {
          const input = inputs.shift()!;
          const isDashing = input.visualState && input.visualState.dashRemaining > 0;
          const dashAngle = (input.visualState && input.visualState.dashAngle !== undefined) ? input.visualState.dashAngle : input.angle;
          const speed = isDashing ? 1466 : (input.visualState?._running ? 380 : 255); 
          const safeDt = Math.min(input.dt, 50); // cap to 50ms per input

          const radius = 14; 

          if (isDashing) {
            // Nykora dash bypasses walls and uses dash-specific speed/angle
            p.x += Math.cos(dashAngle) * speed * (safeDt / 1000);
            p.y += Math.sin(dashAngle) * speed * (safeDt / 1000);
          } else {
            // Check if stuck (due to ending a dash or teleports) and push out
            if (PhysicsUtils.isColliding(p.x, p.y, radius, room.mapData || {})) {
              const safe = PhysicsUtils.findSafeSpawn(p.x, p.y, radius, room.mapData || {});
              p.x = safe.x; p.y = safe.y;
            }

            const nx = p.x + input.dx * speed * (safeDt / 1000);
            const ny = p.y + input.dy * speed * (safeDt / 1000);
            
            if (!PhysicsUtils.isColliding(nx, p.y, radius, room.mapData || {})) p.x = nx;
            if (!PhysicsUtils.isColliding(p.x, ny, radius, room.mapData || {})) p.y = ny;
          }

          // Clamp to world bounds
          const worldSize = (room.mapData?.size?.width) || (room.mapData?.worldSize) || 2048;
          p.x = Math.max(radius, Math.min(worldSize - radius, p.x));
          p.y = Math.max(radius, Math.min(worldSize - radius, p.y));

          p.angle = input.angle;
          p.lastProcessedSeq = input.seq;
          latestVisual = input.visualState;
          walked = true;
        }

        if (latestVisual) p.stateRelay = latestVisual;

        // Delta compression: only send fields if updated
        changedFields[id] = {
           x: Math.round(p.x),
           y: Math.round(p.y),
           angle: Math.round(p.angle),
           lastProcessedSeq: p.lastProcessedSeq,
           visual: p.stateRelay
        };

        snapshotPlayers[id] = { x: p.x, y: p.y };
      }

      historyBuffer.push({ time: now, players: snapshotPlayers });
      if (historyBuffer.length > 60) historyBuffer.shift();

      if (Object.keys(changedFields).length > 0) {
        this.emitter.toRoom(room.code, 'sv_state_update', { t: now, data: changedFields });
      }
    }, intervalMs);
  }
}
