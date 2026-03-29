// ═══════════════════════════════════════════════════════
// Domain Entity: Room
// ═══════════════════════════════════════════════════════

import type { Player } from './Player';
import type { GameMode, GameModeConfig } from './GameModeConfig';
import { GAME_MODE_PRESETS } from './GameModeConfig';

export type RoomState = 'lobby' | 'countdown' | 'in_game' | 'ended';

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface Room {
  code: string;
  hostId: string | null;
  state: RoomState;
  players: Map<string, Player>;
  selectedMap: string | null;
  mapData: any | null;

  // Game mode
  gameMode: GameMode;
  gameModeConfig: GameModeConfig;

  // In-game data (shared across modes)
  timerRemaining: number;
  timerIntervalId: ReturnType<typeof setInterval> | null;
  /** 30Hz state-broadcast tick — active only while state === 'in_game' */
  stateTickIntervalId: ReturnType<typeof setInterval> | null;
  aliveCount: number;
  totalPlayers: number;
  matchStartTime: number | null;
  lastDeadIds: string[];

  // Deathmatch-specific
  killLeader: string | null;
  killLimit: number;

  // King of the Hill specific
  teamScores: Record<number, number>;
  controlZoneState: 'neutral' | 'contested' | 'team_a' | 'team_b';
  controlZoneOwner: number | null;
  controlZoneTimer: number;
  pointsToWin: number;
}

/** Creates an empty room in lobby state */
export function createRoom(code: string): Room {
  const defaultMode: GameMode = 'survival';
  const defaultConfig = GAME_MODE_PRESETS[defaultMode];
  return {
    code,
    hostId: null,
    state: 'lobby',
    players: new Map(),
    selectedMap: defaultConfig.defaultMap,
    mapData: null,
    gameMode: defaultMode,
    gameModeConfig: defaultConfig,
    timerRemaining: defaultConfig.matchTimeLimitS,
    timerIntervalId: null,
    stateTickIntervalId: null,
    aliveCount: 0,
    totalPlayers: 0,
    matchStartTime: null,
    lastDeadIds: [],
    killLeader: null,
    killLimit: defaultConfig.killLimit,
    teamScores: { 0: 0, 1: 0 },
    controlZoneState: 'neutral',
    controlZoneOwner: null,
    controlZoneTimer: 0,
    pointsToWin: defaultConfig.pointsToWin ?? 100,
  };
}
