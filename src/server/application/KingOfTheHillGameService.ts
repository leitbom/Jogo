// ═══════════════════════════════════════════════════════
// Application Service: KingOfTheHillGameService
// Responsibility: match lifecycle for King of the Hill mode —
//   countdown, spawn, control zones, team scoring, respawn,
//   win condition (first to X points), timer fallback.
// ═══════════════════════════════════════════════════════

import type { IRoomRepository }   from '../domain/ports/out/IRoomRepository';
import type { IGameEventEmitter } from '../domain/ports/out/IGameEventEmitter';
import type { ILogger }           from '../domain/ports/out/ILogger';
import type { Room, SpawnPoint }  from '../domain/entities/Room';
import { toPublicPlayer, Player } from '../domain/entities/Player';
import {
  AGENT_STATS, WEAPON_MAG,
  SPAWN_POINTS,
  TICK_HZ_GAME,
} from '../domain/entities/AgentStats';
import type { SecurityGuard } from './SecurityGuard';
import type { IGameModeService } from '../domain/ports/in/IGameModeService';
import { PhysicsUtils } from '../domain/utils/PhysicsUtils';

interface ControlZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export class KingOfTheHillGameService implements IGameModeService {
  private controlZones: ControlZone[] = [];

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

    let n = 3;
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

    this.initControlZones(room);
    this.assignTeams(room);
    const spawnPoints = this.assignSpawns(room);
    const now         = Date.now();

