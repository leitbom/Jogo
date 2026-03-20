// ═══════════════════════════════════════════════════════
// Output Port: IRoomRepository
// ═══════════════════════════════════════════════════════
import type { Room } from '../../entities/Room';

export interface IRoomRepository {
  findByCode(code: string): Room | undefined;
  findBySocketId(socketId: string): Room | undefined;
  save(room: Room): void;
  delete(code: string): void;
  linkSocket(socketId: string, room: Room): void;
  unlinkSocket(socketId: string): void;
  generateCode(): string;
  all(): Room[];
}
