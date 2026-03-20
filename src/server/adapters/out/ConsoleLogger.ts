// ═══════════════════════════════════════════════════════
// Adapter (Out): ConsoleLogger
// ═══════════════════════════════════════════════════════

import type { ILogger } from '../../domain/ports/out/ILogger';

export class ConsoleLogger implements ILogger {
  info(msg: string): void  { console.log(msg); }
  warn(msg: string): void  { console.warn(msg); }
  error(msg: string, err?: unknown): void {
    console.error(msg, err ?? '');
  }
}
