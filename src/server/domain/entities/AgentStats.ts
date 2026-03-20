// ═══════════════════════════════════════════════════════
// Domain Entity: AgentStats  (authoritative server copy)
// ═══════════════════════════════════════════════════════

import type { AgentKey } from './Player';

export interface AgentStats {
  hp: number;
  armor: number;
  weapon: WeaponKey;
}

export type WeaponKey = 'ak47' | 'deagle' | 'minigun' | 'sword';

export const AGENT_STATS: Readonly<Record<AgentKey, AgentStats>> = {
  fable: { hp: 100, armor: 0, weapon: 'ak47' },
  fate: { hp: 100, armor: 30, weapon: 'deagle' },
  foul: { hp: 100, armor: 60, weapon: 'minigun' },
  nykora: { hp: 100, armor: 0, weapon: 'sword' },
};

export const WEAPON_MAG: Readonly<Record<WeaponKey, number>> = {
  ak47: 30,
  deagle: 7,
  minigun: 150,
  sword: 1, // Melee weapon doesn't really use mag, but needs a value
};

export const MATCH_TIME_S = 180;
export const MAX_ROOM_SIZE = 8;
export const MIN_TO_START = 4;
export const COUNTDOWN_S = 3;
/** @deprecated — use TICK_HZ_LOBBY / TICK_HZ_GAME */
export const TICK_HZ = 20;
export const DISCONNECT_DEAD_MS = 5_000;
export const MAX_HIT_RANGE = 1_600;

// ── Dynamic tick rates ────────────────────────────────────────
export const TICK_HZ_LOBBY = 10;  // Hz while in lobby / menu
export const TICK_HZ_GAME = 30;  // Hz while a survival match is running

// ── SecurityGuard limits ──────────────────────────────────────
/** Max action events (dmg, grenade, i_died…) a socket can send per second */
export const MAX_ACTION_PER_SECOND = 20;
/** Max lobby events (create_room, join_room, start…) per second */
export const MAX_LOBBY_PER_SECOND = 5;
/** Maximum player movement speed in pixels/second (anti-speedhack) */
export const MAX_PLAYER_SPEED_PPS = 600;

/** Minimum milliseconds between shots, per weapon (anti-rapid-fire) */
export const SHOT_COOLDOWN_MS: Readonly<Record<WeaponKey, number>> = {
  ak47: 90,   // ≈ 11 shots/s
  deagle: 380,  // ≈  2.6 shots/s
  minigun: 55,   // ≈ 18 shots/s
  sword: 400,  // ≈ 2.5 swings/s
};

export const DMG_RANGES: Readonly<Record<string, [number, number]>> = {
  BALA: [13, 82],
  BACKSTAB: [38, 160],
  MELEE: [30, 50],
  'EXPLOSÃO': [1, 110],
  TORRE: [6, 75],
  REFLEX: [1, 82],
  FLASH: [0, 0],
  DASH: [0, 0],
  SPIN: [30, 60],
};

export const SPAWN_POINTS = [
  { x: 160, y: 160 },
  { x: 1888, y: 160 },
  { x: 160, y: 1888 },
  { x: 1888, y: 1888 },
] as const;
