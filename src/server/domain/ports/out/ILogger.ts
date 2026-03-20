// ═══════════════════════════════════════════════════════
// Output Port: ILogger
// ═══════════════════════════════════════════════════════

export interface ILogger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string, err?: unknown): void;
}
