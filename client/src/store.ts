import { create } from 'zustand';
import type {
  AircraftType,
} from '../../shared/constants';
import type {
  LeaderboardEntry,
  FeedEntry,
  SelfState,
  ExplosionKind,
  Vec3,
} from '../../shared/protocol';
import { connectSocket, sendMessage, closeSocket } from './net/connection';

export type ConnState = 'disconnected' | 'connecting' | 'connected';
export type Screen = 'connect' | 'menu' | 'joinInput' | 'loadout' | 'ingame' | 'ended';

export interface PlayerMeta {
  id: string;
  name: string;
  aircraft: AircraftType;
}

export interface ExplosionFx {
  id: number;
  pos: Vec3;
  kind: ExplosionKind;
}

let explosionSeq = 0;

interface GameState {
  conn: ConnState;
  screen: Screen;
  hash: string | null;
  selfId: string | null;
  error: string | null;

  // Membership / lists (change rarely -> safe as React state).
  roster: PlayerMeta[];
  missileIds: string[];

  // Per-tick HUD data (small; re-renders only the HUD subtree).
  you: SelfState | null;
  leaderboard: LeaderboardEntry[];
  feed: FeedEntry[];
  winner: string | null;

  /** Timestamp (ms) of the last out-of-bounds event, for the 3s warning banner. */
  outOfBoundsAt: number;

  /** True while TAB is held (GDD §5). */
  showLeaderboard: boolean;

  /** Active explosion effects; each removes itself when its animation finishes. */
  explosions: ExplosionFx[];

  // --- actions ---
  connect: () => void;
  addExplosion: (pos: Vec3, kind: ExplosionKind) => void;
  removeExplosion: (id: number) => void;
  createGame: () => void;
  joinGame: (hash: string) => void;
  setLoadout: (name: string, aircraft: AircraftType) => void;
  leave: () => void;
  clearError: () => void;
}

export const useStore = create<GameState>((set, get) => ({
  conn: 'disconnected',
  screen: 'connect',
  hash: null,
  selfId: null,
  error: null,
  roster: [],
  missileIds: [],
  you: null,
  leaderboard: [],
  feed: [],
  winner: null,
  outOfBoundsAt: 0,
  showLeaderboard: false,
  explosions: [],

  addExplosion: (pos, kind) =>
    set((s) => ({ explosions: [...s.explosions.slice(-40), { id: explosionSeq++, pos, kind }] })),
  removeExplosion: (id) => set((s) => ({ explosions: s.explosions.filter((e) => e.id !== id) })),

  connect: () => {
    if (get().conn !== 'disconnected') return;
    set({ conn: 'connecting', error: null });
    connectSocket();
  },

  createGame: () => {
    set({ error: null });
    sendMessage({ t: 'createGame' });
  },

  joinGame: (hash: string) => {
    set({ error: null });
    sendMessage({ t: 'joinGame', hash });
  },

  setLoadout: (name: string, aircraft: AircraftType) => {
    sendMessage({ t: 'setLoadout', name, aircraft });
    set({ screen: 'ingame' });
  },

  leave: () => {
    sendMessage({ t: 'leave' });
    closeSocket();
  },

  clearError: () => set({ error: null }),
}));
