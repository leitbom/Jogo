// ═══════════════════════════════════════════════════════
// Domain Entity: Room
// ═══════════════════════════════════════════════════════

import type { Player } from './Player';

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

  // Survival in-game data
  timerRemaining: number;
  timerIntervalId: ReturnType<typeof setInterval> | null;
  /** 30Hz state-broadcast tick — active only while state === 'in_game' */
  stateTickIntervalId: ReturnType<typeof setInterval> | null;
  aliveCount: number;
  totalPlayers: number;
  matchStartTime: number | null;
  lastDeadIds: string[];
}

/** Creates an empty room in lobby state */
export function createRoom(code: string): Room {
  return {
    code,
    hostId: null,
    state: 'lobby',
    players: new Map(),
    timerRemaining: 180,
    timerIntervalId: null,
    stateTickIntervalId: null,
    aliveCount: 0,
    totalPlayers: 0,
    matchStartTime: null,
    lastDeadIds: [],
  };
}
