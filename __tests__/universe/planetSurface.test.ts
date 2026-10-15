import { renderPlanetSurface, type PlanetSurfaceOptions, type SurfaceKind } from '@/public/universe/planet-surface-worker';

const options: PlanetSurfaceOptions = { width: 64, kind: 'rock', hue: [196, 116, 72], seed: 27, lit: 0 };

it('draws translucent material inside the sphere and leaves its surroundings transparent', () => {
  const { rgba, width } = renderPlanetSurface(options);
  expect(rgba.length).toBe(width * width * 4);
  expect(rgba[3]).toBe(0);
  for (let y = 8; y < 56; y++) for (let x = 8; x < 56; x++) {
    if (Math.hypot(x - 31.5, y - 31.5) < 24) {
      const alpha = rgba[(y * width + x) * 4 + 3];
      expect(alpha).toBeGreaterThan(120);
      expect(alpha).toBeLessThan(230);
    }
  }
});

it('keeps the material grain stable across redraws and distinct for different seeds', () => {
  const first = renderPlanetSurface(options).rgba;
  expect(renderPlanetSurface(options).rgba).toEqual(first);
  expect(renderPlanetSurface({ ...options, seed: 28 }).rgba).not.toEqual(first);
});

it('lights the actual surface from the requested side', () => {
  const sumSides = (lit: number) => {
    const { rgba, width } = renderPlanetSurface({ ...options, kind: 'gas', lit });
    let left = 0, right = 0;
    for (let y = 10; y < width - 10; y++) for (let x = 10; x < width - 10; x++) {
      const i = (y * width + x) * 4;
      const luminance = rgba[i] + rgba[i + 1] + rgba[i + 2];
      if (x < width / 2) left += luminance; else right += luminance;
    }
    return { left, right };
  };
  const fromRight = sumSides(0), fromLeft = sumSides(Math.PI);
  expect(fromRight.right).toBeGreaterThan(fromRight.left * 1.15);
  expect(fromLeft.left).toBeGreaterThan(fromLeft.right * 1.15);
});

it('retains subtle material differences within the shared finish', () => {
  const kinds: SurfaceKind[] = ['rock', 'gas', 'ocean', 'forest', 'ice', 'marble', 'dune', 'volcanic'];
  const surfaces = kinds.map(kind => renderPlanetSurface({ ...options, kind }).rgba);
  for (let i = 0; i < surfaces.length; i++) for (let j = i + 1; j < surfaces.length; j++) expect(surfaces[i]).not.toEqual(surfaces[j]);
});

it('bounds texture resolution even when a caller supplies an excessive size', () => {
  const result = renderPlanetSurface({ ...options, width: 10000 });
  expect(result.width).toBe(256);
  expect(result.rgba.length).toBe(256 * 256 * 4);
});

it('takes its reflected colour from the environment instead of a fixed white highlight', () => {
  const render = (rgb: number[]) => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < rgba.length; i += 4) rgba.set([...rgb, 255], i);
    return renderPlanetSurface({ ...options, environment: { width: 4, height: 4, rgba, key: 'fixture' } }).rgba;
  };
  const warm = render([190, 95, 40]), cool = render([40, 95, 190]);
  const center = (32 * 64 + 32) * 4;
  expect(warm[center]).toBeGreaterThan(cool[center] + 40);
  expect(cool[center + 2]).toBeGreaterThan(warm[center + 2] + 40);
  expect(warm[center + 3]).toBe(cool[center + 3]);
});

it('uses each planet location to sample the same shared environment', () => {
  const rgba = new Uint8ClampedArray(8 * 4 * 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) rgba.set([x < 4 ? 180 : 25, 90, x < 4 ? 25 : 180, 255], (y * 8 + x) * 4);
  const environment = { width: 8, height: 4, rgba, key: 'fixture' };
  const warm = renderPlanetSurface({ ...options, environment, center: [.1, .5] }).rgba;
  const cool = renderPlanetSurface({ ...options, environment, center: [.9, .5] }).rgba;
  const center = (32 * 64 + 32) * 4;
  expect(warm[center]).toBeGreaterThan(cool[center] + 40);
  expect(cool[center + 2]).toBeGreaterThan(warm[center + 2] + 40);
});
