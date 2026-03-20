// ═══════════════════════════════════════════════════════
// Adapter (Out): InMemoryRoomRepository
// Implements IRoomRepository using two in-memory Maps.
// ═══════════════════════════════════════════════════════

import type { IRoomRepository } from '../../domain/ports/out/IRoomRepository';
import type { Room }            from '../../domain/entities/Room';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class InMemoryRoomRepository implements IRoomRepository {
  private readonly rooms     = new Map<string, Room>();   // code  → Room
  private readonly socketMap = new Map<string, Room>();   // socketId → Room

  findByCode(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  findBySocketId(socketId: string): Room | undefined {
    return this.socketMap.get(socketId);
  }

  save(room: Room): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  linkSocket(socketId: string, room: Room): void {
    this.socketMap.set(socketId, room);
  }

  unlinkSocket(socketId: string): void {
    this.socketMap.delete(socketId);
  }

  generateCode(): string {
    let code: string;
    do {
      code = Array.from({ length: 5 }, () =>
        CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }
}
