import type { LeaderboardEntry } from '../../../shared/protocol';
import { useStore } from '../store';

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const selfId = useStore((s) => s.selfId);
  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Pilot</th>
          <th className="num">Kills</th>
          <th className="num">Deaths</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={e.id} className={e.id === selfId ? 'self' : ''}>
            <td>{i + 1}</td>
            <td>{e.name}</td>
            <td className="num">{e.kills}</td>
            <td className="num">{e.deaths}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
