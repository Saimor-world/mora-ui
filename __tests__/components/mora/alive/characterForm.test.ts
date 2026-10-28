import * as THREE from 'three';
import { createLightForm, FORM, surfacePoint } from '@/components/mora/alive/characterForm';

const geometry = createLightForm();
const position = geometry.attributes.position as THREE.BufferAttribute;
const normal = geometry.attributes.normal as THREE.BufferAttribute;
const points = Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i));

describe('MÔRA light body form', () => {
  it('is one closed, finite volume of the intended size', () => {
    expect(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))).toBe(true);
    const box = new THREE.Box3().setFromPoints(points);
    expect(box.max.y).toBeCloseTo(FORM.height, 3);
    expect(box.min.y).toBeCloseTo(-FORM.height, 3);
    // A bean, not a stick: clearly wider than half its height.
    const size = box.getSize(new THREE.Vector3());
    expect(size.x / size.y).toBeGreaterThan(.45);
  });

  it('ends round instead of in a pinched tip', () => {
    // Close to each pole the cross-section shrinks like a circle (radius ∝ √(1-s²)), not linearly to a point.
    for (const pole of [1, -1]) {
      const near = points.filter(p => Math.abs(p.y - pole * FORM.height * Math.cos(.2)) < .01);
      const halfWidth = Math.max(...near.map(p => Math.abs(p.x - near.reduce((a, q) => a + q.x, 0) / near.length)));
      expect(halfWidth).toBeGreaterThan(FORM.width * Math.sin(.2) * .75);
    }
    // Pole normals point straight along the axis: no star-shaped shading at the ends.
    for (let i = 0; i < normal.count; i++) {
      if (Math.abs(position.getY(i)) > FORM.height - 1e-6) expect(Math.abs(normal.getY(i))).toBeCloseTo(1, 5);
    }
  });

  it('sets the eyes on the front surface, facing outwards', () => {
    for (const side of [.08, .5]) {
      const { point, normal: n } = surfacePoint(.55, side);
      expect(point.z).toBeGreaterThan(.2);
      expect(n.z).toBeGreaterThan(.4);
      // The nearest mesh vertex is within one grid step of the computed point.
      const nearest = Math.min(...points.map(p => p.distanceTo(point)));
      expect(nearest).toBeLessThan(.06);
    }
  });
});
