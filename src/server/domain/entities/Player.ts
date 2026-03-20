// ═══════════════════════════════════════════════════════
// Domain Entity: Player
// ═══════════════════════════════════════════════════════

export type AgentKey = 'fable' | 'fate' | 'foul' | 'nykora';

/** In-lobby status (public, shared with all clients) */
export interface PublicPlayer {
  id: string;
  name: string;
  agentKey: AgentKey;
  ready: boolean;
  isHost: boolean;
}

/** Full server-side player state */
export interface Player extends PublicPlayer {
  // In-game stats
  alive: boolean;
  hp: number;
  armor: number;
  ammoCurrentMag: number;
  ammoReserve: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  shotsFired: number;
  shotsHit: number;
  spawnTime: number | null;
  deathTime: number | null;
  winner: boolean;

  // State relay (last known position from client)
  stateRelay: PlayerStateRelay | null;

  // Internal / housekeeping
  disconnectTimerId: ReturnType<typeof setTimeout> | null;
}

/** Position/state snapshotted from client's state broadcasts */
export interface PlayerStateRelay {
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  agentKey: AgentKey;
  slot: number;
  [key: string]: unknown;
}

/** Creates a fresh Player in lobby state */
export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    agentKey: 'nykora',
    ready: false,
    isHost: false,
    alive: true,
    hp: 100,
    armor: 0,
    ammoCurrentMag: 30,
    ammoReserve: 30,
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    damageTaken: 0,
    shotsFired: 0,
    shotsHit: 0,
    spawnTime: null,
    deathTime: null,
    winner: false,
    stateRelay: null,
    disconnectTimerId: null,
  };
}

/** Maps a Player to its public representation */
export function toPublicPlayer(p: Player): PublicPlayer {
  return {
    id: p.id,
    name: p.name,
    agentKey: p.agentKey,
    ready: p.ready,
    isHost: p.isHost,
  };
}
