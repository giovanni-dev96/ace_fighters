// Wire protocol shared by client and server. Pure types only.
import type { AircraftType, BotDifficulty } from './constants';

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w

// ---------------------------------------------------------------------------
// Snapshot entities (broadcast each server tick)
// ---------------------------------------------------------------------------

export interface PlayerSnapshot {
  id: string;
  name: string;
  aircraft: AircraftType;
  pos: Vec3;
  quat: Quat;
  alive: boolean;
}

export interface MissileSnapshot {
  id: string;
  pos: Vec3;
  quat: Quat;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  kills: number;
  deaths: number;
}

export interface FeedEntry {
  id: number;
  text: string;
}

/** Per-recipient personalized block (lock/warning/target differ per player). */
export interface SelfState {
  hp: number;
  maxHp: number;
  speed: number;
  missiles: number;
  maxMissiles: number;
  alive: boolean;
  respawnIn: number; // seconds remaining, 0 if alive
  targetId: string | null;
  locked: boolean;
  /** Closest inbound tracking missile as 0..1 proximity (1 = very close), or 0 if none. */
  warning: number;
}

// ---------------------------------------------------------------------------
// Client -> Server
// ---------------------------------------------------------------------------

export interface InputState {
  pitch: number; // -1..1 (W/S, inverted handled client-side per GDD)
  roll: number; // -1..1 (A/D)
  yaw: number; // -1..1 (Q/E)
  accelerate: boolean; // Spacebar
}

export type ClientMessage =
  | { t: 'createGame'; bots?: number; difficulty?: BotDifficulty }
  | { t: 'joinGame'; hash: string }
  | { t: 'setLoadout'; name: string; aircraft: AircraftType }
  | { t: 'input'; input: InputState }
  | { t: 'fire' }
  | { t: 'switchTarget' }
  | { t: 'leave' };

// ---------------------------------------------------------------------------
// Server -> Client
// ---------------------------------------------------------------------------

export type ServerEventKind = 'outOfBounds';
export type ExplosionKind = 'missile' | 'plane';

export type ServerMessage =
  | { t: 'created'; hash: string; selfId: string }
  | { t: 'joined'; selfId: string; hash: string }
  | { t: 'error'; message: string }
  | {
      t: 'snapshot';
      players: PlayerSnapshot[];
      missiles: MissileSnapshot[];
      leaderboard: LeaderboardEntry[];
      feed: FeedEntry[];
      you: SelfState;
    }
  | { t: 'event'; kind: ServerEventKind }
  | { t: 'explosion'; pos: Vec3; kind: ExplosionKind }
  | { t: 'sessionEnded'; leaderboard: LeaderboardEntry[]; winner: string };

export const SESSION_ENDED_OR_MISSING = 'Session Ended or Doesn\'t Exist';
