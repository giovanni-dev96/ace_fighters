import { Vector3, Quaternion } from 'three';
import { MISSILE_SPEED, MISSILE_TURN_RATE, MISSILE_LIFETIME } from '../../shared/constants';
import type { MissileSnapshot } from '../../shared/protocol';
import { FORWARD } from './util';
import type { Player } from './Player';

const _toTarget = new Vector3();
const _desiredVel = new Vector3();
const _quat = new Quaternion();
const _dir = new Vector3();

export class Missile {
  readonly id: string;
  readonly ownerId: string;
  /** Locked target at fire time; null means fired straight (dumb). */
  targetId: string | null;
  pos = new Vector3();
  vel = new Vector3();
  age = 0;
  dead = false;

  constructor(id: string, owner: Player, targetId: string | null) {
    this.id = id;
    this.ownerId = owner.id;
    this.targetId = targetId;
    this.pos.copy(owner.pos);
    // Launch along the owner's nose at missile speed.
    this.vel.copy(FORWARD).applyQuaternion(owner.quat).multiplyScalar(MISSILE_SPEED);
  }

  /** Steer toward the target (if any) with a capped turn rate, then advance. */
  update(dt: number, target: Player | undefined) {
    this.age += dt;
    if (this.age >= MISSILE_LIFETIME) {
      this.dead = true;
      return;
    }

    if (target && target.alive) {
      _toTarget.copy(target.pos).sub(this.pos);
      const dist = _toTarget.length();
      if (dist > 1e-4) {
        _toTarget.divideScalar(dist);
        _desiredVel.copy(_toTarget).multiplyScalar(MISSILE_SPEED);
        // Rotate current velocity toward desired by at most MISSILE_TURN_RATE*dt.
        _dir.copy(this.vel).normalize();
        const cur = _quat.setFromUnitVectors(FORWARD, _dir);
        const desired = _quat.clone().setFromUnitVectors(FORWARD, _toTarget);
        const maxStep = MISSILE_TURN_RATE * dt;
        const angle = cur.angleTo(desired);
        const t = angle > 1e-5 ? Math.min(1, maxStep / angle) : 1;
        cur.slerp(desired, t);
        this.vel.copy(FORWARD).applyQuaternion(cur).multiplyScalar(MISSILE_SPEED);
      }
    }

    this.pos.addScaledVector(this.vel, dt);
  }

  toSnapshot(): MissileSnapshot {
    _dir.copy(this.vel).normalize();
    _quat.setFromUnitVectors(FORWARD, _dir);
    return {
      id: this.id,
      pos: [this.pos.x, this.pos.y, this.pos.z],
      quat: [_quat.x, _quat.y, _quat.z, _quat.w],
    };
  }
}
