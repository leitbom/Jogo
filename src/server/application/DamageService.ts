// ═══════════════════════════════════════════════════════
// Application Service: DamageService
// Responsibility: validate and apply damage (anti-cheat),
//   accumulate per-player stats.
// ═══════════════════════════════════════════════════════

import type { IRoomRepository }   from '../domain/ports/out/IRoomRepository';
import type { IGameEventEmitter } from '../domain/ports/out/IGameEventEmitter';
import type { ILogger }           from '../domain/ports/out/ILogger';
import { DMG_RANGES, MAX_HIT_RANGE } from '../domain/entities/AgentStats';

export interface DamageRequest {
  fromSocketId: string;
  toSocketId: string;
  damage: number;
  cause: string;
}

export class DamageService {
  constructor(
    private readonly rooms: IRoomRepository,
    private readonly emitter: IGameEventEmitter,
    private readonly logger: ILogger,
  ) {}

  applyDamage(req: DamageRequest): void {
    const { fromSocketId, toSocketId, damage, cause } = req;

    const room   = this.rooms.findBySocketId(fromSocketId);
    if (!room || room.state !== 'in_game') return;

    const attacker = room.players.get(fromSocketId);
    const target   = room.players.get(toSocketId);

    if (!attacker || !target) return;
    if (!attacker.alive || !target.alive) return;    // dead can't fight

    // Validate damage range (anti-cheat)
    const range = DMG_RANGES[cause];
    if (!range) { this.logger.warn(`[dmg] unknown cause: ${cause}`); return; }

    const dmg = Number(damage);
    if (!isFinite(dmg) || isNaN(dmg)) return;
    if (cause !== 'FLASH' && (dmg < range[0] || dmg > range[1])) {
      this.logger.warn(`[!] dmg rejected cause=${cause} dmg=${dmg}`);
      return;
    }

    // Proximity check (anti-cheat)
    const as = attacker.stateRelay, ts = target.stateRelay;
    if (as && ts && Math.hypot(as.x - ts.x, as.y - ts.y) > MAX_HIT_RANGE) return;

    // Accumulate stats
    attacker.damageDealt += dmg;
    target.damageTaken   += dmg;
    attacker.shotsHit++;

    // Deliver damage to target's client
    this.emitter.toSocket(toSocketId, 'take_dmg', {
      dmg,
      cause,
      from: fromSocketId,
    });

    this.logger.info(`[dmg] ${fromSocketId.slice(0,6)}→${toSocketId.slice(0,6)} ${dmg} (${cause})`);
  }
}
