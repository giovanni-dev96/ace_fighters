import { useEffect, useRef, useState } from 'react';
import { BOUNDARY_WARN_TIME } from '../../../shared/constants';
import { latest } from '../net/state';
import { useStore } from '../store';
import { useGameInput } from '../game/useGameInput';
import { LeaderboardTable } from './Leaderboard';

function SessionBadge() {
  const hash = useStore((s) => s.hash);
  const leave = useStore((s) => s.leave);
  return (
    <div className="session-badge">
      <span className="code">{hash}</span>
      <button className="btn danger" style={{ width: 'auto', margin: 0, padding: '6px 14px' }} onClick={leave}>
        DISCONNECT
      </button>
    </div>
  );
}

function Stats() {
  const you = useStore((s) => s.you);
  if (!you) return null;
  const hpPct = you.maxHp > 0 ? (you.hp / you.maxHp) * 100 : 0;
  return (
    <div className="hud-bottom-left">
      <div className="hud-stat"><span className="k">HP</span>{Math.round(you.hp)} / {you.maxHp}</div>
      <div className="hp-bar"><div className="hp-fill" style={{ width: `${hpPct}%` }} /></div>
      <div className="hud-stat"><span className="k">SPEED</span>{Math.round(you.speed)}</div>
      <div className="hud-stat"><span className="k">MISSILES</span>{you.missiles} / {you.maxMissiles}</div>
    </div>
  );
}

function LockIndicator() {
  const you = useStore((s) => s.you);
  if (!you || !you.alive || !you.targetId) return null;
  return (
    <div
      className={`lock-indicator ${you.locked ? 'locked' : 'unlocked'}`}
      style={{ top: 'calc(50% + 34px)' }}
    >
      {you.locked ? 'LOCKED' : 'NO LOCK'}
    </div>
  );
}

function MissileWarning() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const warn = latest.you?.warning ?? 0;
      if (warn <= 0) {
        setVisible(false);
      } else {
        const freq = 2 + warn * 8; // Hz: faster blink as the missile closes in
        setVisible(Math.sin(performance.now() * 0.001 * freq * Math.PI * 2) > 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!visible) return null;
  return <div className="missile-warning">⚠ WARNING MISSILE LOCK ⚠</div>;
}

function DeathScreen() {
  const you = useStore((s) => s.you);
  if (!you || you.alive) return null;
  return (
    <div className="death-screen">
      <h1>YOU DIED</h1>
      <p>Respawning in {Math.ceil(you.respawnIn)}…</p>
    </div>
  );
}

function OutOfBoundsBanner() {
  const outOfBoundsAt = useStore((s) => s.outOfBoundsAt);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!outOfBoundsAt) return;
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), BOUNDARY_WARN_TIME * 1000);
    return () => clearTimeout(timer.current);
  }, [outOfBoundsAt]);
  if (!visible) return null;
  return <div className="center-banner warn">STAY WITHIN BATTLE AREA</div>;
}

function KillFeed() {
  const feed = useStore((s) => s.feed);
  return (
    <div className="kill-feed">
      {feed.map((f) => (
        <div className="entry" key={f.id}>{f.text}</div>
      ))}
    </div>
  );
}

function LeaderboardOverlay() {
  const show = useStore((s) => s.showLeaderboard);
  const leaderboard = useStore((s) => s.leaderboard);
  if (!show) return null;
  return (
    <div className="leaderboard-wrap">
      <div className="leaderboard">
        <h2>LEADERBOARD</h2>
        <LeaderboardTable entries={leaderboard} />
      </div>
    </div>
  );
}

export function Hud() {
  useGameInput();
  const alive = useStore((s) => s.you?.alive ?? false);
  return (
    <div className="hud">
      <SessionBadge />
      {alive && <div className="crosshair" />}
      <LockIndicator />
      <Stats />
      <MissileWarning />
      <DeathScreen />
      <OutOfBoundsBanner />
      <KillFeed />
      <LeaderboardOverlay />
      <div className="hint" style={{ position: 'absolute', bottom: 8, right: 16 }}>
        WASD pitch/roll · QE yaw · SPACE boost · SHIFT fire · F target · TAB scores
      </div>
    </div>
  );
}
