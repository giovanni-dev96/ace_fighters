import { Vector3, Quaternion } from 'three';
import {
  MISSILE_SPEED,
  MISSILE_LOCK_THRESHOLD,
  BOUNDARY_RADIUS,
  BOT_FIRE_MAX_RANGE,
  BOT_BOUNDARY_RECOVER,
  BOT_SEPARATION_DIST,
  type BotProfile,
} from '../../shared/constants';
import type { InputState } from '../../shared/protocol';
import type { Player } from './Player';

/** Everything a bot is allowed to perceive, supplied by Session each tick. */
export interface BotWorld {
  /** All spawned players (humans + bots), including self. */
  players: Player[];
  /** Closest inbound tracking missile as 0..1 proximity (1 = very close), 0 if none. */
  threatProximity: number;
  /** Unit direction from the closest inbound missile toward self, or null if none. */
  threatDir: Vector3 | null;
  /** Fire a missile for this bot (routes through Session.fire). */
  fire: (p: Player) => void;
}

type BotState = 'hunt' | 'pursue' | 'attack' | 'evade' | 'disengage' | 'recover';

// Half-angle of the lock cone: acos(MISSILE_LOCK_THRESHOLD).
const LOCK_HALF_ANGLE = Math.acos(MISSILE_LOCK_THRESHOLD);
// Diameter of the play area — used to normalize distance scores to ~0..1.
const ARENA_SPAN = BOUNDARY_RADIUS * 2;

// Scratch objects reused across ticks/bots to avoid per-frame allocation.
const _selfFwd = new Vector3();
const _tgtFwd = new Vector3();
const _toTarget = new Vector3();
const _desired = new Vector3();
const _lead = new Vector3();
const _tgtVel = new Vector3();
const _local = new Vector3();
const _perp = new Vector3();
const _away = new Vector3();
const _invQ = new Quaternion();
const WORLD_UP = new Vector3(0, 1, 0);

export class BotController {
  private readonly self: Player;
  private readonly profile: BotProfile;

  private state: BotState = 'hunt';

  // Smoothed input actually applied (eased toward the freshly computed target input).
  private readonly applied: InputState = { pitch: 0, roll: 0, yaw: 0, accelerate: false };

  private fireTimer = 0;
  private thinkTimer = 0;
  private aimJitterYaw = 0;
  private aimJitterPitch = 0;

  constructor(self: Player, profile: BotProfile) {
    this.self = self;
    this.profile = profile;
  }

  /** Run one tick of perception → decision → control. Call only while alive. */
  think(dt: number, ctx: BotWorld): void {
    const self = this.self;
    this.fireTimer -= dt;
    this.thinkTimer -= dt;

    // Periodically re-pick a target and refresh the slow aim wander.
    if (this.thinkTimer <= 0) {
      this.thinkTimer = this.profile.thinkInterval;
      this.selectTarget(ctx);
      const j = this.profile.aimError;
      this.aimJitterYaw = (Math.random() * 2 - 1) * j;
      this.aimJitterPitch = (Math.random() * 2 - 1) * j;
    }

    const target = this.currentTarget(ctx);
    self.forward(_selfFwd);

    // Geometry to the current target (if any).
    let dist = Infinity;
    let aimAngle = Math.PI;
    if (target) {
      _toTarget.copy(target.pos).sub(self.pos);
      dist = _toTarget.length();
      if (dist > 1e-4) {
        const ahead = _selfFwd.dot(_toTarget) / dist;
        aimAngle = Math.acos(Math.max(-1, Math.min(1, ahead)));
      }
    }

    const distToCenter = self.pos.length();

    // ---- choose state (priority: recover > evade > disengage > attack > pursue > hunt)
    let accelerate: boolean;
    if (distToCenter > BOT_BOUNDARY_RECOVER) {
      this.state = 'recover';
      _desired.copy(self.pos).multiplyScalar(-1); // steer back toward origin
      accelerate = false; // tighter turn-around
    } else if (ctx.threatProximity >= this.profile.evadeThreat && ctx.threatDir) {
      this.state = 'evade';
      this.evadeDirection(ctx.threatDir, _desired);
      accelerate = true; // outrun the slower missile, force an overshoot
    } else if (self.missiles === 0) {
      this.state = 'disengage';
      this.disengageDirection(ctx, _desired);
      accelerate = true;
    } else if (target && aimAngle <= LOCK_HALF_ANGLE + this.profile.coneGrace && dist <= BOT_FIRE_MAX_RANGE * 1.2) {
      this.state = 'attack';
      this.aimDirection(target, dist, _desired);
      accelerate = false; // bleed speed to tighten the turn and hold the cone
    } else if (target) {
      this.state = 'pursue';
      this.aimDirection(target, dist, _desired);
      accelerate = true;
    } else {
      this.state = 'hunt';
      _desired.copy(self.pos).multiplyScalar(distToCenter > 1e-4 ? -1 : 0); // drift to center
      if (_desired.lengthSq() < 1e-6) _desired.copy(_selfFwd);
      accelerate = true;
    }

    this.applySeparation(ctx, _desired);
    this.steer(_desired, accelerate, dt);

    // ---- firing: only tracking shots (real lock), respecting range, cooldown, reserve.
    if (
      target &&
      this.fireTimer <= 0 &&
      self.missiles > 0 &&
      self.locked &&
      self.targetId === target.id &&
      dist <= BOT_FIRE_MAX_RANGE &&
      (self.missiles > 1 || dist <= BOT_FIRE_MAX_RANGE * 0.6) // hold the last missile for a sure thing
    ) {
      ctx.fire(self);
      this.fireTimer = this.profile.fireCooldown;
    }
  }

