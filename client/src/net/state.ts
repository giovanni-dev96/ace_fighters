import type { PlayerSnapshot, MissileSnapshot, SelfState } from '../../../shared/protocol';

// Mutable, high-frequency game state read directly by the render loop (useFrame).
// Kept OUT of React/zustand so 20 Hz transform updates never trigger re-renders.
export const latest = {
  players: new Map<string, PlayerSnapshot>(),
  missiles: new Map<string, MissileSnapshot>(),
  you: null as SelfState | null,
};

export function resetLatest() {
  latest.players.clear();
  latest.missiles.clear();
  latest.you = null;
}
