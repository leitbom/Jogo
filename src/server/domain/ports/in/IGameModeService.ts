// ═══════════════════════════════════════════════════════
// Input Port: IGameModeService
// Defines the contract that every game mode service must implement.
// Follows the Dependency Inversion Principle (SOLID).
// ═══════════════════════════════════════════════════════

export interface IGameModeService {
  /**
   * Starts the match countdown for the given room, then transitions to in_game.
   */
  startCountdown(roomCode: string): void;

  /**
   * Called when a player's HP reaches 0 (authoritative death handling).
   */
  handlePlayerDied(socketId: string, killedBy: string | null, cause: string): void;

  /**
   * Called when a player disconnects during an active match.
   */
  handleDisconnectDeath(socketId: string): void;

  /**
   * Increments the shot counter for accuracy tracking.
   */
  incrementShotsFired(socketId: string): void;
}
