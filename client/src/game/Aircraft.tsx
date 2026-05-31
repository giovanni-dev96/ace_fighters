import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Clone, Html, useGLTF } from '@react-three/drei';
import { Group, Vector3, Quaternion, MathUtils } from 'three';
import type { AircraftType } from '../../../shared/constants';
import { AIRCRAFT_URL } from './assets';
import { latest } from '../net/state';
import { selfView } from './view';

const LERP_RATE = 14; // higher = snappier follow of server transforms
const BANK_GAIN = 0.35;
const PITCH_GAIN = 0.6;

const _targetPos = new Vector3();
const _targetQuat = new Quaternion();
const _fwd = new Vector3();
const _prevFwd = new Vector3();
const FORWARD = new Vector3(0, 0, -1);

export function Aircraft({ id, aircraft, isSelf }: { id: string; aircraft: AircraftType; isSelf: boolean }) {
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const prevFwd = useRef(new Vector3(0, 0, -1));
  const initialized = useRef(false);
  const { scene } = useGLTF(AIRCRAFT_URL[aircraft]);

  useFrame((_, dt) => {
    const o = outer.current;
    const inr = inner.current;
    if (!o || !inr) return;
    const snap = latest.players.get(id);
    if (!snap) {
      o.visible = false;
      return;
    }

    o.visible = snap.alive; // hidden while dead (GDD §11)

    _targetPos.set(snap.pos[0], snap.pos[1], snap.pos[2]);
    _targetQuat.set(snap.quat[0], snap.quat[1], snap.quat[2], snap.quat[3]);

    if (!initialized.current) {
      o.position.copy(_targetPos);
      o.quaternion.copy(_targetQuat);
      initialized.current = true;
    } else {
      const a = 1 - Math.exp(-LERP_RATE * dt);
      o.position.lerp(_targetPos, a);
      o.quaternion.slerp(_targetQuat, a);
    }

    // Cosmetic banking: roll into horizontal turns, lean with vertical changes.
    _fwd.copy(FORWARD).applyQuaternion(o.quaternion);
    _prevFwd.copy(prevFwd.current);
    const yawRate = _prevFwd.x * _fwd.z - _prevFwd.z * _fwd.x; // y-component of cross(prev, cur)
    const pitchRate = _fwd.y - _prevFwd.y;
    prevFwd.current.copy(_fwd);
    const targetRoll = MathUtils.clamp((-yawRate / Math.max(dt, 1e-3)) * BANK_GAIN, -0.7, 0.7);
    const targetPitch = MathUtils.clamp((pitchRate / Math.max(dt, 1e-3)) * PITCH_GAIN, -0.4, 0.4);
    const b = 1 - Math.exp(-8 * dt);
    inr.rotation.z = MathUtils.lerp(inr.rotation.z, targetRoll, b);
    inr.rotation.x = MathUtils.lerp(inr.rotation.x, targetPitch, b);

    if (isSelf) {
      selfView.pos.copy(o.position);
      selfView.quat.copy(o.quaternion);
      selfView.active = snap.alive;
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <Clone object={scene} />
      </group>
      {!isSelf && (
        <Html position={[0, 1.6, 0]} center distanceFactor={40} pointerEvents="none" zIndexRange={[10, 0]}>
          <div className="nameplate">{nameOf(id)}</div>
        </Html>
      )}
    </group>
  );
}

function nameOf(id: string): string {
  return latest.players.get(id)?.name ?? '';
}
