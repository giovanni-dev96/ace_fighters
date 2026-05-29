import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Matrix4, Quaternion } from 'three';
import { CAMERA_OFFSET, CAMERA_LOOK_AHEAD } from '../../../shared/constants';
import { selfView } from './view';

const _desired = new Vector3();
const _offset = new Vector3();
const _lookAt = new Vector3();
const _fwd = new Vector3();
const _up = new Vector3();
const _m = new Matrix4();
const _q = new Quaternion();
const FORWARD = new Vector3(0, 0, -1);
const UP = new Vector3(0, 1, 0);

export function ChaseCamera() {
  const { camera } = useThree();

  useFrame((_, dt) => {
    if (!selfView.active) return;
    const a = 1 - Math.exp(-10 * dt);

    // Desired camera position: offset behind/above, rotated into the plane's frame.
    _offset.set(CAMERA_OFFSET[0], CAMERA_OFFSET[1], CAMERA_OFFSET[2]).applyQuaternion(selfView.quat);
    _desired.copy(selfView.pos).add(_offset);
    camera.position.lerp(_desired, a);

    // Orient using the plane's own up vector (not world up) so the camera rolls and
    // stays inverted with the aircraft instead of flipping past vertical pitch.
    _fwd.copy(FORWARD).applyQuaternion(selfView.quat);
    _up.copy(UP).applyQuaternion(selfView.quat);
    _lookAt.copy(selfView.pos).addScaledVector(_fwd, CAMERA_LOOK_AHEAD);
    _m.lookAt(camera.position, _lookAt, _up);
    _q.setFromRotationMatrix(_m);
    camera.quaternion.slerp(_q, a);
  });

  return null;
}
