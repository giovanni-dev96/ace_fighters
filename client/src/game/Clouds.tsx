import { useMemo } from 'react';
import { Clouds as DreiClouds, Cloud } from '@react-three/drei';
import { MeshBasicMaterial } from 'three';

const CLOUD_COUNT = 26;
const FIELD_RADIUS = 170;

// Deterministic PRNG so cloud placement is stable across reloads.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CloudInstance {
  seed: number;
  pos: [number, number, number];
  bounds: [number, number, number];
  volume: number;
}

// Soft, billboard-based volumetric clouds (drei) instead of hard GLB spheres.
export function CloudField() {
  const instances = useMemo<CloudInstance[]>(() => {
    const rng = mulberry32(1337);
    const out: CloudInstance[] = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const r = FIELD_RADIUS * (0.4 + 0.6 * rng());
      const theta = rng() * Math.PI * 2;
      const y = (rng() - 0.5) * 120;
      out.push({
        seed: i,
        pos: [Math.cos(theta) * r, y, Math.sin(theta) * r],
        bounds: [12 + rng() * 18, 4 + rng() * 4, 12 + rng() * 18],
        volume: 24 + rng() * 36,
      });
    }
    return out;
  }, []);

  return (
    // One shared instancer for every puff; `limit` must exceed total segments.
    <DreiClouds material={MeshBasicMaterial} limit={2000} frustumCulled={false}>
      {instances.map((c) => (
        <Cloud
          key={c.seed}
          seed={c.seed}
          position={c.pos}
          bounds={c.bounds}
          volume={c.volume}
          segments={28}
          color="#eef3fb"
          opacity={0.9}
          fade={260}
          growth={6}
          speed={0.15}
        />
      ))}
    </DreiClouds>
  );
}
