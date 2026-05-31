import { Session } from './Session';
import { generateHash } from './util';
import type { Player } from './Player';
import type { ServerMessage } from '../../shared/protocol';
import { DEFAULT_BOT_DIFFICULTY, type BotDifficulty } from '../../shared/constants';

type Send = (msg: ServerMessage) => void;

export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  createSession(
    send: Send,
    opts?: { bots?: number; difficulty?: BotDifficulty },
  ): { session: Session; player: Player } {
    let hash = generateHash();
    while (this.sessions.has(hash)) hash = generateHash();
    const session = new Session(hash, (h) => this.sessions.delete(h));
    this.sessions.set(hash, session);
    const player = session.addPlayer(send);
    if (opts?.bots) session.spawnBots(opts.bots, opts.difficulty ?? DEFAULT_BOT_DIFFICULTY);
    return { session, player };
  }

  /** Join an existing, still-open session. Returns null if missing or ended. */
  joinSession(hash: string, send: Send): { session: Session; player: Player } | null {
    const session = this.sessions.get(hash.trim().toUpperCase());
    if (!session || session.ended) return null;
    const player = session.addPlayer(send);
    return { session, player };
  }
}
