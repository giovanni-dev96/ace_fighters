import { Vector3 } from 'three';
import { randomUUID } from 'node:crypto';
import {
  SERVER_TICK_RATE,
  MISSILE_DAMAGE,
  MISSILE_LOCK_THRESHOLD,
  MISSILE_REPLENISH_TIME,
  MISSILE_WARN_RANGE,
  COLLISION_HIT_MIN_DIST_SQ,
  KILL_FEED_LENGTH,
  WIN_KILL_COUNT,
  type AircraftType,
} from '../../shared/constants';
import type { ServerMessage, LeaderboardEntry, FeedEntry, InputState, ExplosionKind } from '../../shared/protocol';
import { Player } from './Player';
import { Missile } from './Missile';

type Send = (msg: ServerMessage) => void;

const WARN_RANGE_SQ = MISSILE_WARN_RANGE * MISSILE_WARN_RANGE;
const _toTarget = new Vector3();

export class Session {
  readonly hash: string;
  readonly players = new Map<string, Player>();
  private readonly senders = new Map<string, Send>();
  private readonly missiles: Missile[] = [];
  private readonly feed: FeedEntry[] = [];
  private feedSeq = 0;

  ended = false;
  private winner = '';
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();

  constructor(hash: string, private readonly onEmpty: (hash: string) => void) {
    this.hash = hash;
    this.interval = setInterval(() => this.tick(), 1000 / SERVER_TICK_RATE);
  }

  // ---- membership ---------------------------------------------------------

  addPlayer(send: Send): Player {
    const player = new Player(randomUUID());
    this.players.set(player.id, player);
    this.senders.set(player.id, send);
    return player;
  }

  removePlayer(id: string) {
    const leaving = this.players.get(id);
    this.players.delete(id);
    this.senders.delete(id);

    // Auto-retarget anyone locked onto the departed player (GDD §7).
    if (leaving) {
      for (const p of this.players.values()) {
        if (p.targetId === id) this.retarget(p);
      }
    }

    if (this.players.size === 0) this.dispose();
  }

