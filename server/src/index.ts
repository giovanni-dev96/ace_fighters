import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './SessionManager';
import type { Session } from './Session';
import type { Player } from './Player';
import { SESSION_ENDED_OR_MISSING, type ClientMessage, type ServerMessage } from '../../shared/protocol';

const PORT = Number(process.env.PORT) || 8080;

const manager = new SessionManager();
const wss = new WebSocketServer({ port: PORT });

console.log(`[ace_fighters] server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  // Per-connection binding to a session/player.
  let session: Session | null = null;
  let player: Player | null = null;

  const send = (msg: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  const leave = () => {
    if (session && player) session.removePlayer(player.id);
    session = null;
    player = null;
  };

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.t) {
      case 'createGame': {
        if (session) leave();
        const created = manager.createSession(send, { bots: msg.bots, difficulty: msg.difficulty });
        session = created.session;
        player = created.player;
        send({ t: 'created', hash: session.hash, selfId: player.id });
        break;
      }

      case 'joinGame': {
        if (session) leave();
        const joined = manager.joinSession(msg.hash, send);
        if (!joined) {
          send({ t: 'error', message: SESSION_ENDED_OR_MISSING });
          break;
        }
        session = joined.session;
        player = joined.player;
        send({ t: 'joined', selfId: player.id, hash: session.hash });
        break;
      }

      case 'setLoadout': {
        if (session && player) session.enter(player, msg.name, msg.aircraft);
        break;
      }

      case 'input': {
        if (session && player) session.setInput(player, msg.input);
        break;
      }

      case 'fire': {
        if (session && player) session.fire(player);
        break;
      }

      case 'switchTarget': {
        if (session && player) session.switchTarget(player);
        break;
      }

      case 'leave': {
        leave();
        break;
      }
    }
  });

  ws.on('close', leave);
  ws.on('error', leave);
});
