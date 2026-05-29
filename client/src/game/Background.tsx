import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { TextureLoader, EquirectangularReflectionMapping, SRGBColorSpace, Color } from 'three';
import { BACKGROUND_URL } from './assets';

const FALLBACK = new Color('#0a1626');

// Loads the equirectangular sky. If background.png is missing (404) we keep a
// flat clear color instead of crashing — the PNG can be dropped in any time.
export function Background() {
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    scene.background = FALLBACK;
    let disposed = false;
    new TextureLoader().load(
      BACKGROUND_URL,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.mapping = EquirectangularReflectionMapping;
        texture.colorSpace = SRGBColorSpace;
        scene.background = texture;
        scene.environment = texture;
      },
      undefined,
      () => {
        // Missing/failed texture -> stay on the fallback color.
        console.info('[ace_fighters] background.png not found; using fallback sky color');
      },
    );
    return () => {
      disposed = true;
    };
  }, [scene]);

  return null;
}
