import * as THREE from 'three';

export const LIGHT_PALETTE = {
  cream: '#F7E9CB', gold: '#E9B967', mint: '#A9DDC4', jade: '#2E7D68',
  stone: '#367E66', deep: '#092F27', ink: '#071C19',
} as const;

/** Center x, height, half-width, depth: one smooth asymmetrical light body. */
const PRESENCE = [
  [-.06, -1.18, .001, .001], [-.12, -1.08, .20, .16],
  [-.18, -.84, .35, .26], [-.18, -.48, .43, .31],
  [-.12, -.10, .41, .30], [-.04, .27, .34, .27],
  [.03, .60, .34, .27], [.05, .90, .30, .24],
  [.02, 1.12, .19, .16], [-.02, 1.22, .001, .001],
];

function cubic(a: number, b: number, c: number, d: number, t: number) {
  return .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t
    + (-a + 3 * b - 3 * c + d) * t * t * t);
}
function profile(rows: number[][], t: number) {
  const scaled = Math.min(.999999, t) * (rows.length - 1), i = Math.floor(scaled), f = scaled - i;
  return [0, 1, 2, 3].map(k => cubic(rows[Math.max(0, i - 1)][k], rows[i][k],
    rows[Math.min(rows.length - 1, i + 1)][k], rows[Math.min(rows.length - 1, i + 2)][k], f));
}

/** Reuses the existing loft builder for a continuous, softly tapered volume. */
export function createLightForm() {
  const rows = PRESENCE, rings = 64, sides = 40;
  const positions = new Float32Array((rings + 1) * (sides + 1) * 3);
  const uv = new Float32Array((rings + 1) * (sides + 1) * 2), indices: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const [cx, y, width, depth] = profile(rows, i / rings);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, n = i * (sides + 1) + j;
      const x = Math.cos(a) * Math.max(.0005, width), z = Math.sin(a) * Math.max(.0005, depth);
      positions.set([cx + x, y, z], n * 3);
      uv.set([j / sides, i / rings], n * 2);
      if (i < rings && j < sides) {
        const next = n + sides + 1;
        indices.push(n, next, n + 1, n + 1, next, next + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  // Match the two seam normals instead of leaving a visible lighting seam on the face.
  const normals = geometry.attributes.normal;
  for (let i = 0; i <= rings; i++) {
    const first = i * (sides + 1), last = first + sides;
    const normal = new THREE.Vector3(normals.getX(first) + normals.getX(last),
      normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z); normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  geometry.computeBoundingSphere();
  return geometry;
}

