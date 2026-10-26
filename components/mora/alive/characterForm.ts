import * as THREE from 'three';

export const LIGHT_PALETTE = {
  cream: '#F7E9CB', gold: '#E9B967', mint: '#A9DDC4', jade: '#2E7D68',
  stone: '#367E66', deep: '#092F27', ink: '#071C19',
} as const;

/** Center x, height, half-width, depth: one continuous rounded flame, not a sphere + crest. */
const HEAD = [
  [0, -.07, .015, .015], [.01, .01, .23, .19], [.025, .17, .45, .33],
  [.015, .39, .54, .39], [0, .61, .54, .34], [-.05, .81, .43, .25],
  [-.255, 1.01, .235, .145], [-.27, 1.20, .135, .085],
  [-.13, 1.39, .09, .047], [.105, 1.57, .045, .021], [.43, 1.76, .001, .001],
];
const VEIL = [
  [-.38,.62,.001,.001],[-.55,.80,.07,.035],[-.61,1.02,.14,.05],
  [-.49,1.24,.12,.04],[-.18,1.47,.075,.025],[.43,1.76,.001,.001],
];
const BODY = [
  [0, -.05, .025, .025], [.015, -.18, .10, .065], [.015, -.36, .22, .125],
  [-.055, -.57, .26, .14], [-.23, -.79, .235, .11],
  [-.455, -1.01, .16, .075], [-.72, -1.20, .075, .031], [-.94, -1.36, .001, .001],
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

/** Closed cross-section loft. Depth remains real at every angle, including the head's flame tip. */
export function createLightForm(kind: 'head' | 'body' | 'veil') {
  const rows = kind === 'head' ? HEAD : kind === 'veil' ? VEIL : BODY, rings = 96, sides = 48;
  const positions = new Float32Array((rings + 1) * (sides + 1) * 3);
  const uv = new Float32Array((rings + 1) * (sides + 1) * 2), indices: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const [cx, y, width, depth] = profile(rows, i / rings);
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, n = i * (sides + 1) + j;
      const twist = kind === 'body' ? Math.sin(i / rings * Math.PI) * .26 : 0;
      const x = Math.cos(a) * Math.max(.0005, width), z = Math.sin(a) * Math.max(.0005, depth);
      positions.set([cx + x * Math.cos(twist) - z * Math.sin(twist), y,
        x * Math.sin(twist) + z * Math.cos(twist)], n * 3);
      uv.set([j / sides, i / rings], n * 2);
      if (i < rings && j < sides) {
        const next = n + sides + 1;
        if (kind !== 'body') indices.push(n, next, n + 1, n + 1, next, next + 1);
        else indices.push(n, n + 1, next, n + 1, next + 1, next);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  if(kind==='head'){
    let split=0;while(split<rings&&profile(rows,split/rings)[1]<.86)split++;
    const faceCount=split*sides*6;
    geometry.addGroup(0,faceCount,0);geometry.addGroup(faceCount,indices.length-faceCount,1);
  }
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

export function lightThread(points: number[][], width = .006, opacity = .7, color: string = LIGHT_PALETTE.gold) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 72, width, 6, false),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  mesh.material.userData.lightThread = true;
  mesh.material.userData.restOpacity = opacity;
  return mesh;
}

export function ellipseThread(radiusX: number, radiusZ: number, centerY: number, tilt = .2) {
  const points = Array.from({ length: 101 }, (_, i) => {
    const a = i / 100 * Math.PI * 2;
    return [Math.cos(a) * radiusX, centerY + Math.sin(a) * tilt, Math.sin(a) * radiusZ];
  });
  const group = new THREE.Group();
  group.add(lightThread(points, .003, .40), lightThread(points, .012, .025));
  return group;
}
