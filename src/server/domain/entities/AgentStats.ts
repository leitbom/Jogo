// ═══════════════════════════════════════════════════════
// Domain Entity: AgentStats  (authoritative server copy)
// ═══════════════════════════════════════════════════════

import type { AgentKey } from './Player';

export interface AgentStats {
  hp: number;
  armor: number;
  radius: number;
  weapon: WeaponKey;
  hpRegenPerSecond: number;
  hpRegenDelayMs: number;
}

export type WeaponKey = 'ak47' | 'deagle' | 'minigun' | 'sword' | 'sxs_shotgun' | 'TORRE';

export const AGENT_STATS: Readonly<Record<AgentKey, AgentStats>> = {
  fable: { hp: 100, armor: 50, radius: 14, weapon: 'ak47', hpRegenPerSecond: 10, hpRegenDelayMs: 2000 },
  fate: { hp: 100, armor: 50, radius: 14, weapon: 'deagle', hpRegenPerSecond: 10, hpRegenDelayMs: 2000 },
  foul: { hp: 100, armor: 50, radius: 19, weapon: 'minigun', hpRegenPerSecond: 10, hpRegenDelayMs: 2000 },
  nykora: { hp: 100, armor: 50, radius: 13, weapon: 'sword', hpRegenPerSecond: 10, hpRegenDelayMs: 2000 },
  naac: { hp: 120, armor: 50, radius: 14, weapon: 'sxs_shotgun', hpRegenPerSecond: 10, hpRegenDelayMs: 2000 },
};

export const WEAPON_MAG: Readonly<Record<WeaponKey, number>> = {
  ak47: 30,
  deagle: 7,
  minigun: 150,
  sword: 1,
  sxs_shotgun: 3,
  TORRE: 50,
};

export const MATCH_TIME_S = 180;
export const MAX_ROOM_SIZE = 8;
export const MIN_TO_START = 1;
export const COUNTDOWN_S = 1;
/** @deprecated — use TICK_HZ_LOBBY / TICK_HZ_GAME */
export const TICK_HZ = 20;
export const DISCONNECT_DEAD_MS = 5_000;
export const MAX_HIT_RANGE = 1_600;

// ── Dynamic tick rates ────────────────────────────────────────
export const TICK_HZ_LOBBY = 10;
export const TICK_HZ_GAME = 60;

// ── SecurityGuard limits ──────────────────────────────────────
export const MAX_ACTION_PER_SECOND = 20;
export const MAX_LOBBY_PER_SECOND = 5;
export const MAX_PLAYER_SPEED_PPS = 1600;

export const SHOT_COOLDOWN_MS: Readonly<Record<WeaponKey, number>> = {
  ak47: 90,
  deagle: 380,
  minigun: 55,
  sword: 400,
  sxs_shotgun: 450,
  TORRE: 120,
};

export const DMG_RANGES: Readonly<Record<string, [number, number]>> = {
  BALA: [13, 82],
  BACKSTAB: [38, 160],
  MELEE: [30, 50],
  'EXPLOSAO': [1, 110],
  TORRE: [6, 75],
  REFLEX: [1, 82],
  FLASH: [0, 0],
  DASH: [0, 0],
  SPIN: [30, 80],
  SANGRAMENTO: [4, 6],
  SHOTGUN: [15, 85],
  'AVANCO': [15, 30],
  RECUO: [15, 85],
};

export const SPAWN_POINTS = [
  { x: 160, y: 160 },
  { x: 1888, y: 160 },
  { x: 160, y: 1888 },
  { x: 1888, y: 1888 },
] as const;
