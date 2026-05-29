import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, Color } from 'three';
import { latest } from '../net/state';

const GREEN = new Color('#54ff8a');
const RED = new Color('#ff4d4d');

// Small diamond marking the locked/unlocked target (GDD §7).
export function TargetWaypoint() {
  const ref = useRef<Mesh>(null);

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const you = latest.you;
    const targetId = you?.targetId ?? null;
    const target = targetId ? latest.players.get(targetId) : undefined;
    if (!you || !target || !target.alive) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(target.pos[0], target.pos[1] + 1.8, target.pos[2]);
    m.rotation.y += dt * 1.5;
    (m.material as MeshBasicMaterial).color.copy(you.locked ? GREEN : RED);
  });

  return (
    <mesh ref={ref} visible={false}>
      <octahedronGeometry args={[0.7, 0]} />
      <meshBasicMaterial wireframe transparent opacity={0.9} />
    </mesh>
  );
}
