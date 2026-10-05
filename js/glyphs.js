// 3D lettering for the Languages hall. The font ships with three.js, and if it can't be fetched the
// hall falls back to the abstract shapes.
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_bold.typeface.json';

export function loadGlyphFont() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 6000);
    new FontLoader().load(FONT_URL, (font) => { clearTimeout(timeout); resolve(font); }, undefined, () => { clearTimeout(timeout); resolve(null); });
  });
}

// extruded letters centred on the origin, at most maxWidth wide
export function glyphGeometry(font, text, maxWidth = 0.64, size = 0.3) {
  const geo = new TextGeometry(text, {
    font, size, depth: size * 0.38, curveSegments: 6, bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.035, bevelSegments: 2,
  });
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  geo.translate(-(min.x + max.x) / 2, -(min.y + max.y) / 2, -(min.z + max.z) / 2);
  const width = max.x - min.x;
  if (width > maxWidth) geo.scale(maxWidth / width, maxWidth / width, maxWidth / width);
  return geo;
}