  private dispose() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.onEmpty(this.hash);
  }

  // ---- player intents -----------------------------------------------------

  setInput(player: Player, input: InputState) {
    if (player.alive) player.input = input;
  }

  fire(player: Player) {
    if (this.ended || !player.alive || player.missiles <= 0) return; // never reset timer at zero
    player.missiles -= 1;
    player.replenishTimer = MISSILE_REPLENISH_TIME; // (re)start countdown
    const lockedTarget = player.locked && player.targetId ? player.targetId : null;
    this.missiles.push(new Missile(randomUUID(), player, lockedTarget));
  }

  switchTarget(player: Player) {
    if (this.ended || !player.alive) return;
    const candidates = [...this.players.values()].filter(
      (p) => p.id !== player.id && p.spawned && p.alive && p.id !== player.targetId,
    );
    if (candidates.length === 0) {
      // Fall back to keeping the only other enemy if there is exactly one.
      const others = [...this.players.values()].filter((p) => p.id !== player.id && p.spawned && p.alive);
      player.targetId = others.length ? others[Math.floor(Math.random() * others.length)].id : null;
      return;
    }
    player.targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  private retarget(player: Player) {
    const others = [...this.players.values()].filter((p) => p.id !== player.id && p.spawned && p.alive);
    player.targetId = others.length ? others[Math.floor(Math.random() * others.length)].id : null;
  }

  // ---- simulation ---------------------------------------------------------

  private tick() {
    if (this.ended) return;
    // Measure real elapsed time so the sim runs in wall-clock time regardless of
    // setInterval jitter (clamped to absorb pauses/GC without huge position jumps).
    const now = Date.now();
    const dt = Math.min(0.25, Math.max(0, (now - this.lastTick) / 1000));
    this.lastTick = now;

    for (const p of this.players.values()) {
      if (!p.spawned) continue;
      p.updateReplenish(dt);
      if (p.alive) {
        const teleported = p.updateFlight(dt);
        if (teleported) this.send(p.id, { t: 'event', kind: 'outOfBounds' });
      } else {
        p.updateRespawn(dt);
      }
    }

    this.updateMissiles(dt);
    this.resolvePlaneCollisions();
    this.updateLocks();

    if (this.checkWin()) return;
    this.broadcastSnapshots();
  }

  private updateMissiles(dt: number) {
    for (const m of this.missiles) {
      const target = m.targetId ? this.players.get(m.targetId) : undefined;
      m.update(dt, target);
      if (m.dead) continue;

      // Missile vs planes (squared distance), never the owner.
      for (const p of this.players.values()) {
        if (!p.alive || p.id === m.ownerId) continue;
        if (m.pos.distanceToSquared(p.pos) <= COLLISION_HIT_MIN_DIST_SQ) {
          const killed = this.damage(p, m.ownerId);
          this.explode(p.pos, killed ? 'plane' : 'missile');
          m.dead = true;
          break;
        }
      }
    }
    // Compact dead missiles.
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      if (this.missiles[i].dead) this.missiles.splice(i, 1);
    }
  }

  /** Apply missile damage. Returns true if the victim was killed by this hit. */
  private damage(victim: Player, attackerId: string): boolean {
    victim.hp -= MISSILE_DAMAGE;
    if (victim.hp > 0) return false;
    const attacker = this.players.get(attackerId);
    victim.kill();
    if (attacker && attacker.id !== victim.id) {
      attacker.kills += 1;
      this.addFeed(`${attacker.name} downed ${victim.name}`);
    } else {
      this.addFeed(`${victim.name} was destroyed`);
    }
    return true;
  }

  private resolvePlaneCollisions() {
    const alive = [...this.players.values()].filter((p) => p.alive && p.spawned);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (!a.alive || !b.alive) continue;
        if (a.pos.distanceToSquared(b.pos) <= COLLISION_HIT_MIN_DIST_SQ) {
          a.kill();
          b.kill();
          this.explode(a.pos, 'plane');
          this.explode(b.pos, 'plane');
          this.addFeed(`${a.name} collided and exploded`);
          this.addFeed(`${b.name} collided and exploded`);
        }
      }
    }
  }

  private updateLocks() {
    for (const p of this.players.values()) {
      if (!p.alive) {
        p.locked = false;
        continue;
      }
      const target = p.targetId ? this.players.get(p.targetId) : undefined;
      if (!target || !target.alive || !target.spawned) {
        p.locked = false;
        continue;
      }
      _toTarget.copy(target.pos).sub(p.pos);
      const len = _toTarget.length();
      p.locked = len > 1e-4 && p.forward().dot(_toTarget.divideScalar(len)) >= MISSILE_LOCK_THRESHOLD;
    }
  }

  /** Closest inbound tracking missile as 0..1 proximity for the warning HUD. */
  private warningFor(playerId: string): number {
    let best = 0;
    for (const m of this.missiles) {
      if (m.targetId !== playerId) continue;
      const p = this.players.get(playerId);
      if (!p) continue;
      const dSq = m.pos.distanceToSquared(p.pos);
      if (dSq <= WARN_RANGE_SQ) {
        const proximity = 1 - Math.sqrt(dSq) / MISSILE_WARN_RANGE;
        if (proximity > best) best = proximity;
      }
    }
    return best;
  }

  private checkWin(): boolean {
    let top: Player | null = null;
    for (const p of this.players.values()) {
      if (p.kills >= WIN_KILL_COUNT && (!top || p.kills > top.kills)) top = p;
    }
    if (!top) return false;
    this.ended = true;
    this.winner = top.name;
    const msg: ServerMessage = { t: 'sessionEnded', leaderboard: this.leaderboard(), winner: this.winner };
    for (const id of this.senders.keys()) this.send(id, msg);
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    return true;
  }

  // ---- output -------------------------------------------------------------

  private leaderboard(): LeaderboardEntry[] {
    return [...this.players.values()]
      .filter((p) => p.spawned)
      .map((p) => ({ id: p.id, name: p.name, kills: p.kills, deaths: p.deaths }))
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  }

  private addFeed(text: string) {
    this.feed.push({ id: this.feedSeq++, text });
    while (this.feed.length > KILL_FEED_LENGTH) this.feed.shift();
  }

  private broadcastSnapshots() {
    const players = [...this.players.values()].filter((p) => p.spawned).map((p) => p.toSnapshot());
    const missiles = this.missiles.map((m) => m.toSnapshot());
    const leaderboard = this.leaderboard();

    for (const p of this.players.values()) {
      if (!p.spawned) continue;
      this.send(p.id, {
        t: 'snapshot',
        players,
        missiles,
        leaderboard,
        feed: this.feed,
        you: {
          hp: Math.max(0, p.hp),
          maxHp: p.maxHp,
          speed: p.speed,
          missiles: p.missiles,
          maxMissiles: p.maxMissiles,
          alive: p.alive,
          respawnIn: p.alive ? 0 : Math.max(0, p.respawnTimer),
          targetId: p.targetId,
          locked: p.locked,
          warning: this.warningFor(p.id),
        },
      });
    }
  }

  private send(id: string, msg: ServerMessage) {
    this.senders.get(id)?.(msg);
  }

  private broadcast(msg: ServerMessage) {
    for (const id of this.senders.keys()) this.send(id, msg);
  }

  /** Tell every client to spawn an explosion effect at a world position. */
  private explode(pos: Vector3, kind: ExplosionKind) {
    this.broadcast({ t: 'explosion', pos: [pos.x, pos.y, pos.z], kind });
  }

  // Used by index.ts when a player picks a loadout.
  enter(player: Player, name: string, aircraft: AircraftType) {
    if (this.ended) return;
    player.enterArena(name, aircraft);
  }
}
