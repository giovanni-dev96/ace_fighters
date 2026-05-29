import { useGLTF } from '@react-three/drei';
import type { AircraftType } from '../../../shared/constants';

export const AIRCRAFT_URL: Record<AircraftType, string> = {
  su30: '/aircraft/su30.glb',
  f16: '/aircraft/f16.glb',
  f15: '/aircraft/f15.glb',
};

export const MISSILE_URL = '/missile.glb';
export const BACKGROUND_URL = '/background.png';

// Preload everything so entering the arena doesn't stutter.
// (Clouds are now drei billboards, not GLBs — no model preload needed.)
useGLTF.preload(AIRCRAFT_URL.su30);
useGLTF.preload(AIRCRAFT_URL.f16);
useGLTF.preload(AIRCRAFT_URL.f15);
useGLTF.preload(MISSILE_URL);
