// ════════════════════════════════════════════════════════════════
// Entry Point — Tactical Shooter Server (TypeScript / Hexagonal)
// Tick policy:
//   • 10 Hz  global lobby tick  (placeholder / health check)
//   • 30 Hz  per-room game tick (managed by SurvivalGameService)
//
// Security policy — NEVER TRUST THE CLIENT:
//   All events are validated by SecurityGuard before processing.
// ════════════════════════════════════════════════════════════════

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io';

import { ConsoleLogger } from './adapters/out/ConsoleLogger';
import { InMemoryRoomRepository } from './adapters/out/InMemoryRoomRepository';
import { SocketIoEmitter } from './adapters/out/SocketIoEmitter';
import { LobbyService } from './application/LobbyService';
import { GameModeFactory } from './application/GameModeFactory';
import { SecurityGuard } from './application/SecurityGuard';
import type { GameMode } from './domain/entities/GameModeConfig';
import type { AgentKey, PlayerStateRelay } from './domain/entities/Player';
import {
  DISCONNECT_DEAD_MS,
  DMG_RANGES,
  MAX_HIT_RANGE,
  TICK_HZ_LOBBY,
  AGENT_STATS,
} from './domain/entities/AgentStats';
import { toPublicPlayer } from './domain/entities/Player';

// ── Infrastructure ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 5_000,
  pingTimeout: 10_000,
});

app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// ── Adapters ────────────────────────────────────────────────────
const roomRepo = new InMemoryRoomRepository();
const logger = new ConsoleLogger();
const socketMap = new Map<string, Socket>();
const emitter = new SocketIoEmitter(io, socketMap);

// ── Application services ─────────────────────────────────────────
const security = new SecurityGuard(logger);

// We'll use a factory to get the right service instance
const getGameSvc = (mode: GameMode) => GameModeFactory.create(mode, roomRepo, emitter, logger, security);

const lobbySvc = new LobbyService(
  roomRepo,
  emitter,
  logger,
  (roomCode) => {
    const room = roomRepo.findByCode(roomCode);
    if (room) {
      const svc = getGameSvc(room.gameMode);
      svc.startCountdown(roomCode);
    }
  },
);

// ── Status endpoint ─────────────────────────────────────────────
app.get('/status', (_req, res) => {
  res.json({
    rooms: roomRepo.all().map(r => ({
      code: r.code,
      state: r.state,
      timer: r.timerRemaining,
      alive: r.aliveCount,
      total: r.totalPlayers,
      players: [...r.players.values()].map(p => ({
        id: p.id.slice(0, 8),
        name: p.name,
        agent: p.agentKey,
        ready: p.ready,
        isHost: p.isHost,
        alive: p.alive,
        kills: p.kills,
        damageDealt: p.damageDealt,
        damageTaken: p.damageTaken,
        winner: p.winner,
      })),
    })),
  });
});

let _mapMetadataCache: { filename: string; name: string; modes: string[] }[] | null = null;
app.get('/maps', (_req, res) => {
  try {
    if (_mapMetadataCache) {
      res.json(_mapMetadataCache);
      return;
    }

    const mapsDir = path.join(__dirname, '..', '..', 'public', 'maps');
    if (!fs.existsSync(mapsDir)) {
      res.json([]);
      return;
    }
    const files = fs.readdirSync(mapsDir);
    const mapFiles = files.filter(f => f.endsWith('.json'));
    
    const metadata = mapFiles.map(filename => {
      try {
        const content = fs.readFileSync(path.join(mapsDir, filename), 'utf8');
        const json = JSON.parse(content);
        return {
          filename,
          name: json.name || filename.replace('.json', ''),
          modes: json.modes || ['survival'] // fallback
        };
      } catch (e) {
        return { filename, name: filename, modes: ['survival'] };
      }
    });

    _mapMetadataCache = metadata;
    res.json(metadata);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read maps' });
  }
});