    room.aliveCount     = room.players.size;
    room.totalPlayers   = room.players.size;
    room.lastDeadIds    = [];
    room.matchStartTime = now;
    room.teamScores     = { 0: 0, 1: 0 };
    room.controlZoneState = 'neutral';
    room.controlZoneOwner = null;
    room.controlZoneTimer = 0;
    room.pointsToWin    = room.gameModeConfig.pointsToWin ?? 100;

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
      controlZones: this.controlZones,
      pointsToWin:  room.pointsToWin,
    });
    this.emitter.toRoom(roomCode, 'game:timer',       { remaining_s: room.gameModeConfig.matchTimeLimitS });
    this.emitter.toRoom(roomCode, 'game:alive_count', { alive: room.aliveCount, total: room.totalPlayers });
    this.emitter.toRoom(roomCode, 'game:score',       { teamScores: room.teamScores });
    this.emitter.toRoom(roomCode, 'game:control_update', { 
      state: room.controlZoneState, 
      owner: room.controlZoneOwner,
      timer: room.controlZoneTimer 
    });

    this.logger.info(`[koth:start] ${roomCode} ${room.players.size}p`);
    this.startTimer(room);
    this.startControlZoneTick(room);
    this.startStateTick(room);
  }

  // ── TEAMS ──────────────────────────────────────────────
  private assignTeams(room: Room): void {
    const players = [...room.players.values()];
    players.forEach((p, i) => {
      p.team = i % 2 === 0 ? 'A' : 'B';
    });
    this.logger.info(`[koth:teams] ${room.code} assigned teams`);
  }

  // ── CONTROL ZONES ────────────────────────────────────────
  private initControlZones(room: Room): void {
    const mapZones = room.mapData?.objectiveZones?.filter(
      (z: any) => z.type === 'control_zone'
    ) || [];

    if (mapZones.length > 0) {
      this.controlZones = mapZones.map((z: any, i: number) => ({
        id: z.id || `koth${i + 1}`,
        x: z.x,
        y: z.y,
        width: z.width || 144,
        height: z.height || 144,
        label: z.label || `Zone ${i + 1}`,
      }));
    } else {
      this.controlZones = [{
        id: 'koth_center',
        x: 400,
        y: 400,
        width: 224,
        height: 224,
        label: 'CENTRO',
      }];
    }
  }

  private startControlZoneTick(room: Room): void {
    room.controlZoneTimer = 0;
    
    const controlInterval = setInterval(() => {
      if (room.state !== 'in_game') {
        clearInterval(controlInterval);
        return;
      }

      this.updateControlZone(room, controlInterval);
    }, 1000);

    (room as any).controlZoneInterval = controlInterval;
  }

  private updateControlZone(room: Room, controlInterval: ReturnType<typeof setInterval>): void {
    if (!this.controlZones.length) return;

    const zone = this.controlZones[0];
    const playersInZone = this.getPlayersInZone(room, zone);
    
    const teamAInZone = playersInZone.filter((p: Player) => p.team === 'A');
    const teamBInZone = playersInZone.filter((p: Player) => p.team === 'B');

    const hasTeamA = teamAInZone.length > 0;
    const hasTeamB = teamBInZone.length > 0;

    if (hasTeamA && hasTeamB) {
      room.controlZoneState = 'contested';
      room.controlZoneTimer = 0;
    } else if (hasTeamA) {
      room.controlZoneState = 'team_a';
      room.controlZoneOwner = 0;
      room.controlZoneTimer++;
      const pointsPerSec = room.gameModeConfig.controlPointsPerSecond || 1;
      room.teamScores[0] += pointsPerSec;
    } else if (hasTeamB) {
      room.controlZoneState = 'team_b';
      room.controlZoneOwner = 1;
      room.controlZoneTimer++;
      const pointsPerSec = room.gameModeConfig.controlPointsPerSecond || 1;
      room.teamScores[1] += pointsPerSec;
    } else {
      room.controlZoneState = 'neutral';
      room.controlZoneOwner = null;
      room.controlZoneTimer = 0;
    }

    this.emitter.toRoom(room.code, 'game:control_update', {
      state: room.controlZoneState,
      owner: room.controlZoneOwner,
      timer: room.controlZoneTimer,
    });

    this.emitter.toRoom(room.code, 'game:score', {
      teamScores: room.teamScores,
    });

    this.checkWinCondition(room, controlInterval);
  }

  private getPlayersInZone(room: Room, zone: ControlZone): Player[] {
    const playersInZone: Player[] = [];
    
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      
      const inZone = p.x >= zone.x && p.x <= zone.x + zone.width &&
                     p.y >= zone.y && p.y <= zone.y + zone.height;
      
      if (inZone) {
        playersInZone.push(p);
      }
    }
    
    return playersInZone;
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
    if (killer && killer.id !== socketId) {
      killer.kills++;
    }

    room!.lastDeadIds = [socketId];

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
    
    this.logger.info(`[kill] ${(killedBy ?? '??').slice(0,6)}→${socketId.slice(0,6)} (${cause})`);

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
    
    const mapSpawns = room.mapData?.spawnPoints || [];
    let sp: SpawnPoint;
    if (mapSpawns.length > 0) {
      sp = mapSpawns[Math.floor(Math.random() * mapSpawns.length)];
    } else {
      sp = SPAWN_POINTS[Math.floor(Math.random() * 4)];
    }

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
    p.pendingInputs = [];
    p.knockbackX = 0; // Ensure knockback is cleared on respawn
    p.knockbackY = 0; // Ensure knockback is cleared on respawn
    
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
    
    if (typeof input.dt !== 'number') return;
    if (p.pendingInputs.length < 30) {
      p.pendingInputs.push(input);
    }
  }

  // ── WIN CONDITION ────────────────────────────────────
  private checkWinCondition(room: Room, controlInterval: ReturnType<typeof setInterval>): void {
    if (room.state !== 'in_game') return;
    
    const pointsToWin = room.pointsToWin;
    
    if (room.teamScores[0] >= pointsToWin) {
      clearInterval(controlInterval);
      this.endMatch(room, [0]);
    } else if (room.teamScores[1] >= pointsToWin) {
      clearInterval(controlInterval);
      this.endMatch(room, [1]);
    }
  }

  // ── END MATCH ────────────────────────────────────────
  private endMatch(room: Room, winningTeams: number[]): void {
    if (room.state === 'ended') return;
    room.state = 'ended';
    if (room.timerIntervalId)    { clearInterval(room.timerIntervalId);    room.timerIntervalId    = null; }
    if (room.stateTickIntervalId) { clearInterval(room.stateTickIntervalId); room.stateTickIntervalId = null; }
    if ((room as any).controlZoneInterval) { clearInterval((room as any).controlZoneInterval); }

    const winnerIds: string[] = [];
    for (const p of room.players.values()) {
      if (p.team !== 'NONE' && winningTeams.includes(p.team === 'A' ? 0 : 1)) {
        p.winner = true;
        winnerIds.push(p.id);
      }
    }

    const stats: any = {};
    const now = Date.now();
    for (const p of room.players.values()) {
      const elapsed = p.deathTime != null
        ? Math.round((p.deathTime - (p.spawnTime ?? p.deathTime)) / 1_000)
        : Math.round((now - (p.spawnTime ?? now)) / 1_000);
      const teamScore = p.team === 'A' ? room.teamScores[0] : (p.team === 'B' ? room.teamScores[1] : 0);
      stats[p.id] = {
        name:          p.name,
        agentKey:      p.agentKey,
        kills:         p.kills,
        damage_dealt:  p.damageDealt,
        damage_taken:  p.damageTaken,
        accuracy:      p.shotsFired > 0 ? Math.round((p.shotsHit / p.shotsFired) * 100) : 0,
        survival_time: elapsed,
        winner:        p.winner,
        team:          p.team,
        teamScore:     teamScore,
      };
    }

    this.logger.info(`[game:end] ${room.code} winners=team_${winningTeams.join(',_')}`);
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
        
        let maxScore = -1;
        let winners: number[] = [];
        for (const [team, score] of Object.entries(room.teamScores)) {
          const teamNum = parseInt(team);
          if (score > maxScore) {
            maxScore = score;
            winners = [teamNum];
          } else if (score === maxScore) {
            winners.push(teamNum);
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
    
    const allSpawns = room.mapData?.spawnPoints || [];
    const teamASpawns = allSpawns.filter((s: any) => s.team === 'A');
    const teamBSpawns = allSpawns.filter((s: any) => s.team === 'B');
    
    players.forEach((p, i) => {
      let sp: SpawnPoint;
      if (p.team === 'A' && teamASpawns.length > 0) {
        sp = teamASpawns[i % teamASpawns.length];
      } else if (p.team === 'B' && teamBSpawns.length > 0) {
        sp = teamBSpawns[i % teamBSpawns.length];
      } else if (allSpawns.length > 0) {
        sp = allSpawns[i % allSpawns.length];
      } else {
        sp = SPAWN_POINTS[i % 4];
      }
      
      const off = { x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60 };
        
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
    (room as any).stateTickHistory = historyBuffer;

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
          const safeDt = Math.min(input.dt, 50);

          const radius = AGENT_STATS[p.agentKey]?.radius || 14;

          if (isDashing) {
            const vs = input.visualState;
            if (vs.dashStartX !== undefined && vs.dashTargetX !== undefined) {
              const f = 1 - Math.max(0, vs.dashRemaining / 0.15);
              p.x = vs.dashStartX + (vs.dashTargetX - vs.dashStartX) * f;
              p.y = vs.dashStartY + (vs.dashTargetY - vs.dashStartY) * f;
            } else {
              p.x += Math.cos(dashAngle) * speed * (safeDt / 1000);
              p.y += Math.sin(dashAngle) * speed * (safeDt / 1000);
            }
          } else {
            if (PhysicsUtils.isColliding(p.x, p.y, radius, room.mapData || {}, worldSize, -1)) {
              const safe = PhysicsUtils.resolveCollision(p.x, p.y, radius, room.mapData || {}, worldSize);
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

          p.x = Math.max(radius, Math.min(worldSize - radius, p.x));
          p.y = Math.max(radius, Math.min(worldSize - radius, p.y));

          p.angle = input.angle;
          p.lastProcessedSeq = input.seq;
          latestVisual = input.visualState;
          walked = true;
        }

        if (latestVisual) p.stateRelay = latestVisual;

        changedFields[id] = {
           x: p.x,
           y: p.y,
           angle: p.angle,
           lastProcessedSeq: p.lastProcessedSeq,
           stunDeadline: p.stunDeadline,
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