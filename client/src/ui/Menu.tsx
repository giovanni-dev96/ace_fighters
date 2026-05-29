import { useState } from 'react';
import { AIRCRAFT_LIST, type AircraftType } from '../../../shared/constants';
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
  const createGame = useStore((s) => s.createGame);
  const goJoin = () => useStore.setState({ screen: 'joinInput', error: null });
  return (
    <div className="panel">
      <div className="title">MAIN MENU</div>
      <div className="subtitle">CHOOSE A SESSION</div>
      <button className="btn" onClick={createGame}>NEW GAME</button>
      <button className="btn secondary" onClick={goJoin}>JOIN GAME</button>
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
      {screen === 'joinInput' && <JoinGameScreen />}
      {screen === 'loadout' && <LoadoutScreen />}
    </div>
  );
}
