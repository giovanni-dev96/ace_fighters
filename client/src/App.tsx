import { useStore } from './store';
import { Scene } from './game/Scene';
import { Menu } from './ui/Menu';
import { Hud } from './ui/Hud';
import { EndGame } from './ui/EndGame';
import { ErrorToast } from './ui/ErrorToast';
import './ui/ui.css';

export default function App() {
  const screen = useStore((s) => s.screen);
  const inGame = screen === 'ingame';
  const ended = screen === 'ended';

  return (
    <>
      {/* The 3D scene is mounted only while flying; ending a match removes all aircraft. */}
      {inGame && <Scene />}
      {inGame && <Hud />}
      {ended && <EndGame />}
      {!inGame && !ended && <Menu />}
      <ErrorToast />
    </>
  );
}
