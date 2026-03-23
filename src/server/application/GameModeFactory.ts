import type { GameMode } from '../domain/entities/GameModeConfig';
import type { IGameModeService } from '../domain/ports/in/IGameModeService';
import type { IRoomRepository } from '../domain/ports/out/IRoomRepository';
import type { IGameEventEmitter } from '../domain/ports/out/IGameEventEmitter';
import type { ILogger } from '../domain/ports/out/ILogger';
import type { SecurityGuard } from './SecurityGuard';
import { SurvivalGameService } from './SurvivalGameService';
import { DeathmatchGameService } from './DeathmatchGameService';

export class GameModeFactory {
  static create(
    mode: GameMode,
    rooms: IRoomRepository,
    emitter: IGameEventEmitter,
    logger: ILogger,
    security?: SecurityGuard
  ): IGameModeService {
    switch (mode) {
      case 'deathmatch':
        return new DeathmatchGameService(rooms, emitter, logger, security);
      case 'survival':
      default:
        return new SurvivalGameService(rooms, emitter, logger, security);
    }
  }
}
