// ═══════════════════════════════════════════════════════
// Application Service: LobbyService
// Responsibility: lobby lifecycle — create/join/leave rooms,
//   agent selection, ready toggling, countdown start.
// ═══════════════════════════════════════════════════════

import type { IRoomRepository } from '../domain/ports/out/IRoomRepository';
import type { IGameEventEmitter } from '../domain/ports/out/IGameEventEmitter';
import type { ILogger } from '../domain/ports/out/ILogger';
import { createRoom, type Room } from '../domain/entities/Room';
import { createPlayer, toPublicPlayer } from '../domain/entities/Player';
import type { AgentKey } from '../domain/entities/Player';
import { MIN_TO_START, MAX_ROOM_SIZE } from '../domain/entities/AgentStats.js';
import { GAME_MODE_PRESETS } from '../domain/entities/GameModeConfig';
import type { GameMode } from '../domain/entities/GameModeConfig';
import fs from 'fs';
import path from 'path';

const NAME_ADJ = ['GHOST', 'WOLF', 'VIPER', 'NIGHT', 'RAZOR', 'STORM', 'ROGUE', 'COBRA', 'NOVA', 'CIPHER'];

export class LobbyService {
  constructor(
    private readonly rooms: IRoomRepository,
    private readonly emitter: IGameEventEmitter,
    private readonly logger: ILogger,
    private readonly onStartCountdown: (roomCode: string) => void,
  ) { }

