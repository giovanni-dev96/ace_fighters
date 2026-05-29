import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Clone, useGLTF, Trail } from '@react-three/drei';
import { Group, Vector3, Quaternion } from 'three';
import { useStore } from '../store';
import { latest } from '../net/state';
import { MISSILE_URL } from './assets';

const _pos = new Vector3();
const _quat = new Quaternion();

function MissileView({ id }: { id: string }) {
  const ref = useRef<Group>(null);
  const init = useRef(false);
  const { scene } = useGLTF(MISSILE_URL);

  // Spawn position at mount, so drei's <Trail> primes its history buffer here
  // instead of at the world origin (otherwise it whips a streak from (0,0,0)).
  const spawnPos = useMemo<[number, number, number]>(() => {
    const s = latest.missiles.get(id);
    return s ? [s.pos[0], s.pos[1], s.pos[2]] : [0, 0, 0];
  }, [id]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const snap = latest.missiles.get(id);
    if (!snap) {
      g.visible = false;
      return;
    }
    g.visible = true;
    _pos.set(snap.pos[0], snap.pos[1], snap.pos[2]);
    _quat.set(snap.quat[0], snap.quat[1], snap.quat[2], snap.quat[3]);
    if (!init.current) {
      g.position.copy(_pos);
      g.quaternion.copy(_quat);
      init.current = true;
    } else {
      const a = 1 - Math.exp(-18 * dt);
      g.position.lerp(_pos, a);
      g.quaternion.slerp(_quat, a);
    }
  });

  return (
    <Trail width={1.4} length={6} color="#ffd27f" attenuation={(t) => t * t} decay={1.4}>
      <group ref={ref} position={spawnPos}>
        <Clone object={scene} />
      </group>
    </Trail>
  );
}

export function Missiles() {
  const missileIds = useStore((s) => s.missileIds);
  return (
    <>
      {missileIds.map((id) => (
        <MissileView key={id} id={id} />
      ))}
    </>
  );
}
