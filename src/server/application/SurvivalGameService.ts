// ═══════════════════════════════════════════════════════
// Application Service: SurvivalGameService
// Responsibility: match lifecycle — countdown, spawn,
//   180s timer, kill handling, win conditions, end match.
// ═══════════════════════════════════════════════════════

import type { IRoomRepository }   from '../domain/ports/out/IRoomRepository';
import type { IGameEventEmitter } from '../domain/ports/out/IGameEventEmitter';
import type { ILogger }           from '../domain/ports/out/ILogger';
import type { Room, SpawnPoint }  from '../domain/entities/Room';
import { toPublicPlayer }         from '../domain/entities/Player';
import {
  AGENT_STATS, WEAPON_MAG,
  MATCH_TIME_S, COUNTDOWN_S, SPAWN_POINTS,
  TICK_HZ_GAME,
} from '../domain/entities/AgentStats';
import type { SecurityGuard } from './SecurityGuard';
import type { IGameModeService } from '../domain/ports/in/IGameModeService';
import { PhysicsUtils } from '../domain/utils/PhysicsUtils';

// ── Types ──────────────────────────────────────────────
export interface PlayerStat {
  name: string;
  agentKey: string;
  kills: number;
  damage_dealt: number;
  damage_taken: number;
  accuracy: number;
  survival_time: number;
  winner: boolean;
}
export type StatsMap = Record<string, PlayerStat>;

export class SurvivalGameService implements IGameModeService {
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

