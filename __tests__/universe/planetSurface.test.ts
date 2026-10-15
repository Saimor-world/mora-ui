import { renderPlanetSurface, type PlanetSurfaceOptions, type SurfaceKind } from '@/public/universe/planet-surface-worker';

const options: PlanetSurfaceOptions = { width: 64, kind: 'rock', hue: [196, 116, 72], seed: 27, lit: 0 };

it('draws opaque ground inside the sphere and leaves its surroundings transparent', () => {
  const { rgba, width } = renderPlanetSurface(options);
  expect(rgba.length).toBe(width * width * 4);
  expect(rgba[3]).toBe(0);
  for (let y = 8; y < 56; y++) for (let x = 8; x < 56; x++) {
    if (Math.hypot(x - 31.5, y - 31.5) < 24) expect(rgba[(y * width + x) * 4 + 3]).toBe(255);
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
