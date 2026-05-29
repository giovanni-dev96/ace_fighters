import { useEffect, useRef } from 'react';
import type { InputState } from '../../../shared/protocol';
import { sendMessage } from '../net/connection';
import { useStore } from '../store';

const GAME_KEYS = new Set([
  'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE',
  'Space', 'ShiftLeft', 'KeyF', 'Tab',
]);

function computeInput(keys: Set<string>): InputState {
  // Pitch: W = nose down (-1), S = nose up (+1) — inverted, classic flight-sim (GDD §5).
  const pitch = (keys.has('KeyS') ? 1 : 0) + (keys.has('KeyW') ? -1 : 0);
  // Roll: A left (-1), D right (+1).
  const roll = (keys.has('KeyD') ? 1 : 0) + (keys.has('KeyA') ? -1 : 0);
  // Yaw: Q left (-1), E right (+1).
  const yaw = (keys.has('KeyE') ? 1 : 0) + (keys.has('KeyQ') ? -1 : 0);
  return { pitch, roll, yaw, accelerate: keys.has('Space') };
}

function sameInput(a: InputState, b: InputState) {
  return a.pitch === b.pitch && a.roll === b.roll && a.yaw === b.yaw && a.accelerate === b.accelerate;
}

/** Active only while in-game; translates keyboard into server messages. */
export function useGameInput() {
  const lastInput = useRef<InputState>({ pitch: 0, roll: 0, yaw: 0, accelerate: false });

  useEffect(() => {
    const keys = new Set<string>();

    const syncInput = () => {
      const next = computeInput(keys);
      if (!sameInput(next, lastInput.current)) {
        lastInput.current = next;
        sendMessage({ t: 'input', input: next });
      }
    };

    const onDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;

      if (e.code === 'ShiftLeft') {
        sendMessage({ t: 'fire' });
        return;
      }
      if (e.code === 'KeyF') {
        sendMessage({ t: 'switchTarget' });
        return;
      }
      if (e.code === 'Tab') {
        useStore.setState({ showLeaderboard: true });
        return;
      }
      if (keys.has(e.code)) return;
      keys.add(e.code);
      syncInput();
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        useStore.setState({ showLeaderboard: false });
        return;
      }
      if (keys.delete(e.code)) syncInput();
    };

    const onBlur = () => {
      keys.clear();
      syncInput();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      // Stop the plane when leaving the game.
      sendMessage({ t: 'input', input: { pitch: 0, roll: 0, yaw: 0, accelerate: false } });
    };
  }, []);
}