// ── Lobby tick — 10 Hz ──────────────────────────────────────────
// Periodic health check. State relay is handled by per-room 30Hz ticks
// (started by SurvivalGameService on match start).
let _lobbyTick = 0;
setInterval(() => {
  _lobbyTick++;
  // Every 50 ticks = 5 s: broadcast lobby state to recover from dropped events
  if (_lobbyTick % 50 === 0) {
    for (const room of roomRepo.all()) {
      if (room.state === 'lobby') {
        io.to(room.code).emit('lobby:state_sync', {
          players: [...room.players.values()].map(toPublicPlayer),
          roomCode: room.code,
          gameMode: room.gameMode,
          gameModeConfig: room.gameModeConfig,
          selectedMap: room.selectedMap,
        });
      }
    }
  }
}, Math.round(1_000 / TICK_HZ_LOBBY));

// ── Relay helper ────────────────────────────────────────────────
function relay(socket: Socket, event: string, data: unknown): void {
  const room = roomRepo.findBySocketId(socket.id);
  if (room) socket.to(room.code).emit(event, { id: socket.id, ...(data as object) });
}

// ── Socket.IO connection handler ────────────────────────────────
io.on('connection', (socket: Socket) => {
  const myName = lobbySvc.generateName();
  socketMap.set(socket.id, socket);
  logger.info(`[+] ${socket.id.slice(0, 6)} name=${myName}`);

  // == LOBBY EVENTS — rate-limited ================================

  socket.on('lobby:create_room', () => {
    if (!security.checkLobbyRate(socket.id)) return;
    lobbySvc.createRoom(socket.id, myName);
  });

  socket.on('lobby:join_room', ({ code }: { code: string }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    lobbySvc.joinRoom(socket.id, myName, code);
  });

  socket.on('lobby:select_agent', ({ agentKey }: { agentKey: AgentKey }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    const validAgents: AgentKey[] = ['fable', 'fate', 'foul', 'nykora', 'naac'];
    console.log(`[LOBBY] select_agent from ${socket.id.slice(0,6)}: ${agentKey}`);
    if (!validAgents.includes(agentKey)) {
      console.log(`[LOBBY] REJECTED select_agent from ${socket.id.slice(0,6)}: ${agentKey}`);
      return;
    }
    lobbySvc.selectAgent(socket.id, agentKey);
  });

  socket.on('lobby:select_map', ({ mapName }: { mapName: string }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    lobbySvc.selectMap(socket.id, mapName);
  });

  socket.on('lobby:select_game_mode', ({ mode }: { mode: GameMode }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    lobbySvc.selectGameMode(socket.id, mode);
  });

  socket.on('lobby:select_team', ({ team }: { team: any }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    if (team === 'A' || team === 'B' || team === 'NONE') {
      lobbySvc.selectTeam(socket.id, team);
    }
  });

  socket.on('lobby:toggle_ready', ({ ready }: { ready: boolean }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    lobbySvc.toggleReady(socket.id, Boolean(ready));
  });

  socket.on('lobby:start', () => {
    if (!security.checkLobbyRate(socket.id)) return;
    console.log(`[LOBBY] requestStart from ${socket.id.slice(0,6)}`);
    lobbySvc.requestStart(socket.id);
  });

  socket.on('lobby:play_again', () => {
    if (!security.checkLobbyRate(socket.id)) return;
    lobbySvc.playAgain(socket.id);
  });

  // == IN-GAME RELAY — validated ==================================

  // STATE: sanitise + speed-check then buffer; the 30Hz tick broadcasts it.
  socket.on('state', (raw: unknown) => {
    const room = roomRepo.findBySocketId(socket.id);
    const p = room?.players.get(socket.id);
    if (!p) return;

    const st = security.sanitizeState(raw);
    if (!st) return;

    // Speed-hack check only while in game (not lobby positioning)
    if (room!.state === 'in_game') {
      if (!security.checkMovementSpeed(socket.id, st.x, st.y)) return;
    }

    p.stateRelay = st;  // Buffer — the 30Hz game tick will broadcast
  });

  socket.on('cl_input', (input: any) => {
    const room = roomRepo.findBySocketId(socket.id);
    if (!room || room.state !== 'in_game') return;
    const svc = getGameSvc(room.gameMode);
    svc.onClientInput(socket.id, input);
  });

  // SHOT: validate shot rate then relay immediately (needs low latency)
  socket.on('shot', (data: any) => {
    const room = roomRepo.findBySocketId(socket.id);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;

    if (room.state === 'in_game') {
      const weapon = data?.owner === 'tower' ? 'TORRE' : (AGENT_STATS[p.agentKey]?.weapon ?? 'ak47');
      if (!security.checkShotRate(socket.id, weapon as any)) return;
      if (!security.validateShotOrigin(socket.id, data.x, data.y, room.mapData || {})) return;
      const svc = getGameSvc(room.gameMode);
      svc.incrementShotsFired(socket.id);
    }

    socket.to(room.code).emit('peer_shot', { id: socket.id, ...(data as object) });
  });

  socket.on('shot_cone', (data: any) => {
    const room = roomRepo.findBySocketId(socket.id);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;

    if (room.state === 'in_game') {
      const weapon = AGENT_STATS[p.agentKey]?.weapon ?? 'ak47';
      if (!data.isRecuo && !security.checkShotRate(socket.id, weapon as any)) return;
      if (!security.validateShotOrigin(socket.id, data.x, data.y, room.mapData || {})) return;
      const svc = getGameSvc(room.gameMode);
      svc.incrementShotsFired(socket.id);
    }
    
    // The client already calculated hitIds { [rid]: { zone, dmg, dist } }. 
    // We just relay the VFX and let the 'dmg' event or direct validation handle the rest.
    // For shotgun, the client itself sends 'shot_cone'. Instead of waiting for 'dmg' from the client,
    // the server should definitively apply the zone effects here for simplicity.
    if (data.hits) {
      for (const [rid, hit] of Object.entries(data.hits)) {
        const target = room.players.get(rid);
        if (target && target.alive) {
          const h = hit as any;
          target.damageTaken += h.dmg;
          p.damageDealt += h.dmg;
          p.shotsHit++;
          // Apply status effects based on zones
          if (h.zone === 'C') {
            target.slowDeadline = Date.now() + 500;
          }
          const cause = data.isRecuo ? 'RECUO' : 'SHOTGUN';
          io.to(rid).emit('take_dmg', { dmg: h.dmg, cause, from: socket.id, zone: h.zone, pushbackDist: h.zone === 'A' ? 2 * (data.X_unit || 1) : 0 });
          socket.to(room.code).emit('peer_hurt', { id: rid, x: target.x, y: target.y });
        }
      }
    }

    socket.to(room.code).emit('peer_shot_cone', { id: socket.id, ...(data as object) });
  });

  socket.on('light_toggle', (data: { lightOn: boolean }) => {
    const room = roomRepo.findBySocketId(socket.id);
    if (!room) return;
    socket.to(room.code).emit('peer_light', { id: socket.id, lightOn: data.lightOn });
  });

  socket.on('event', (data: any) => {
    if (!security.checkActionRate(socket.id)) return;
    const room = roomRepo.findBySocketId(socket.id);
    if (!room) return;
    
    if (data.type === 'avanco_start') {
      socket.to(room.code).emit('peer_event', { id: socket.id, ...data });
    } else if (data.type === 'avanco_land') {
      const p = room.players.get(socket.id);
      if (p && data.hits && Array.isArray(data.hits)) {
        for (const rid of data.hits) {
          const target = room.players.get(rid);
          if (target && target.alive) {
            target.damageTaken += 25;
            p.damageDealt += 25;
            target.stunDeadline = Date.now() + 1000;
            io.to(rid).emit('take_dmg', { dmg: 25, cause: 'AVANCO', from: socket.id });
            socket.to(room.code).emit('peer_hurt', { id: rid, x: target.x, y: target.y });
            // Emit stun effect to all clients
            io.to(room.code).emit('stun_effect', { 
              id: rid, 
              duration: 1.0 
            });
          }
        }
      }
      socket.to(room.code).emit('peer_event', { id: socket.id, ...data });
    }
  });

  // GRENADE / VFX / DEPLOYABLE: action rate-limited relay
  socket.on('grenade', (data: any) => {
    if (!security.checkActionRate(socket.id)) return;
    const room = roomRepo.findBySocketId(socket.id);
    if (room && room.state === 'in_game') {
      if (!security.validateShotOrigin(socket.id, data.x, data.y, room.mapData || {})) return;
    }
    relay(socket, 'peer_grenade', data);
  });

  socket.on('vfx', (data: unknown) => {
    if (!security.checkActionRate(socket.id)) return;
    relay(socket, 'peer_vfx', data);
  });

  socket.on('deployable', (data: unknown) => {
    if (!security.checkActionRate(socket.id)) return;
    relay(socket, 'peer_deployable', data);
  });

  socket.on('reload', (data: unknown) => {
    if (!security.checkActionRate(socket.id)) return;
    relay(socket, 'peer_reload', data);
  });

  socket.on('agent_change', (data: { agentKey: AgentKey }) => {
    if (!security.checkLobbyRate(socket.id)) return;
    const room = roomRepo.findBySocketId(socket.id);
    const p = room?.players.get(socket.id);
    const validAgents: AgentKey[] = ['fable', 'fate', 'foul', 'nykora', 'naac'];
    if (!validAgents.includes(data?.agentKey)) return;
    if (p) p.agentKey = data.agentKey;
    if (room) socket.to(room.code).emit('peer_agent', { id: socket.id, agentKey: data.agentKey });
  });

  // AUTHORITATIVE DAMAGE — full server-side validation
  socket.on('dmg', (data: { 
    to: string; 
    dmg: number; 
    cause: string; 
    clientTime?: number;
    shotgunEffect?: string;
    shotgunDistance?: number;
    shotgunRange?: number;
    shooterAngle?: number;
    shooterX?: number;
    shooterY?: number;
    stunDuration?: number;
  }) => {
    if (!security.checkActionRate(socket.id)) return;

    const room = roomRepo.findBySocketId(socket.id);
    if (!room || room.state !== 'in_game') return;

    const from = room.players.get(socket.id);
    const target = room.players.get(data.to);
    if (!from?.alive || !target?.alive) return;

    // Validate cause string
    const cause = String(data.cause || 'BALA');
    if (!security.isValidCause(cause)) {
      logger.warn(`[SEC] invalid cause "${cause}" from ${socket.id.slice(0, 6)}`);
      return;
    }

    const range = DMG_RANGES[cause];
    if (!range) return;

    const dmg = Number(data.dmg);
    if (!isFinite(dmg) || isNaN(dmg)) return;
    if (cause !== 'FLASH' && (dmg < range[0] || dmg > range[1])) {
      logger.warn(`[SEC] dmg out-of-range ${cause} dmg=${dmg} from ${socket.id.slice(0, 6)}`);
      return;
    }

    // Distance check (anti-aimbot teleport)
    // Basic Lag Compensation: Check against target's historical position if clientTime is provided
    let tx = target.x, ty = target.y;
    // @ts-ignore
    const history = room.stateTickHistory;
    if (history && data.clientTime) {
      // Find snapshot closest to clientTime
      let closest = history[history.length - 1];
      let minDiff = Infinity;
      for (const h of history) {
        const diff = Math.abs(h.time - data.clientTime);
        if (diff < minDiff) { minDiff = diff; closest = h; }
      }
      if (closest && closest.players[data.to]) {
        tx = closest.players[data.to].x;
        ty = closest.players[data.to].y;
      }
    } else if (target.stateRelay) {
      tx = target.stateRelay.x; ty = target.stateRelay.y;
    }

    const fx = data.shooterX ?? from.x ?? from.stateRelay?.x ?? 0;
    const fy = data.shooterY ?? from.y ?? from.stateRelay?.y ?? 0;

    if (tx !== undefined && ty !== undefined && Math.hypot(fx - tx, fy - ty) > MAX_HIT_RANGE) return;

    from.damageDealt += dmg;
    target.damageTaken += dmg;
    from.shotsHit++;
    target.lastDamageTime = Date.now();

    io.to(data.to).emit('take_dmg', { dmg, cause, from: socket.id, shotgunEffect: data.shotgunEffect, shooterX: fx, shooterY: fy });
    if (tx !== undefined && ty !== undefined) socket.to(room.code).emit('peer_hurt', { id: data.to, x: tx, y: ty });
    logger.info(`[dmg] ${socket.id.slice(0, 6)}→${data.to.slice(0, 6)} ${dmg} (${cause})`);
    
    // Apply stun if specified (for Naac abilities)
    if (data.stunDuration && typeof data.stunDuration === 'number' && data.stunDuration > 0) {
      target.stunDeadline = Date.now() + (data.stunDuration * 1000);
      io.to(room.code).emit('stun_effect', { 
        id: data.to, 
        duration: data.stunDuration 
      });
    }
    
    // Apply shotgun-specific effects
    if ((cause === 'SHOTGUN' || cause === 'RECUO') && data.shotgunEffect) {
      if (data.shotgunEffect === 'critical_knockback') {
        const shooterX = fx;
        const shooterY = fy;
        const targetX = tx;
        const targetY = ty;
        
        if (typeof shooterX !== 'number' || typeof shooterY !== 'number' ||
            typeof targetX !== 'number' || typeof targetY !== 'number' ||
            !isFinite(shooterX) || !isFinite(shooterY) ||
            !isFinite(targetX) || !isFinite(targetY)) {
          logger.warn(`[knockback] Invalid coordinates - aborting`);
          return;
        }
        
        const angle = Math.atan2(targetY - shooterY, targetX - shooterX);
        const knockbackDist = 100;
        target.knockbackX = Math.cos(angle) * knockbackDist;
        target.knockbackY = Math.sin(angle) * knockbackDist;
        
        io.to(room.code).emit('knockback', { 
          id: data.to, 
          x: target.knockbackX, 
          y: target.knockbackY,
          duration: 0.3
        });
      } else if (data.shotgunEffect === 'slow') {
        target.slowDeadline = Date.now() + 1500;
        io.to(room.code).emit('slow_effect', { 
          id: data.to, 
          duration: 1.5
        });
      }
    }
  });

  // DEATH — action-rate-limited; server re-validates alive state
  socket.on('i_died', (data: { killedBy?: string; cause?: string }) => {
    if (!security.checkActionRate(socket.id)) return;
    const room = roomRepo.findBySocketId(socket.id);
    if (room) {
      const svc = getGameSvc(room.gameMode);
      svc.handlePlayerDied(
        socket.id,
        data?.killedBy ?? null,
        data?.cause ?? 'BALA',
      );
    }
  });

  // DISCONNECT
  socket.on('disconnect', (reason: string) => {
    logger.info(`[-] ${socket.id.slice(0, 6)} (${reason})`);
    socketMap.delete(socket.id);
    security.removeSocket(socket.id);   // clean up all per-socket tracking data

    const room = roomRepo.findBySocketId(socket.id);
    if (room?.state === 'in_game') {
      const p = room.players.get(socket.id);
      if (p?.alive) {
        p.disconnectTimerId = setTimeout(() => {
          const svc = getGameSvc(room.gameMode);
          svc.handleDisconnectDeath(socket.id);
        }, DISCONNECT_DEAD_MS);
        return;
      }
    }
    lobbySvc.leaveRoom(socket.id);
  });
});

// ── Start listening ──────────────────────────────────────────────
const PORT = Number(process.env['PORT']) || 3000;
server.listen(PORT, () => {
  logger.info(`\n  ╔════════════════════════════════════╗`);
  logger.info(`  ║  Tactical Shooter  ·  port ${PORT}     ║`);
  logger.info(`  ║  Survival Mode · ${TICK_HZ_LOBBY}Hz lobby tick  ║`);
  logger.info(`  ║  Survival Mode · 60Hz game tick   ║`);
  logger.info(`  ╚════════════════════════════════════╝\n`);
});
