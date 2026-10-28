import * as THREE from 'three';

export const LIGHT_PALETTE = {
  cream: '#F7E9CB', gold: '#E9B967', mint: '#A9DDC4', jade: '#2E7D68',
  stone: '#367E66', deep: '#092F27', ink: '#071C19',
} as const;

/** Half-height, half-width and half-depth of the light body. */
export const FORM = { height: 1.2, width: .6, depth: .48 } as const;

const bump = (s: number, at: number, spread: number) => Math.exp(-(((s - at) / spread) ** 2));

/**
 * The bean as a function of height s (-1 bottom … 1 top) and side k (0 left … 1 right, towards the stone):
 * full lower body, a soft waist only on the stone side, the head leaning towards the stone.
 */
function shape(s: number, k: number) {
  const center = -.09 + .21 * THREE.MathUtils.smoothstep(s, -.6, .95) + .02 * s;
  const fullness = 1 + .07 * bump(s, -.45, .4) - .05 * bump(s, .62, .22);
  const waist = .13 * bump(s, .2, .24) * k;
  return { center, half: FORM.width * (fullness - waist), depth: FORM.depth * (fullness - .04 * bump(s, .2, .3)) };
}

/**
 * Deformed sphere instead of a loft: latitude rings shrink like a circle towards the poles,
 * so both ends stay round (no pinched tips) at every angle and in night rest.
 */
export function createLightForm() {
  const rings = 72, sides = 56;
  const positions = new Float32Array((rings + 1) * (sides + 1) * 3);
  const uv = new Float32Array((rings + 1) * (sides + 1) * 2), indices: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const theta = i / rings * Math.PI, s = -Math.cos(theta), radial = Math.sin(theta);
    for (let j = 0; j <= sides; j++) {
      const phi = j / sides * Math.PI * 2, n = i * (sides + 1) + j;
      const cosPhi = Math.cos(phi), k = THREE.MathUtils.smoothstep(cosPhi, -.35, .35);
      const { center, half, depth } = shape(s, k);
      positions.set([center + cosPhi * half * radial, s * FORM.height, Math.sin(phi) * depth * radial], n * 3);
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
  const normals = geometry.attributes.normal;
  // Seam: average the duplicated first/last column. Poles: one shared normal per pole ring.
  for (let i = 0; i <= rings; i++) {
    const first = i * (sides + 1), last = first + sides;
    const normal = new THREE.Vector3(normals.getX(first) + normals.getX(last),
      normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z); normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  for (const i of [0, rings]) for (let j = 0; j <= sides; j++) normals.setXYZ(i * (sides + 1) + j, 0, i ? 1 : -1, 0);
  geometry.computeBoundingSphere();
  return geometry;
}

/** A point on the front surface (height s, side -1 … 1) plus its outward normal, for eyes. */
export function surfacePoint(s: number, side: number) {
  const radial = Math.sqrt(Math.max(0, 1 - s * s)), k = THREE.MathUtils.smoothstep(side, -.35, .35);
  const { center, half, depth } = shape(s, k);
  const front = Math.sqrt(Math.max(0, 1 - side * side));
  const point = new THREE.Vector3(center + side * half * radial, s * FORM.height, front * depth * radial);
  const normal = new THREE.Vector3(side / half, s / FORM.height * .35, front / depth).normalize();
  return { point, normal };
}
