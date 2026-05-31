// Shared game constants — imported by both client and server.
// Pure values only (no runtime dependencies) so both build environments can consume it.

export const SERVER_TICK_RATE = 20; // Hz
export const TICK_DT = 1 / SERVER_TICK_RATE; // seconds per tick

export const MISSILE_LOCK_THRESHOLD = 0.95; // dot(forward, toTarget) >= this -> locked
export const MISSILE_DAMAGE = 50;
export const MISSILE_LIFETIME = 20; // seconds
export const MISSILE_REPLENISH_TIME = 5; // seconds to regain 1 missile

export const RESPAWN_COUNTDOWN = 5; // seconds
export const SPAWN_RADIUS = 100; // units (sphere surface spawn)
export const BOUNDARY_RADIUS = 200; // units (out-of-bounds teleport trigger)
export const BOUNDARY_WARN_TIME = 3; // seconds the "STAY WITHIN BATTLE AREA" message shows

export const WIN_KILL_COUNT = 10;
export const KILL_FEED_LENGTH = 5;

export const MINIMUM_SPEED = 5; // units/sec floor speed
export const MAX_SPEED = 25; // units/sec ceiling while accelerating
export const ACCELERATION = 25; // units/sec^2 toward MAX while accelerating
export const SPEED_DECAY = 15; // units/sec^2 back toward MINIMUM_SPEED when not

export const COLLISION_HIT_MIN_DIST = 0.75; // units
export const COLLISION_HIT_MIN_DIST_SQ = COLLISION_HIT_MIN_DIST * COLLISION_HIT_MIN_DIST;

// Missiles are faster than planes, but turn slower so a sharp maneuver can make them overshoot.
export const MISSILE_SPEED = 50; // units/sec
export const MISSILE_TURN_RATE = 0.8; // rad/sec steering cap toward target
export const MISSILE_WARN_RANGE = 130; // units within which an inbound tracker raises the warning

export type Maneuverability = 'low' | 'balanced' | 'high';
export type AircraftType = 'su30' | 'f16' | 'f15';

export interface AircraftSpec {
  type: AircraftType;
  displayName: string;
  maneuverability: Maneuverability;
  hp: number;
  maxMissiles: number;
  /** Angular rate (rad/sec) applied per input axis — abstracts "maneuverability". */
  turnRate: number;
}

const BASE_AIRCRAFT_MANEUVERABILITY = 0.75;

export const AIRCRAFT: Record<AircraftType, AircraftSpec> = {
  su30: {
    type: 'su30', displayName: 'Su-30',
    maneuverability: 'high',
    hp: 100,
    maxMissiles: 2,
    turnRate: BASE_AIRCRAFT_MANEUVERABILITY
  },
  f16: { 
    type: 'f16', displayName: 'F-16', 
    maneuverability: 'balanced', 
    hp: 150, 
    maxMissiles: 4, 
    turnRate: 0.75 * BASE_AIRCRAFT_MANEUVERABILITY 
  },
  f15: { 
    type: 'f15', displayName: 'F-15', 
    maneuverability: 'low', 
    hp: 200, 
    maxMissiles: 6, 
    turnRate: 0.5 * BASE_AIRCRAFT_MANEUVERABILITY
  },
};

export const AIRCRAFT_LIST: AircraftSpec[] = [AIRCRAFT.su30, AIRCRAFT.f16, AIRCRAFT.f15];

// Aircraft models are authored facing local -Z (three.js forward) and fit a 1-unit-radius sphere.
// Chase camera sits behind (+Z local) and slightly above the model, looking forward.
export const CAMERA_OFFSET: readonly [number, number, number] = [0, 0.7, 4.2];
export const CAMERA_LOOK_AHEAD = 6; // units ahead of the plane the camera aims at

// ---------------------------------------------------------------------------
// Enemy AI (bots)
// ---------------------------------------------------------------------------

export const MAX_BOTS = 8;

export type BotDifficulty = 'rookie' | 'veteran' | 'ace';

export interface BotProfile {
  reactionTime: number; // s of input lag (new inputs are eased in over this time)
  aimError: number; // rad of jitter added to the aim direction
  steerGain: number; // P-gain applied to steering error before clamping to [-1,1]
  coneGrace: number; // extra radians beyond the lock cone within which the bot will still fire
  fireCooldown: number; // s between shots
  thinkInterval: number; // s between high-level re-decisions (target + state)
  evadeThreat: number; // inbound-missile proximity (0..1) that triggers Evade
  leadFactor: number; // 0 = aim at current pos, 1 = full intercept lead
}

const BASE_BOT_REACTIONTIME = 4.0 // INVERSE
const BASE_BOT_AIMERROR = 3.0 // INVERSE
const BASE_BOT_STEERGAIN = 0.25
const BASE_BOT_CONEGRACE = 1.0
const BASE_BOT_FIRECD = 1.0
const BASE_BOT_THINKINTERVAL = 3.0 // INVERSE
const BASE_BOT_EVADETHREAT = 5.0 // INVERSE 
const BASE_BOT_LEADFACTOR = 0.5

export const BOT_PROFILES: Record<BotDifficulty, BotProfile> = {
    rookie: { 
      reactionTime: 0.5 * BASE_BOT_REACTIONTIME,
      aimError: 0.12 * BASE_BOT_AIMERROR,
      steerGain: 1.5 * BASE_BOT_STEERGAIN,
      coneGrace: 0.0 * BASE_BOT_CONEGRACE,
      fireCooldown: 1.6 * BASE_BOT_FIRECD,
      thinkInterval: 1.5 * BASE_BOT_THINKINTERVAL,
      evadeThreat: 0.7 * BASE_BOT_EVADETHREAT,
      leadFactor: 0.0 * BASE_BOT_LEADFACTOR 
    },
    veteran: { 
      reactionTime: 0.25 * BASE_BOT_REACTIONTIME,
      aimError: 0.05 * BASE_BOT_AIMERROR,
      steerGain: 2.5 * BASE_BOT_STEERGAIN,
      coneGrace: 0.05 * BASE_BOT_CONEGRACE,
      fireCooldown: 1.0 * BASE_BOT_FIRECD,
      thinkInterval: 0.8 * BASE_BOT_THINKINTERVAL,
      evadeThreat: 0.5 * BASE_BOT_EVADETHREAT,
      leadFactor: 0.6 * BASE_BOT_LEADFACTOR, 
    },
    ace: { 
      reactionTime: 0.08 * BASE_BOT_REACTIONTIME,
      aimError: 0.01 * BASE_BOT_AIMERROR,
      steerGain: 3.5 * BASE_BOT_STEERGAIN,
      coneGrace: 0.1 * BASE_BOT_CONEGRACE,
      fireCooldown: 0.8 * BASE_BOT_FIRECD,
      thinkInterval: 0.3 * BASE_BOT_THINKINTERVAL,
      evadeThreat: 0.4 * BASE_BOT_EVADETHREAT,
      leadFactor: 1.0 * BASE_BOT_LEADFACTOR 
    },
  };

export const BOT_FIRE_MAX_RANGE = 90; // units; beyond this the slow missile loses the race
export const BOT_BOUNDARY_RECOVER = 160; // units; ‖pos‖ at which the Recover state turns the bot back
export const BOT_SEPARATION_DIST = 8; // units; bots steer apart within this radius to avoid no-score collisions
export const DEFAULT_BOT_DIFFICULTY: BotDifficulty = 'veteran';