  // ---- target selection ----------------------------------------------------

  private selectTarget(ctx: BotWorld): void {
    const self = this.self;
    self.forward(_selfFwd);

    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const p of ctx.players) {
      if (p.id === self.id || !p.alive || !p.spawned) continue;
      _toTarget.copy(p.pos).sub(self.pos);
      const d = _toTarget.length();
      if (d < 1e-4) continue;
      const ahead = _selfFwd.dot(_toTarget) / d; // -1..1
      const closeness = 1 - Math.min(1, d / ARENA_SPAN);
      const weakness = p.maxHp > 0 ? 1 - p.hp / p.maxHp : 0;
      const sticky = p.id === self.targetId ? 0.15 : 0;
      const score = closeness * 0.5 + ((ahead + 1) / 2) * 0.3 + weakness * 0.2 + sticky;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    self.targetId = best ? best.id : null;
  }

  private currentTarget(ctx: BotWorld): Player | undefined {
    if (!this.self.targetId) return undefined;
    const t = ctx.players.find((p) => p.id === this.self.targetId);
    return t && t.alive && t.spawned ? t : undefined;
  }

  // ---- desired-direction helpers ------------------------------------------

  /** Aim at a predicted intercept point ahead of the target (scaled by leadFactor). */
  private aimDirection(target: Player, dist: number, out: Vector3): void {
    target.forward(_tgtFwd);
    _tgtVel.copy(_tgtFwd).multiplyScalar(target.speed);
    const leadTime = (Number.isFinite(dist) ? dist : 0) / MISSILE_SPEED;
    _lead.copy(target.pos).addScaledVector(_tgtVel, leadTime * this.profile.leadFactor);
    out.copy(_lead).sub(this.self.pos);
    if (out.lengthSq() < 1e-6) out.copy(_selfFwd);
  }

  /** Break perpendicular to the incoming missile, toward whichever side needs less turn. */
  private evadeDirection(threatDir: Vector3, out: Vector3): void {
    _perp.crossVectors(threatDir, WORLD_UP);
    if (_perp.lengthSq() < 1e-6) _perp.crossVectors(threatDir, _selfFwd);
    _perp.normalize();
    // Pick the perpendicular hemisphere closer to current heading (cheaper turn).
    if (_perp.dot(_selfFwd) < 0) _perp.multiplyScalar(-1);
    out.copy(_perp);
  }

  /** Flee the nearest enemy while drifting back toward the arena center. */
  private disengageDirection(ctx: BotWorld, out: Vector3): void {
    const self = this.self;
    let nearest: Player | null = null;
    let nearestSq = Infinity;
    for (const p of ctx.players) {
      if (p.id === self.id || !p.alive || !p.spawned) continue;
      const dSq = self.pos.distanceToSquared(p.pos);
      if (dSq < nearestSq) {
        nearestSq = dSq;
        nearest = p;
      }
    }
    out.set(0, 0, 0);
    if (nearest) out.copy(self.pos).sub(nearest.pos).normalize();
    out.addScaledVector(self.pos, -0.003); // gentle pull toward origin
    if (out.lengthSq() < 1e-6) out.copy(_selfFwd);
  }

  /** Nudge away from any aircraft inside the separation radius (avoid no-score collisions). */
  private applySeparation(ctx: BotWorld, dir: Vector3): void {
    const self = this.self;
    _away.set(0, 0, 0);
    let any = false;
    for (const p of ctx.players) {
      if (p.id === self.id || !p.alive || !p.spawned) continue;
      const d = self.pos.distanceTo(p.pos);
      if (d > 1e-4 && d < BOT_SEPARATION_DIST) {
        _away.addScaledVector(_toTargetAway(self.pos, p.pos), (BOT_SEPARATION_DIST - d) / BOT_SEPARATION_DIST);
        any = true;
      }
    }
    if (any) {
      dir.normalize().addScaledVector(_away.normalize(), 1.5).normalize();
    }
  }

  // ---- control: desired world direction -> smoothed InputState -------------

  private steer(desiredWorld: Vector3, accelerate: boolean, dt: number): void {
    const self = this.self;
    if (desiredWorld.lengthSq() < 1e-6) return;

    // Express the desired direction in the bot's local frame (forward = -Z).
    _local.copy(desiredWorld).normalize().applyQuaternion(_invQ.copy(self.quat).invert());

    const horiz = Math.sqrt(_local.x * _local.x + _local.z * _local.z);
    let yawErr = Math.atan2(_local.x, -_local.z) + this.aimJitterYaw; // + = target to the right
    let pitchErr = Math.atan2(_local.y, horiz) + this.aimJitterPitch; // + = target above

    const g = this.profile.steerGain;
    const targetYaw = clamp(yawErr * g, -1, 1);
    const targetPitch = clamp(pitchErr * g, -1, 1);
    const targetRoll = clamp(yawErr * g * 0.3, -1, 1); // cosmetic bank into the turn

    // Ease toward the freshly computed input over reactionTime (models pilot reflex lag).
    const k = this.profile.reactionTime > 1e-3 ? Math.min(1, dt / this.profile.reactionTime) : 1;
    this.applied.pitch += (targetPitch - this.applied.pitch) * k;
    this.applied.yaw += (targetYaw - this.applied.yaw) * k;
    this.applied.roll += (targetRoll - this.applied.roll) * k;
    this.applied.accelerate = accelerate;

    self.input = this.applied;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Direction from `to` toward `from` (i.e. away from `to`), written into a fresh-ish scratch.
const _awayTmp = new Vector3();
function _toTargetAway(from: Vector3, to: Vector3): Vector3 {
  return _awayTmp.copy(from).sub(to).normalize();
}
