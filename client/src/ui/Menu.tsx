import { useState } from 'react';
import { AIRCRAFT_LIST, MAX_BOTS, type AircraftType, type BotDifficulty } from '../../../shared/constants';
import { useStore } from '../store';

function ConnectScreen() {
  const connect = useStore((s) => s.connect);
  const conn = useStore((s) => s.conn);
  return (
    <div className="panel">
      <div className="title">ACE FIGHTERS</div>
      <div className="subtitle">MULTIPLAYER DOGFIGHT</div>
      <button className="btn" onClick={connect} disabled={conn === 'connecting'}>
        {conn === 'connecting' ? 'CONNECTING…' : 'CONNECT TO SERVER'}
      </button>
    </div>
  );
}

function MainMenu() {
  const goNew = () => useStore.setState({ screen: 'newGame', error: null });
  const goJoin = () => useStore.setState({ screen: 'joinInput', error: null });
  return (
    <div className="panel">
      <div className="title">MAIN MENU</div>
      <div className="subtitle">CHOOSE A SESSION</div>
      <button className="btn" onClick={goNew}>NEW GAME</button>
      <button className="btn secondary" onClick={goJoin}>JOIN GAME</button>
    </div>
  );
}

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'rookie', label: 'Rookie' },
  { value: 'veteran', label: 'Veteran' },
  { value: 'ace', label: 'Ace' },
];

function NewGameScreen() {
  const createGame = useStore((s) => s.createGame);
  const back = () => useStore.setState({ screen: 'menu', error: null });
  const [bots, setBots] = useState(3);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('veteran');

  return (
    <div className="panel" style={{ minWidth: 420 }}>
      <div className="title">NEW GAME</div>
      <div className="subtitle">SET UP THE ARENA</div>

      <div className="label">Enemy AI — {bots}</div>
      <input
        className="field"
        type="range"
        min={0}
        max={MAX_BOTS}
        step={1}
        value={bots}
        onChange={(e) => setBots(Number(e.target.value))}
      />

      <div className="label">Bot difficulty</div>
      <div className="aircraft-grid">
        {DIFFICULTIES.map((d) => (
          <div
            key={d.value}
            className={`aircraft-card ${difficulty === d.value ? 'selected' : ''}`}
            onClick={() => setDifficulty(d.value)}
          >
            <h3>{d.label}</h3>
          </div>
        ))}
      </div>

      <button className="btn" onClick={() => createGame(bots, difficulty)}>CREATE</button>
      <button className="btn secondary" onClick={back}>BACK</button>
    </div>
  );
}

function JoinGameScreen() {
  const [hash, setHash] = useState('');
  const joinGame = useStore((s) => s.joinGame);
  const back = () => useStore.setState({ screen: 'menu', error: null });
  return (
    <div className="panel">
      <div className="title">JOIN GAME</div>
      <div className="subtitle">ENTER SESSION CODE</div>
      <input
        className="field"
        placeholder="e.g. VIPER-HAWK-37"
        value={hash}
        autoFocus
        onChange={(e) => setHash(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && hash.trim() && joinGame(hash.trim())}
      />
      <button className="btn" disabled={!hash.trim()} onClick={() => joinGame(hash.trim())}>JOIN</button>
      <button className="btn secondary" onClick={back}>BACK</button>
    </div>
  );
}

const MANEUVER_LABEL: Record<string, string> = { low: 'Low', balanced: 'Balanced', high: 'High' };

function LoadoutScreen() {
  const hash = useStore((s) => s.hash);
  const setLoadout = useStore((s) => s.setLoadout);
  const [name, setName] = useState('');
  const [aircraft, setAircraft] = useState<AircraftType>('f16');

  return (
    <div className="panel" style={{ minWidth: 480 }}>
      <div className="title">LOADOUT</div>
      {hash && (
        <>
          <div className="label">SESSION CODE — SHARE TO INVITE</div>
          <div className="hash-display">{hash}</div>
        </>
      )}
      <div className="label">Pilot name</div>
      <input
        className="field"
        placeholder="Callsign"
        maxLength={16}
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      <div className="label">Aircraft</div>
      <div className="aircraft-grid">
        {AIRCRAFT_LIST.map((a) => (
          <div
            key={a.type}
            className={`aircraft-card ${aircraft === a.type ? 'selected' : ''}`}
            onClick={() => setAircraft(a.type)}
          >
            <h3>{a.displayName}</h3>
            <div className="stat"><span>Maneuver</span><b>{MANEUVER_LABEL[a.maneuverability]}</b></div>
            <div className="stat"><span>HP</span><b>{a.hp}</b></div>
            <div className="stat"><span>Missiles</span><b>{a.maxMissiles}</b></div>
          </div>
        ))}
      </div>
      <button className="btn" onClick={() => setLoadout(name.trim() || 'Pilot', aircraft)}>ENTER BATTLE</button>
    </div>
  );
}

export function Menu() {
  const screen = useStore((s) => s.screen);
  return (
    <div className="overlay menu">
      {screen === 'connect' && <ConnectScreen />}
      {screen === 'menu' && <MainMenu />}
      {screen === 'newGame' && <NewGameScreen />}
      {screen === 'joinInput' && <JoinGameScreen />}
      {screen === 'loadout' && <LoadoutScreen />}
    </div>
  );
}
