import { Vector3, Quaternion } from 'three';
import {
  AIRCRAFT,
  ACCELERATION,
  SPEED_DECAY,
  MAX_SPEED,
  MINIMUM_SPEED,
  BOUNDARY_RADIUS,
  RESPAWN_COUNTDOWN,
  MISSILE_REPLENISH_TIME,
  type AircraftType,
  type AircraftSpec,
} from '../../shared/constants';
import type { InputState, PlayerSnapshot } from '../../shared/protocol';
import { FORWARD, spawnTransform } from './util';

const ZERO_INPUT: InputState = { pitch: 0, roll: 0, yaw: 0, accelerate: false };
const BOUNDARY_SQ = BOUNDARY_RADIUS * BOUNDARY_RADIUS;

// Scratch objects reused across ticks to avoid per-frame allocation.
const _dq = new Quaternion();
const _fwd = new Vector3();

export class Player {
  readonly id: string;
  name = '';
  aircraft: AircraftType = 'f16';
  spec: AircraftSpec = AIRCRAFT.f16;

  /** True once the player has chosen a loadout and entered the arena. */
  spawned = false;

  pos = new Vector3();
  quat = new Quaternion();
  speed = MINIMUM_SPEED;

  hp = 0;
  maxHp = 0;

  missiles = 0;
  maxMissiles = 0;
  /** Seconds until the next missile is regained, or null when at max payload. */
  replenishTimer: number | null = null;

  targetId: string | null = null;
  locked = false;

  alive = false;
  respawnTimer = 0;

  kills = 0;
  deaths = 0;

  input: InputState = { ...ZERO_INPUT };

  constructor(id: string) {
    this.id = id;
  }

  /** Apply loadout and place the player into the arena for the first time. */
  enterArena(name: string, aircraft: AircraftType) {
    this.name = name.slice(0, 16) || 'Pilot';
    this.aircraft = aircraft;
    this.spec = AIRCRAFT[aircraft];
    this.spawned = true;
    this.respawn();
  }

  /** Reset to full stats at a fresh spawn point facing center. */
  respawn() {
    const { pos, quat } = spawnTransform();
    this.pos.copy(pos);
    this.quat.copy(quat);
    this.speed = MINIMUM_SPEED;
    this.hp = this.spec.hp;
    this.maxHp = this.spec.hp;
    this.missiles = this.spec.maxMissiles;
    this.maxMissiles = this.spec.maxMissiles;
    this.replenishTimer = null;
    this.alive = true;
    this.respawnTimer = 0;
    this.input = { ...ZERO_INPUT };
  }

  forward(out = _fwd): Vector3 {
    return out.copy(FORWARD).applyQuaternion(this.quat);
  }

  /**
   * Advance flight one tick. Returns true if the player crossed the outer
   * boundary and was teleported back (used to emit the warning event).
   */
  updateFlight(dt: number): boolean {
    if (!this.alive) return false;
    const turn = this.spec.turnRate;
    const { pitch, roll, yaw, accelerate } = this.input;

    // Local-axis angular integration (pitch about X, yaw about Y, roll about Z).
    // Yaw/roll are negated so +input yaws/rolls to the player's right (nose -Z, right +X).
    if (pitch) this.quat.multiply(_dq.setFromAxisAngle(AXIS_X, pitch * turn * dt));
    if (yaw) this.quat.multiply(_dq.setFromAxisAngle(AXIS_Y, -yaw * turn * dt));
    if (roll) this.quat.multiply(_dq.setFromAxisAngle(AXIS_Z, -roll * turn * dt));
    this.quat.normalize();

    // Speed: accelerate toward MAX while held, decay back to the floor otherwise.
    if (accelerate) this.speed = Math.min(MAX_SPEED, this.speed + ACCELERATION * dt);
    else this.speed = Math.max(MINIMUM_SPEED, this.speed - SPEED_DECAY * dt);

    this.forward(_fwd);
    this.pos.addScaledVector(_fwd, this.speed * dt);

    // Out of bounds -> teleport to a fresh spawn (living players only).
    if (this.pos.lengthSq() > BOUNDARY_SQ) {
      const { pos, quat } = spawnTransform();
      this.pos.copy(pos);
      this.quat.copy(quat);
      this.speed = MINIMUM_SPEED;
      return true;
    }
    return false;
  }

  /** Tick the missile replenish countdown (GDD §3). */
  updateReplenish(dt: number) {
    if (this.replenishTimer === null) return;
    this.replenishTimer -= dt;
    if (this.replenishTimer <= 0) {
      this.missiles = Math.min(this.maxMissiles, this.missiles + 1);
      this.replenishTimer = this.missiles < this.maxMissiles ? MISSILE_REPLENISH_TIME : null;
    }
  }

  /** Tick the respawn countdown while dead. Returns true when respawn fires. */
  updateRespawn(dt: number): boolean {
    if (this.alive) return false;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawn();
      return true;
    }
    return false;
  }

  kill() {
    this.alive = false;
    this.respawnTimer = RESPAWN_COUNTDOWN;
    this.deaths += 1;
    this.targetId = null;
    this.locked = false;
    this.input = { ...ZERO_INPUT };
  }

  toSnapshot(): PlayerSnapshot {
    return {
      id: this.id,
      name: this.name,
      aircraft: this.aircraft,
      pos: [this.pos.x, this.pos.y, this.pos.z],
      quat: [this.quat.x, this.quat.y, this.quat.z, this.quat.w],
      alive: this.alive,
    };
  }
}

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);
