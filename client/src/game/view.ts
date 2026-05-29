import { Vector3, Quaternion } from 'three';

// Smoothed transform of the local player's aircraft, written by its Aircraft
// component each frame and read by the chase camera so both stay in sync.
export const selfView = {
  pos: new Vector3(),
  quat: new Quaternion(),
  active: false,
};
