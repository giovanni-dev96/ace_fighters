import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { MISSILE_WARN_RANGE } from '../../../shared/constants';
import { latest } from '../net/state';
import { useStore } from '../store';
import { selfView } from './view';

// Plenty of headroom over the realistic number of trackers inbound at once.
const MAX_THREAT_LINES = 12;
const THREAT_COLOR = '#ff4d4d';
const LINE_RADIUS = 0.05; // thickness of the red threat line (world units)
const INNER_RADIUS = 1; // line start: 1 unit from the plane (plane fits a 1-unit sphere)

const UP = new Vector3(0, 1, 0);
const _dir = new Vector3();
const _mid = new Vector3();
const _missilePos = new Vector3();

// One red line per incoming (locked-on) missile, anchored at the local player's plane and
// pointing toward the missile. Length grows with distance: from radius 1 (distance 0) out to
// radius 2 at max threat range (MISSILE_WARN_RANGE). See sketch.png.
//
// Each line is a thin cylinder (unit height along +Y) whose position/orientation/scale we set
// imperatively every frame, so it is always pinned to the plane's current world position.
export function MissileThreatLines() {
  const refs = useRef<(Mesh | null)[]>([]);

  useFrame(() => {
    const meshes = refs.current;
    const selfId = useStore.getState().selfId;

    if (!selfView.active || !selfId) {
      for (const m of meshes) if (m) m.visible = false;
      return;
    }

    let used = 0;
    for (const missile of latest.missiles.values()) {
      if (missile.targetId !== selfId) continue;
      _missilePos.set(missile.pos[0], missile.pos[1], missile.pos[2]);
      _dir.copy(_missilePos).sub(selfView.pos);
      const dist = _dir.length();
      if (dist > MISSILE_WARN_RANGE || dist < 1e-4) continue;

      _dir.divideScalar(dist); // normalize
      const length = Math.min(dist / MISSILE_WARN_RANGE, 1); // 0..1, proportional to distance
      if (length < 1e-3) continue; // zero-length line — nothing to draw

      const mesh = meshes[used];
      if (mesh) {
        // Cylinder spans radius INNER_RADIUS → INNER_RADIUS+length along _dir from the plane.
        _mid.copy(selfView.pos).addScaledVector(_dir, INNER_RADIUS + length / 2);
        mesh.position.copy(_mid);
        mesh.quaternion.setFromUnitVectors(UP, _dir);
        mesh.scale.set(1, length, 1); // unit-height geometry stretched to the line length
        mesh.visible = true;
      }
      if (++used >= MAX_THREAT_LINES) break;
    }

    for (let i = used; i < meshes.length; i++) {
      const m = meshes[i];
      if (m) m.visible = false;
    }
  });

  return (
    <>
      {Array.from({ length: MAX_THREAT_LINES }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
          renderOrder={999}
          frustumCulled={false}
        >
          <cylinderGeometry args={[LINE_RADIUS, LINE_RADIUS, 1, 6]} />
          {/* Always-on-top, full-bright red so the indicator reads through the plane mesh. */}
          <meshBasicMaterial color={THREAT_COLOR} depthTest={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
