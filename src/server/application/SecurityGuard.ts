// ════════════════════════════════════════════════════════════════
// Application Service: SecurityGuard
// Policy: NEVER trust client data. Validate everything server-side.
//
// Protections:
//   1. Anti-flood (action events)  — sliding-window rate limiter
//   2. Anti-flood (lobby events)   — sliding-window rate limiter
//   3. Anti-rapid-fire             — per-weapon shot cooldown
//   4. Anti-speedhack              — Δposition / Δtime vs MAX_SPEED
//   5. State sanitisation          — type + range + enum checks
// ════════════════════════════════════════════════════════════════

import type { ILogger }  from '../domain/ports/out/ILogger';
import type { WeaponKey } from '../domain/entities/AgentStats';
import { PhysicsUtils } from '../domain/utils/PhysicsUtils';
import {
  SHOT_COOLDOWN_MS,
  MAX_ACTION_PER_SECOND,
  MAX_LOBBY_PER_SECOND,
  MAX_PLAYER_SPEED_PPS,
} from '../domain/entities/AgentStats';
import type { AgentKey, PlayerStateRelay } from '../domain/entities/Player';

// ── Internal types ──────────────────────────────────────────────
interface SlidingWindow {
  count: number;
  windowStart: number;
}

interface PosSnapshot {
  x: number;
  y: number;
  t: number;
}

// ── Map bounds (must match client map size) ─────────────────────
const MAP_MIN = -200;
const MAP_MAX = 4_200;

const VALID_AGENTS: ReadonlySet<string> = new Set(['fable', 'fate', 'foul', 'nykora', 'naac']);
const VALID_CAUSES: ReadonlySet<string> = new Set([
  'BALA', 'BACKSTAB', 'MELEE', 'EXPLOSÃO', 'TORRE', 'REFLEX', 'FLASH', 'SPIN', 'SANGRAMENTO', 'SHOTGUN', 'AVANCO', 'RECUO'
]);

// ── SecurityGuard ───────────────────────────────────────────────
export class SecurityGuard {
  /** Sliding window for action events (dmg, grenade, vfx, i_died…) */
  private readonly actionWindows = new Map<string, SlidingWindow>();
  /** Sliding window for lobby events (create, join, start…) */
  private readonly lobbyWindows  = new Map<string, SlidingWindow>();
  /** Last shot timestamp per weapon per socket (anti-rapid-fire) */
  private readonly lastShot      = new Map<string, number>();
  /** Last confirmed position per socket (anti-speedhack) */
  private readonly lastPos       = new Map<string, PosSnapshot>();

  constructor(private readonly logger: ILogger) {}

  // ── 1. Action rate limit ─────────────────────────────────────
  /**
   * Returns true if the socket is within the allowed action event budget.
   * Call before handling dmg, grenade, vfx, deployable, i_died.
   */
  checkActionRate(socketId: string): boolean {
    return this.checkWindow(
      socketId, this.actionWindows, MAX_ACTION_PER_SECOND, 'action',
    );
  }

  // ── 2. Lobby rate limit ──────────────────────────────────────
  /**
   * Returns true if the socket is within the lobby event budget.
   * Call before create_room, join_room, toggle_ready, start, play_again.
   */
  checkLobbyRate(socketId: string): boolean {
    return this.checkWindow(
      socketId, this.lobbyWindows, MAX_LOBBY_PER_SECOND, 'lobby',
    );
  }

  // ── 3. Shot cooldown (anti-rapid-fire) ───────────────────────
  /**
   * Returns true if enough time has passed since the last shot for this weapon.
   */
  checkShotRate(socketId: string, weapon: WeaponKey): boolean {
    const now      = Date.now();
    const key      = `${socketId}:${weapon}`;
    const last     = this.lastShot.get(key) ?? 0;
    const cooldown = SHOT_COOLDOWN_MS[weapon] ?? 100;
    if (now - last < cooldown) {
      this.logger.warn(
        `[SEC] rapid-fire ${socketId.slice(0, 6)} weapon=${weapon} ` +
        `gap=${now - last}ms < ${cooldown}ms`,
      );
      return false;
    }
    this.lastShot.set(key, now);
    return true;
  }

  // ── 4. Movement speed check (anti-speedhack) ─────────────────
  /**
   * Returns true if the player's position is within realistic movement speed.
   * On first call (no previous position) always accepts.
   * Ignores very large dt (> 5s) to handle game-start teleport to spawn.
   */
  checkMovementSpeed(socketId: string, x: number, y: number): boolean {
    const now  = Date.now();
    const prev = this.lastPos.get(socketId);

    if (prev) {
      const dt = (now - prev.t) / 1_000;
      if (dt >= 0.04 && dt <= 5.0) {          // sensible window: 40ms – 5s
        const dist  = Math.hypot(x - prev.x, y - prev.y);
        const speed = dist / dt;
        if (speed > MAX_PLAYER_SPEED_PPS) {
          this.logger.warn(
            `[SEC] speedhack ${socketId.slice(0, 6)} ` +
            `speed=${Math.round(speed)}px/s > ${MAX_PLAYER_SPEED_PPS}`,
          );
          // Update stored position so next check isn't penalised by stale gap
          this.lastPos.set(socketId, { x, y, t: now });
          return false;
        }
      }
    }

    this.lastPos.set(socketId, { x, y, t: now });
    return true;
  }

