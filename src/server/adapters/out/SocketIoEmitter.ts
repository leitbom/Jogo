// ═══════════════════════════════════════════════════════
// Adapter (Out): SocketIoEmitter
// Implements IGameEventEmitter using Socket.io Server.
// ═══════════════════════════════════════════════════════

import type { Server, Socket } from 'socket.io';
import type { IGameEventEmitter } from '../../domain/ports/out/IGameEventEmitter';

export class SocketIoEmitter implements IGameEventEmitter {
  constructor(
    private readonly io: Server,
    private readonly sockets: Map<string, Socket>,
  ) {}

  toRoom(roomCode: string, event: string, data: unknown): void {
    this.io.to(roomCode).emit(event, data);
  }

  toSocket(socketId: string, event: string, data: unknown): void {
    const sock = this.sockets.get(socketId);
    sock?.emit(event, data);
  }

  toRoomExcept(roomCode: string, exceptId: string, event: string, data: unknown): void {
    const sock = this.sockets.get(exceptId);
    if (sock) {
      sock.to(roomCode).emit(event, data);
    } else {
      this.io.to(roomCode).emit(event, data);
    }
  }

  addSocketToChannel(socketId: string, roomCode: string): void {
    const sock = this.sockets.get(socketId);
    sock?.join(roomCode);
  }

  removeSocketFromChannel(socketId: string, roomCode: string): void {
    const sock = this.sockets.get(socketId);
    sock?.leave(roomCode);
  }

  broadcastStates(roomCode: string, states: Array<{ id: string; state: unknown }>): void {
    for (const { id, state } of states) {
      // Use socket.to() so the sender doesn't receive their own state
      const sock = this.sockets.get(id);
      sock?.to(roomCode).emit('peer_state', { id, state });
    }
  }
}
