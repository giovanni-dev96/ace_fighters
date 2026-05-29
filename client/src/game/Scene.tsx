import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useStore } from '../store';
import './assets'; // trigger preloads
import { Background } from './Background';
import { CloudField } from './Clouds';
import { Aircraft } from './Aircraft';
import { Missiles } from './Missiles';
import { Explosions } from './Explosions';
import { ChaseCamera } from './ChaseCamera';
import { TargetWaypoint } from './TargetWaypoint';

function Fleet() {
  const roster = useStore((s) => s.roster);
  const selfId = useStore((s) => s.selfId);
  return (
    <>
      {roster.map((p) => (
        <Aircraft key={p.id} id={p.id} aircraft={p.aircraft} isSelf={p.id === selfId} />
      ))}
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ fov: 70, near: 0.1, far: 5000, position: [0, 5, 15] }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        <Background />
        {/* Atmospheric depth — tune the color to match your background.png horizon. */}
        <fogExp2 attach="fog" args={['#9bb8d3', 0.0016]} />
        <hemisphereLight args={['#bfe3ff', '#20303f', 1.1]} />
        <directionalLight position={[100, 200, 100]} intensity={1.6} />
        <CloudField />
        <Fleet />
        <Missiles />
        <Explosions />
        <TargetWaypoint />
        <ChaseCamera />
        {/* Subtle bloom: only bright pixels (clouds, additive explosions) glow. */}
        <EffectComposer multisampling={1}>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.2}
            mipmapBlur
            radius={0.5}
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