  // ── 5. State sanitisation ─────────────────────────────────────
  /**
   * Parses and validates raw client state payloads.
   * Returns a clean PlayerStateRelay or null (invalid/out-of-bounds).
   */
  sanitizeState(raw: unknown): PlayerStateRelay | null {
    if (!raw || typeof raw !== 'object') return null;
    const d = raw as Record<string, unknown>;

    const x = Number(d['x']);
    const y = Number(d['y']);

    if (!isFinite(x) || !isFinite(y)) return null;
    if (x < MAP_MIN || x > MAP_MAX || y < MAP_MIN || y > MAP_MAX) return null;

    const agentKey = VALID_AGENTS.has(d['agentKey'] as string)
      ? (d['agentKey'] as AgentKey)
      : 'fable';

    return {
      x,
      y,
      angle:        sanitizeAngle(d['angle']),
      hp:           clamp(Number(d['hp'])    || 0, 0, 300),
      maxHp:        clamp(Number(d['maxHp']) || 100, 1, 300),
      dead:         Boolean(d['dead']),
      agentKey,
      slot:         clamp(Math.floor(Number(d['slot']) || 0), 0, 5),
      _running:     Boolean(d['_running']),
      _crouching:   Boolean(d['_crouching']),
      shieldHp:     clamp(Number(d['shieldHp']) || 0, 0, 200),
      intangible:   Boolean(d['intangible']),
      lightOn:      Boolean(d['lightOn']),
      activeWeapon: typeof d['activeWeapon'] === 'string' ? d['activeWeapon'] : 'ak47',
      viewMode:     Number(d['viewMode']) || 0,
      dashDuration: Number(d['dashDuration']) || 0.15,
      cam1:         d['cam1'] && typeof d['cam1'] === 'object' ? d['cam1'] : null,
      cam2:         d['cam2'] && typeof d['cam2'] === 'object' ? d['cam2'] : null,
      tower:        d['tower'] && typeof d['tower'] === 'object' ? d['tower'] : null,
    };
  }

  /**
   * Validates that a damage cause string is a known server-side cause.
   * Prevents injecting arbitrary cause strings.
   */
  isValidCause(cause: string): boolean {
    return VALID_CAUSES.has(cause);
  }

  // ── Cleanup ───────────────────────────────────────────────────
  /** Call on socket disconnect to free all per-socket state. */
  removeSocket(socketId: string): void {
    this.actionWindows.delete(socketId);
    this.lobbyWindows.delete(socketId);
    this.lastShot.delete(socketId);
    this.lastPos.delete(socketId);
  }

  /** Reset position tracker (e.g. on game start / spawn). */
  resetPosition(socketId: string): void {
    this.lastPos.delete(socketId);
  }

  /**
   * Returns true if the shot/grenade origin is valid:
   * 1. Not inside a wall.
   * 2. Not too far from the player's last known position.
   */
  validateShotOrigin(socketId: string, x: number, y: number, mapData: any): boolean {
    const prev = this.lastPos.get(socketId);
    if (!prev) return true; // Accept if no pos yet

    // 1. Wall and World bounds check
    const worldSize = (mapData?.size?.width) || (mapData?.worldSize) || 2048;
    if (PhysicsUtils.isColliding(x, y, 1, mapData, worldSize)) {
      this.logger.warn(`[SEC] shot from inside wall or outside world ${socketId.slice(0, 6)} at ${Math.round(x)},${Math.round(y)}`);
      return false;
    }

    // 2. Proximity check (barrel length)
    // Most weapons have muzzleLen < 2.5. Radius is max 20.
    // 20 * 4 = 80px should be plenty.
    const dist = Math.hypot(x - prev.x, y - prev.y);
    if (dist > 100) {
      this.logger.warn(`[SEC] shot origin too far ${socketId.slice(0, 6)} dist=${Math.round(dist)}px`);
      return false;
    }

    return true;
  }

  // ── Private helpers ───────────────────────────────────────────
  private checkWindow(
    socketId: string,
    map: Map<string, SlidingWindow>,
    limit: number,
    label: string,
  ): boolean {
    const now = Date.now();
    let win   = map.get(socketId);
    if (!win || now - win.windowStart >= 1_000) {
      win = { count: 0, windowStart: now };
      map.set(socketId, win);
    }
    win.count++;
    if (win.count > limit) {
      this.logger.warn(
        `[SEC] rate-limit (${label}) ${socketId.slice(0, 6)} ` +
        `count=${win.count} > ${limit}/s`,
      );
      return false;
    }
    return true;
  }
}

// ── Pure helpers ────────────────────────────────────────────────
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, isFinite(v) ? v : min));
}

function sanitizeAngle(raw: unknown): number {
  const a = Number(raw);
  return isFinite(a) ? ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) : 0;
}
