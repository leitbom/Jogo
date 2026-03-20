// ═══════════════════════════════════════════════════════
// Output Port: IGameEventEmitter
// ═══════════════════════════════════════════════════════

export interface IGameEventEmitter {
  /** Emit to every socket in a room */
  toRoom(roomCode: string, event: string, data: unknown): void;
  /** Emit only to a single socket */
  toSocket(socketId: string, event: string, data: unknown): void;
  /** Emit to room except one socket */
  toRoomExcept(roomCode: string, exceptId: string, event: string, data: unknown): void;
  /** Join socket to a room channel */
  addSocketToChannel(socketId: string, roomCode: string): void;
  /** Remove socket from a room channel */
  removeSocketFromChannel(socketId: string, roomCode: string): void;
  /**
   * Broadcast each player's buffered state to ALL other members of the room.
   * Used by the 30Hz game tick — each sender is excluded from their own state.
   */
  broadcastStates(roomCode: string, states: Array<{ id: string; state: unknown }>): void;
}