    let n = COUNTDOWN_S;
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
      p.knockbackX    = 0;
      p.knockbackY    = 0;
      if (this.security) this.security.resetPosition(p.id);
    }

    this.emitter.toRoom(roomCode, 'game:start', {
      spawnPoints,
      players:      [...room.players.values()].map(toPublicPlayer),
      roomCode,
      totalPlayers: room.totalPlayers,
      timerTotal:   MATCH_TIME_S,
      mapData:      room.mapData,
    });
    this.emitter.toRoom(roomCode, 'game:timer',       { remaining_s: MATCH_TIME_S });
    this.emitter.toRoom(roomCode, 'game:alive_count', { alive: room.aliveCount, total: room.totalPlayers });

    this.logger.info(`[survival:start] ${roomCode} ${room.players.size}p`);
    this.startTimer(room);
    this.startStateTick(room);  // 30 Hz state-broadcast tick
  }

  // ── HANDLE PLAYER DEATH ───────────────────────────────
  handlePlayerDied(socketId: string, killedBy: string | null, cause: string): void {
    const room   = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (!player || !player.alive || room!.state !== 'in_game') return;

    player.alive     = false;
    player.deathTime = Date.now();
    player.deaths++;
    player.knockbackX = 0; // Reset knockback on death
    player.knockbackY = 0; // Reset knockback on death

    const killer = killedBy ? room!.players.get(killedBy) : null;
    if (killer?.alive) killer.kills++;

    room!.lastDeadIds = [socketId];
    room!.aliveCount  = [...room!.players.values()].filter(p => p.alive).length;

    this.emitter.toRoom(room!.code, 'game:kill', {
      killer_id: killedBy,
      victim_id: socketId,
      cause,
    });
    this.emitter.toRoom(room!.code, 'peer_dead', {
      id: socketId,
      dead: true,
      x: player.x,
      y: player.y,
      angle: player.angle,
    });
    this.emitter.toRoom(room!.code, 'game:alive_count', {
      alive: room!.aliveCount,
      total: room!.totalPlayers,
    });
    this.logger.info(`[kill] ${(killedBy ?? '??').slice(0,6)}→${socketId.slice(0,6)} (${cause})`);

    this.checkWinCondition(room!);
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
    const alive = [...room.players.values()].filter(p => p.alive);

    if (alive.length === 1) {
      alive[0].winner = true;
      this.endMatch(room, [alive[0].id]);
    } else if (alive.length === 0) {
      const tieIds = room.lastDeadIds.length > 0 ? room.lastDeadIds : [];
      this.endMatch(room, tieIds);
    } else {
      room.aliveCount = alive.length;
      this.emitter.toRoom(room.code, 'game:alive_count', { alive: alive.length, total: room.totalPlayers });
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

    const stats: StatsMap = {};
    const now = Date.now();
    for (const p of room.players.values()) {
      const elapsed = p.deathTime != null
        ? Math.round((p.deathTime - (p.spawnTime ?? p.deathTime)) / 1_000)
        : Math.round((now - (p.spawnTime ?? now)) / 1_000);
      stats[p.id] = {
        name:          p.name,
        agentKey:      p.agentKey,
        kills:         p.kills,
        damage_dealt:  p.damageDealt,
        damage_taken:  p.damageTaken,
        accuracy:      p.shotsFired > 0 ? Math.round((p.shotsHit / p.shotsFired) * 100) : 0,
        survival_time: elapsed,
        winner:        p.winner,
      };
    }

    this.logger.info(`[game:end] ${room.code} winners=${winnerIds.join(',')}`);
    this.emitter.toRoom(room.code, 'game:end', { winners: winnerIds, stats });
  }

  // ── TIMER ────────────────────────────────────────────
  private startTimer(room: Room): void {
    room.timerRemaining = MATCH_TIME_S;
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
        const alive = [...room.players.values()].filter(p => p.alive);
        alive.forEach(p => { p.winner = true; });
        this.endMatch(room, alive.map(p => p.id));
      }
    }, 1_000);
  }

  // ── SPAWN POINTS ──────────────────────────────────────
  private assignSpawns(room: Room): Record<string, SpawnPoint> {
    const players = [...room.players.values()].sort(() => Math.random() - 0.5);
    const result: Record<string, SpawnPoint> = {};
    
    // Prioritize spawn points from map data
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
      const worldSize = (room.mapData?.size?.width) || (room.mapData?.worldSize) || 2048;

      for (const [id, p] of room.players) {
        if (!p.alive) continue;
        
        // Apply knockback if any
        if (p.knockbackX !== 0 || p.knockbackY !== 0) {
          const radius = AGENT_STATS[p.agentKey]?.radius || 14;
          let newX = p.x + p.knockbackX;
          let newY = p.y + p.knockbackY;
          
          // Clamp to world bounds FIRST to prevent teleport to corners
          newX = Math.max(radius, Math.min(worldSize - radius, newX));
          newY = Math.max(radius, Math.min(worldSize - radius, newY));
          
          // Check if knockback position is valid (not inside walls)
          if (!PhysicsUtils.isColliding(newX, newY, radius, room.mapData || {}, worldSize, 2.0)) {
            p.x = newX;
            p.y = newY;
          } else {
            // Try to slide along walls
            if (!PhysicsUtils.isColliding(newX, p.y, radius, room.mapData || {}, worldSize, 2.0)) {
              p.x = newX;
            } else if (!PhysicsUtils.isColliding(p.x, newY, radius, room.mapData || {}, worldSize, 2.0)) {
              p.y = newY;
            }
          }
          
          // Decay knockback
          p.knockbackX *= 0.8;
          p.knockbackY *= 0.8;
          if (Math.abs(p.knockbackX) < 0.1) p.knockbackX = 0;
          if (Math.abs(p.knockbackY) < 0.1) p.knockbackY = 0;
        }

        const inputs = p.pendingInputs || [];
        let walked = false;
        let latestVisual: any = null;

        while (inputs.length > 0) {
          const input = inputs.shift()!;
          const isDashing = input.visualState && input.visualState.dashRemaining > 0;
          const dashAngle = (input.visualState && input.visualState.dashAngle !== undefined) ? input.visualState.dashAngle : input.angle;
          let speedMultiplier = 1;
          const now = Date.now();
          if (p.stunDeadline && now < p.stunDeadline) speedMultiplier = 0;
          else if (p.slowDeadline && now < p.slowDeadline) speedMultiplier = 0.5;

          const speed = (isDashing ? 1466 : (input.visualState?._running ? 380 : 255)) * speedMultiplier; 
          const safeDt = Math.min(input.dt, 50); // cap to 50ms per input

          const radius = AGENT_STATS[p.agentKey]?.radius || 14; 

          if (isDashing) {
            // Nykora dash Absolute Trajectory Interpolation
            const vs = input.visualState;
            if (vs.dashStartX !== undefined && vs.dashTargetX !== undefined) {
              const f = 1 - Math.max(0, vs.dashRemaining / 0.15);
              p.x = vs.dashStartX + (vs.dashTargetX - vs.dashStartX) * f;
              p.y = vs.dashStartY + (vs.dashTargetY - vs.dashStartY) * f;
            } else {
              // Fallback for missing trajectory
            }
          } else {
            // Check if stuck (deeply inside wall) and push out
            if (PhysicsUtils.isColliding(p.x, p.y, radius - 1, room.mapData || {}, worldSize)) {
              const safe = PhysicsUtils.findSafeSpawn(p.x, p.y, radius, room.mapData || {});
              p.x = safe.x; p.y = safe.y;
            }

            const nx = p.x + input.dx * speed * (safeDt / 1000);
            const ny = p.y + input.dy * speed * (safeDt / 1000);
            
            // Only move if no collision - prevent any penetration (using 2.0px buffer)
            if (!PhysicsUtils.isColliding(nx, ny, radius, room.mapData || {}, worldSize, 2.0)) { 
              p.x = nx; p.y = ny; 
            }
            // If blocked, try sliding along walls but only if movement is valid
            else {
              // Check if we can move partially in X direction
              if (!PhysicsUtils.isColliding(nx, p.y, radius, room.mapData || {}, worldSize, 2.0)) {
                p.x = nx;
              }
              // Check if we can move partially in Y direction
              if (!PhysicsUtils.isColliding(p.x, ny, radius, room.mapData || {}, worldSize, 2.0)) {
                p.y = ny;
              }
            }
            
            // Server-side validation: if somehow in collision, push player out
            if (PhysicsUtils.isColliding(p.x, p.y, radius, room.mapData || {}, worldSize, -1)) {
              const safe = PhysicsUtils.resolveCollision(p.x, p.y, radius, room.mapData || {}, worldSize);
              p.x = safe.x;
              p.y = safe.y;
            }
          }

          // Clamp to world bounds
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
           x: p.x,
           y: p.y,
           angle: p.angle,
           lastProcessedSeq: p.lastProcessedSeq,
           shieldActive: p.shieldActive,
           shieldHp: p.shieldHp,
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
