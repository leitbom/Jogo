// ═══════════════════════════════════════════════════════
// Domain Entity: GameModeConfig
// Defines all supported game modes and their preset configs.
// ═══════════════════════════════════════════════════════

export type GameMode = 'survival' | 'deathmatch' | 'king_of_the_hill' | 'search_and_destroy';

export interface GameModeConfig {
  /** Human-readable label shown in lobby */
  label: string;
  /** Short description shown in lobby */
  description: string;
  /** Whether this mode is available to play (false = "coming soon") */
  available: boolean;
  /** FFA (team_size=1) vs Teams */
  teamSize: number;
  /** Maximum players in the room */
  maxPlayers: number;
  /** Does the match have respawn? */
  respawnEnabled: boolean;
  /** Seconds before respawning (if respawnEnabled) */
  respawnTimeS: number;
  /** Kills needed to win (0 = not applicable) */
  killLimit: number;
  /** Match time limit in seconds (0 = unlimited / elimination based) */
  matchTimeLimitS: number;
  /** Is the match divided into rounds? */
  roundBased: boolean;
  /** HP regen between kills */
  hpRegen: boolean;
  /** Default map filename */
  defaultMap: string;
  /** Points needed to win (KOTH mode) */
  pointsToWin?: number;
  /** Points per second while controlling zone */
  controlPointsPerSecond?: number;
}

export const GAME_MODE_PRESETS: Readonly<Record<GameMode, GameModeConfig>> = {
  survival: {
    label: 'SURVIVAL',
    description: 'Último vivo vence. Sem respawn.',
    available: true,
    teamSize: 1,
    maxPlayers: 4,
    respawnEnabled: false,
    respawnTimeS: 0,
    killLimit: 0,
    matchTimeLimitS: 180,
    roundBased: false,
    hpRegen: true,
    defaultMap: 'default.json',
  },

  deathmatch: {
    label: 'DEATHMATCH',
    description: 'FFA com respawn. Primeiro a 10 kills vence.',
    available: true,
    teamSize: 1,
    maxPlayers: 4,
    respawnEnabled: true,
    respawnTimeS: 3,
    killLimit: 10,
    matchTimeLimitS: 300,
    roundBased: false,
    hpRegen: true,
    defaultMap: 'deathmatch.json',
  },

  king_of_the_hill: {
    label: 'KING OF THE HILL',
    description: '2v2 — controle a zona central. Primeiro a 100 pontos vence.',
    available: true,
    teamSize: 2,
    maxPlayers: 4,
    respawnEnabled: true,
    respawnTimeS: 5,
    killLimit: 0,
    matchTimeLimitS: 300,
    roundBased: false,
    hpRegen: true,
    defaultMap: 'koth_arena.json',
    pointsToWin: 100,
    controlPointsPerSecond: 1,
  },

  search_and_destroy: {
    label: 'SEARCH & DESTROY',
    description: 'Rounds — plante ou desarme a bomba.',
    available: false,
    teamSize: 5,
    maxPlayers: 10,
    respawnEnabled: false,
    respawnTimeS: 0,
    killLimit: 0,
    matchTimeLimitS: 90,
    roundBased: true,
    hpRegen: false,
    defaultMap: 'default.json',
  },
};