  generateName(): string {
    const adj = NAME_ADJ[Math.floor(Math.random() * NAME_ADJ.length)];
    const sfx = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${adj}_${sfx}`;
  }

  // ── CREATE ROOM ────────────────────────────────────────────────
  createRoom(socketId: string, playerName: string): void {
    const code = this.rooms.generateCode();
    this.createRoomWithCode(socketId, playerName, code);
  }

  createRoomWithCode(socketId: string, playerName: string, code: string): void {
    // Leave any current room first
    this.leaveRoom(socketId);

    const room = createRoom(code);
    this.loadMapData(room, 'default.json');
    const player = createPlayer(socketId, playerName);
    player.isHost = true;
    room.hostId = socketId;
    room.players.set(socketId, player);

    this.rooms.save(room);
    this.rooms.linkSocket(socketId, room);
    this.emitter.addSocketToChannel(socketId, code);

    this.emitter.toSocket(socketId, 'lobby:state', {
      roomCode: code,
      players: [...room.players.values()].map(toPublicPlayer),
      selectedMap: room.selectedMap,
      gameMode: room.gameMode,
      gameModeConfig: room.gameModeConfig,
      myId: socketId,
      myName: playerName,
    });
    this.emitter.toSocket(socketId, 'lobby:joined', { isHost: true }); // Notify client
    this.logger.info(`[room+] ${code} host=${socketId.slice(0, 6)}`);
  }

  // ── JOIN ROOM ─────────────────────────────────────────────────
  joinRoom(socketId: string, playerName: string, code: string): void {
    const roomCode = code.toUpperCase().trim();
    let room = this.rooms.findByCode(roomCode);
    if (!room) {
      // Auto-create room if joining a non-existent code (e.g. from a shared link)
      this.createRoomWithCode(socketId, playerName, roomCode);
      return;
    }
    if (room.state !== 'lobby') {
      this.emitter.toSocket(socketId, 'lobby:error', { message: 'Partida já iniciada' });
      return;
    }
    if (room.players.size >= MAX_ROOM_SIZE) {
      this.emitter.toSocket(socketId, 'lobby:error', { message: 'Sala cheia' });
      return;
    }

    this.leaveRoom(socketId);
    const player = createPlayer(socketId, playerName);
    room.players.set(socketId, player);
    this.rooms.linkSocket(socketId, room);
    this.emitter.addSocketToChannel(socketId, room.code);

    this.emitter.toSocket(socketId, 'lobby:state', {
      roomCode: room.code,
      players: [...room.players.values()].map(toPublicPlayer),
      selectedMap: room.selectedMap,
      gameMode: room.gameMode,
      gameModeConfig: room.gameModeConfig,
      myId: socketId,
      myName: playerName,
    });
    this.emitter.toSocket(socketId, 'lobby:joined', { isHost: false }); // Notify client
    this.emitter.toRoomExcept(room.code, socketId, 'lobby:player_joined', {
      id: socketId, name: playerName, agentKey: 'fable', ready: false, isHost: false,
    });
    this.logger.info(`[room] ${room.code} +${socketId.slice(0, 6)} ${room.players.size}/${MAX_ROOM_SIZE}`);
  }

  // ── SELECT AGENT ──────────────────────────────────────────────
  selectAgent(socketId: string, agentKey: AgentKey): void {
    const room = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (!player || player.ready) return;
    const valid: AgentKey[] = ['fable', 'fate', 'foul', 'nykora', 'naac'];
    if (!valid.includes(agentKey)) return;
    player.agentKey = agentKey;
    this.emitter.toRoom(room!.code, 'lobby:agent_changed', { id: socketId, agentKey });
  }
  
  selectMap(socketId: string, mapName: string): void {
    const room = this.rooms.findBySocketId(socketId);
    if (!room) return;
    const player = room.players.get(socketId);
    if (!player || !player.isHost || room.state !== 'lobby') return;
    
    room.selectedMap = mapName;
    this.loadMapData(room, mapName);
    this.emitter.toRoom(room.code, 'lobby:map_changed', { mapName });
  }

  selectGameMode(socketId: string, mode: GameMode): void {
    const room = this.rooms.findBySocketId(socketId);
    if (!room) return;
    const player = room.players.get(socketId);
    if (!player || !player.isHost || room.state !== 'lobby') return;

    if (!GAME_MODE_PRESETS[mode]) return;
    
    room.gameMode = mode;
    room.gameModeConfig = GAME_MODE_PRESETS[mode];
    
    // Also update the map to the mode's default
    room.selectedMap = room.gameModeConfig.defaultMap;
    this.loadMapData(room, room.selectedMap);

    this.emitter.toRoom(room.code, 'lobby:mode_changed', { 
      gameMode: room.gameMode,
      gameModeConfig: room.gameModeConfig,
      selectedMap: room.selectedMap
    });
  }

  public loadMapData(room: any, mapName: string): void {
    try {
      const mapsDir = path.resolve(process.cwd(), 'public', 'maps');
      const filePath = path.join(mapsDir, mapName);
      if (fs.existsSync(filePath)) {
        room.mapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.logger.info(`[map:load] ${mapName} into ${room.code}`);
      } else {
        this.logger.warn(`[map:fail] ${mapName} not found at ${filePath}`);
      }
    } catch (err) {
      this.logger.error(`[map:err] ${err}`);
    }
  }

  // ── TOGGLE READY ──────────────────────────────────────────────
  toggleReady(socketId: string, ready: boolean): void {
    const room = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (!player) return;
    player.ready = Boolean(ready);
    this.emitter.toRoom(room!.code, 'lobby:ready_changed', { id: socketId, ready: player.ready });
  }

  // ── START GAME ────────────────────────────────────────────────
  requestStart(socketId: string): void {
    const room = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (!player?.isHost || room!.state !== 'lobby') return;

    const all = [...room!.players.values()];
    if (all.length < MIN_TO_START) {
      this.emitter.toSocket(socketId, 'lobby:error', { message: `Mínimo ${MIN_TO_START} jogadores` });
      return;
    }
    if (!all.every(p => p.ready)) {
      this.emitter.toSocket(socketId, 'lobby:error', { message: 'Nem todos estão prontos' });
      return;
    }
    this.onStartCountdown(room!.code);
  }

  // ── PLAY AGAIN (host resets room to lobby) ───────────────────
  playAgain(socketId: string): void {
    const room = this.rooms.findBySocketId(socketId);
    const player = room?.players.get(socketId);
    if (!player?.isHost || room!.state !== 'ended') return;

    room!.state = 'lobby';
    room!.timerRemaining = 180;
    room!.aliveCount = 0;
    room!.lastDeadIds = [];

    for (const p of room!.players.values()) {
      p.ready = false;
      p.alive = true;
      p.winner = false;
    }
    this.emitter.toRoom(room!.code, 'lobby:reset', {
      players: [...room!.players.values()].map(toPublicPlayer),
      roomCode: room!.code,
      selectedMap: room!.selectedMap,
      gameMode: room!.gameMode,
      gameModeConfig: room!.gameModeConfig,
    });
    this.logger.info(`[room:reset] ${room!.code}`);
  }

  public selectTeam(socketId: string, team: 'A' | 'B' | 'NONE'): void {
    const room = this.rooms.findBySocketId(socketId);
    if (!room) return;

    const player = room.players.get(socketId);
    if (!player || player.ready) return;

    player.team = team;
    this.emitter.toRoom(room.code, 'lobby:team_changed', { id: socketId, team });
  }

  // ── LEAVE ROOM ────────────────────────────────────────────────
  leaveRoom(socketId: string, skipBroadcast = false): void {
    const room = this.rooms.findBySocketId(socketId);
    if (!room) return;

    const player = room.players.get(socketId);
    if (player?.disconnectTimerId) {
      clearTimeout(player.disconnectTimerId);
      player.disconnectTimerId = null;
    }

    room.players.delete(socketId);
    this.rooms.unlinkSocket(socketId);
    this.emitter.removeSocketFromChannel(socketId, room.code);

    if (!skipBroadcast) {
      this.emitter.toRoom(room.code, 'peer_left', { id: socketId });
      this.emitter.toRoom(room.code, 'lobby:player_left', { id: socketId });
    }

    if (room.players.size === 0) {
      if (room.timerIntervalId) clearInterval(room.timerIntervalId);
      this.rooms.delete(room.code);
      return;
    }

    this.transferHostIfNeeded(room, socketId);

    // Reset ready state if all were ready (lobby only)
    if (room.state === 'lobby' && [...room.players.values()].every(p => p.ready)) {
      for (const p of room.players.values()) {
        p.ready = false;
        this.emitter.toRoom(room.code, 'lobby:ready_changed', { id: p.id, ready: false });
      }
    }
  }

  // ── PRIVATE ───────────────────────────────────────────────────
  private transferHostIfNeeded(room: import('../domain/entities/Room.js').Room, oldHostId: string): void {
    if (room.hostId !== oldHostId || room.players.size === 0) return;
    const newHost = room.players.values().next().value!;
    newHost.isHost = true;
    room.hostId = newHost.id;
    this.emitter.toRoom(room.code, 'lobby:host_changed', { newHostId: newHost.id });
  }
}
