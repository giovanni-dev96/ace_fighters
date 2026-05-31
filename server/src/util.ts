import { Vector3, Quaternion, Matrix4 } from 'three';
import { SPAWN_RADIUS } from '../../shared/constants';
import type { Vec3, Quat } from '../../shared/protocol';

const UP = new Vector3(0, 1, 0);
export const FORWARD = new Vector3(0, 0, -1); // model nose points local -Z

export function toVec3(v: Vector3): Vec3 {
  return [v.x, v.y, v.z];
}

export function toQuat(q: Quaternion): Quat {
  return [q.x, q.y, q.z, q.w];
}

/** Random point on the surface of a sphere of the given radius (centered at origin). */
export function randomPointOnSphere(radius: number, out = new Vector3()): Vector3 {
  // Uniform direction via normalized gaussian-ish sampling using spherical coords.
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const sinPhi = Math.sin(phi);
  out.set(sinPhi * Math.cos(theta), sinPhi * Math.sin(theta), Math.cos(phi));
  return out.multiplyScalar(radius);
}

const _m = new Matrix4();
/** Orientation whose forward (-Z) points from `pos` toward the origin. */
export function orientationTowardCenter(pos: Vector3, out = new Quaternion()): Quaternion {
  _m.lookAt(pos, new Vector3(0, 0, 0), UP);
  out.setFromRotationMatrix(_m);
  return out;
}

/** A fresh spawn: random point on the 100-unit sphere, facing the center. */
export function spawnTransform(): { pos: Vector3; quat: Quaternion } {
  const pos = randomPointOnSphere(SPAWN_RADIUS);
  const quat = orientationTowardCenter(pos);
  return { pos, quat };
}

const WORDS_A = ['ALPHA', 'BRAVO', 'DELTA', 'ECHO', 'FOX', 'GOLF', 'HOTEL', 'IRON', 'KILO', 'LIMA', 'NOVA', 'OMEGA', 'RAVEN', 'SIERRA', 'TANGO', 'VIPER'];
const WORDS_B = ['JET', 'HAWK', 'WING', 'STORM', 'BOLT', 'DART', 'CLAW', 'EDGE', 'FANG', 'GUST', 'PEAK', 'REACH', 'SHOT', 'TIDE'];

/** Short, human-readable, easy-to-share session code, e.g. "VIPER-HAWK-37". */
export function generateHash(): string {
  const a = WORDS_A[Math.floor(Math.random() * WORDS_A.length)];
  const b = WORDS_B[Math.floor(Math.random() * WORDS_B.length)];
  const n = Math.floor(Math.random() * 90) + 10;
  return `${a}-${b}-${n}`;
}

const BOT_NAMES = ['REAPER', 'GHOST', 'MAVERICK', 'ICEMAN', 'VENOM', 'SABER', 'ROGUE', 'BANDIT', 'COBRA', 'WIDOW', 'SPECTER', 'HAVOC', 'JESTER', 'SLAYER', 'NOMAD', 'TALON'];

/** Callsign for a bot pilot, e.g. "REAPER-42". */
export function generateBotName(): string {
  const base = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const n = Math.floor(Math.random() * 90) + 10;
  return `${base}-${n}`;
}
