import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  Mesh,
  Points,
  PointLight,
  MeshBasicMaterial,
  PointsMaterial,
} from 'three';
import { useStore, type ExplosionFx } from '../store';

const CFG = {
  missile: { radius: 1.6, sparks: 16, sparkSpeed: 16, light: 30, dist: 30, dur: 0.5, size: 0.5 },
  plane: { radius: 3.4, sparks: 30, sparkSpeed: 28, light: 70, dist: 60, dur: 0.75, size: 0.9 },
} as const;

const HOT = new Color('#fff3c0');
const COOL = new Color('#ff5a1e');

function Explosion({ fx }: { fx: ExplosionFx }) {
  const cfg = CFG[fx.kind];
  const remove = useStore((s) => s.removeExplosion);
  const ball = useRef<Mesh>(null);
  const pts = useRef<Points>(null);
  const light = useRef<PointLight>(null);
  const start = useRef(-1);
  const done = useRef(false);

  // One outward velocity per spark, fixed for this explosion's lifetime.
  const { geometry, dirs } = useMemo(() => {
    const dirs = new Float32Array(cfg.sparks * 3);
    for (let i = 0; i < cfg.sparks; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const sp = cfg.sparkSpeed * (0.6 + 0.4 * Math.random());
      const sinPhi = Math.sin(phi);
      dirs[i * 3] = sinPhi * Math.cos(theta) * sp;
      dirs[i * 3 + 1] = Math.cos(phi) * sp;
      dirs[i * 3 + 2] = sinPhi * Math.sin(theta) * sp;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(cfg.sparks * 3), 3));
    return { geometry, dirs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx.id]);

  useFrame((state) => {
    if (start.current < 0) start.current = state.clock.elapsedTime;
    const t = (state.clock.elapsedTime - start.current) / cfg.dur; // 0..1
    if (t >= 1) {
      if (!done.current) {
        done.current = true;
        remove(fx.id);
      }
      return;
    }

    // Fireball: expands quickly, fades, cools from white-hot to orange.
    if (ball.current) {
      ball.current.scale.setScalar(Math.max(0.001, cfg.radius * Math.min(1, t * 3)));
      const mat = ball.current.material as MeshBasicMaterial;
      mat.opacity = Math.pow(1 - t, 1.6);
      mat.color.copy(HOT).lerp(COOL, Math.min(1, t * 1.5));
    }

    // Sparks: fly outward, slow with drag, droop slightly under gravity.
    if (pts.current) {
      const attr = pts.current.geometry.getAttribute('position');
      const arr = attr.array as Float32Array;
      const elapsed = t * cfg.dur;
      const drag = 1 - 0.6 * t;
      const grav = 6 * elapsed * elapsed;
      for (let i = 0; i < cfg.sparks; i++) {
        arr[i * 3] = dirs[i * 3] * elapsed * drag;
        arr[i * 3 + 1] = dirs[i * 3 + 1] * elapsed * drag - grav;
        arr[i * 3 + 2] = dirs[i * 3 + 2] * elapsed * drag;
      }
      attr.needsUpdate = true;
      (pts.current.material as PointsMaterial).opacity = Math.pow(1 - t, 1.4);
    }

    // Light flash: bright spike that decays fast.
    if (light.current) light.current.intensity = cfg.light * Math.pow(1 - t, 2);
  });

  return (
    <group position={fx.pos}>
      <mesh ref={ball}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={HOT}
          transparent
          opacity={1}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points ref={pts} geometry={geometry}>
        <pointsMaterial
          size={cfg.size}
          color="#ffcf6b"
          transparent
          opacity={1}
          blending={AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
      <pointLight ref={light} color="#ffb060" intensity={cfg.light} distance={cfg.dist} decay={2} />
    </group>
  );
}

export function Explosions() {
  const explosions = useStore((s) => s.explosions);
  return (
    <>
      {explosions.map((fx) => (
        <Explosion key={fx.id} fx={fx} />
      ))}
    </>
  );
}
