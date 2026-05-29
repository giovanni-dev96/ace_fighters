import { useStore } from '../store';
import { LeaderboardTable } from './Leaderboard';

export function EndGame() {
  const leaderboard = useStore((s) => s.leaderboard);
  const winner = useStore((s) => s.winner);
  const leave = useStore((s) => s.leave);
  return (
    <div className="leaderboard-wrap solid">
      <div className="leaderboard">
        <h2>MATCH OVER</h2>
        {winner && <div className="winner-line">🏆 {winner} wins!</div>}
        <LeaderboardTable entries={leaderboard} />
        <button className="btn" style={{ marginTop: 20 }} onClick={leave}>
          DISCONNECT
        </button>
        <div className="hint">Start a new session to play again.</div>
      </div>
    </div>
  );
}
