import type { ClientMessage, ServerMessage } from '../../../shared/protocol';
import { useStore, type PlayerMeta } from '../store';
import { latest, resetLatest } from './state';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? `ws://${location.hostname}:8080`;

let ws: WebSocket | null = null;

export function connectSocket() {
  if (ws) return;
  ws = new WebSocket(SERVER_URL);
  ws.onopen = () => useStore.setState({ conn: 'connected', screen: 'menu' });
  ws.onmessage = (ev) => {
    try {
      handleMessage(JSON.parse(ev.data) as ServerMessage);
    } catch {
      /* ignore malformed */
    }
  };
  ws.onclose = handleClose;
  ws.onerror = () => ws?.close();
}

export function sendMessage(msg: ClientMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function closeSocket() {
  ws?.close();
}

function handleClose() {
  ws = null;
  resetLatest();
  useStore.setState({
    conn: 'disconnected',
    screen: 'connect',
    hash: null,
    selfId: null,
    roster: [],
    missileIds: [],
    you: null,
    leaderboard: [],
    feed: [],
    winner: null,
    explosions: [],
  });
}

// --- roster diffing: only update React state when membership actually changes ---
let rosterKey = '';
let missileKey = '';

function handleMessage(msg: ServerMessage) {
  switch (msg.t) {
    case 'created':
      useStore.setState({ hash: msg.hash, selfId: msg.selfId, screen: 'loadout', error: null });
      break;

    case 'joined':
      useStore.setState({ hash: msg.hash, selfId: msg.selfId, screen: 'loadout', error: null });
      break;

    case 'error':
      useStore.setState({ error: msg.message });
      break;

    case 'snapshot': {
      latest.players.clear();
      for (const p of msg.players) latest.players.set(p.id, p);
      latest.missiles.clear();
      for (const m of msg.missiles) latest.missiles.set(m.id, m);
      latest.you = msg.you;

      const nextRoster: PlayerMeta[] = msg.players.map((p) => ({ id: p.id, name: p.name, aircraft: p.aircraft }));
      const nextRosterKey = nextRoster.map((p) => `${p.id}:${p.name}:${p.aircraft}`).join('|');
      const nextMissileKey = msg.missiles.map((m) => m.id).join('|');

      const patch: Partial<ReturnType<typeof useStore.getState>> = {
        you: msg.you,
        leaderboard: msg.leaderboard,
        feed: msg.feed,
      };
      if (nextRosterKey !== rosterKey) {
        rosterKey = nextRosterKey;
        patch.roster = nextRoster;
      }
      if (nextMissileKey !== missileKey) {
        missileKey = nextMissileKey;
        patch.missileIds = msg.missiles.map((m) => m.id);
      }
      useStore.setState(patch);
      break;
    }

    case 'event':
      if (msg.kind === 'outOfBounds') useStore.setState({ outOfBoundsAt: Date.now() });
      break;

    case 'explosion':
      useStore.getState().addExplosion(msg.pos, msg.kind);
      break;

    case 'sessionEnded':
      useStore.setState({ screen: 'ended', leaderboard: msg.leaderboard, winner: msg.winner });
      break;
  }
}
