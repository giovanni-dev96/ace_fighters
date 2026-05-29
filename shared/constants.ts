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
export const MISSILE_SPEED = 20; // units/sec
export const MISSILE_TURN_RATE = 0.6; // rad/sec steering cap toward target
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
