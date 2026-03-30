# Naac Refinement & Bug Fixes

Reverting the Naac agent to the March 28th baseline was successful, but several specific mechanics need correction to match the "Perfect" feel and resolve critical bugs.

## Proposed Changes

### [Multiplayer & Logic]

#### [MODIFY] [main.ts](file:///c:/Users/chenr/Desktop/Jogo/src/server/main.ts)
- **Knockback/Slow Cause Logic**: Update the logic to process shotgun effects (critical knockback, slow) for both `'SHOTGUN'` and `'RECUO'` causes.
- **Stun Signal**: Ensure the `stun_effect` event is emitted with the correct duration and ID.

#### [MODIFY] [index.html](file:///c:/Users/chenr/Desktop/Jogo/public/index.html)
- **Shotgun Cone Origin**: Update [drawShotgunCone](file:///c:/Users/chenr/Desktop/Jogo/public/index.html#4829-4881) to originate from `p.x, p.y` (center) instead of the barrel tip.
- **Shotgun Visuals**: Remove the three distinct zone arcs; simplify to a single cone outline.
- **Recoil Cooldown**: Update [tryNaacRecoil](file:///c:/Users/chenr/Desktop/Jogo/public/index.html#3507-3532) (RMB) to have a **10s** cooldown.
- **Stun Duration (E)**: Set `stunDuration: 1.0` in `ABILITIES.advance`.
- **Stun Visuals**: Re-implement a lightweight visual indicator for the "Stunned" state (using the `peer_event` or a dedicated `stun_effect` handler).
- **Stun Feedback**: Ensure the [Advance](file:///c:/Users/chenr/Desktop/Jogo/public/index.html#3390-3470) (E) landing and server-emitted stun signals trigger the visuals.

#### [MODIFY] [SurvivalGameService.ts](file:///c:/Users/chenr/Desktop/Jogo/src/server/application/SurvivalGameService.ts)
- **Knockback Logic**: Debug and fix the `critical_knockback` effect in the shotgun damage handler.
- **Respawn Bug**: Investigate why victims of Naac are respawning at (0,0) or (WORLD,0) and getting stuck. 
  - *Hypothesis*: The death position or 'cause' might be interfering with the respawn coordinate calculation.

#### [MODIFY] [SecurityGuard.ts](file:///c:/Users/chenr/Desktop/Jogo/src/server/application/SecurityGuard.ts)
- **Stun Sync**: Re-enable the synchronization of the `stunDeadline` if needed for the new visual effect, but ensure it's limited to 1 second.

## Verification Plan

### Automated Tests
- Use `browser_subagent` to verify "Recuo" (RMB) cooldown displays 10s.
- Verify "Advance" (E) stun visuals appear on hits.

### Manual Verification
- **Knockback**: Verify that close-range shotgun hits push the enemy back.
- **Respawn**: Verify that players killed by Naac respawn in random valid locations, not at map corners.
