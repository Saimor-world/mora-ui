/* Shared by the browser worker and renderer tests. No DOM, network or animation loop. */
'use strict';

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * clamp(t));
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash(x, y, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const sx = smooth(0, 1, x - ix), sy = smooth(0, 1, y - iy), sz = smooth(0, 1, z - iz);
  const lerp = (a, b, t) => a + (b - a) * t;
  const row = dz => lerp(
    lerp(hash(ix, iy, iz + dz, seed), hash(ix + 1, iy, iz + dz, seed), sx),
    lerp(hash(ix, iy + 1, iz + dz, seed), hash(ix + 1, iy + 1, iz + dz, seed), sx), sy);
  return lerp(row(0), row(1), sz);
}
function fbm(x, y, z, seed, octaves = 4) {
  let sum = 0, weight = 0, amplitude = 1;
  for (let octave = 0; octave < octaves; octave++) {
    sum += noise(x, y, z, seed + octave * 37) * amplitude;
    weight += amplitude; amplitude *= .5;
    x = x * 2.03 + 13.1; y = y * 2.03 + 7.7; z = z * 2.03 + 19.3;
  }
  return sum / weight;
}

/** Bilinear sampling of the shared nebula/ambient lighting probe. */
function environmentColor(environment, x, y, fallback) {
  if (!environment) return fallback;
  const px = clamp(x) * (environment.width - 1), py = clamp(y) * (environment.height - 1);
  const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(x0 + 1, environment.width - 1), y1 = Math.min(y0 + 1, environment.height - 1);
  const tx = px - x0, ty = py - y0, data = environment.rgba;
  return [0, 1, 2].map(c => {
    const a = data[(y0 * environment.width + x0) * 4 + c] * (1 - tx) + data[(y0 * environment.width + x1) * 4 + c] * tx;
    const b = data[(y1 * environment.width + x0) * 4 + c] * (1 - tx) + data[(y1 * environment.width + x1) * 4 + c] * tx;
    return a * (1 - ty) + b * ty;
  });
}

/** Environment-lit mineral: transmitted nebula, layered inclusions and broad coloured reflections. */
function renderPlanetSurface({ width: requestedWidth, kind = 'rock', hue = [160, 140, 120], seed = 1, lit = -2.2, quiet = false, environment, center = [.5, .5], radius: screenRadius = [.05, .075] }) {
  const width = Math.round(clamp(Number(requestedWidth) || 96, 16, 256));
  const count = width * width, rgba = new Uint8ClampedArray(count * 4);
  const heights = new Float32Array(count), albedo = new Float32Array(count), folds = new Float32Array(count);
  const radius = width / 2;
  const base = blend(hue, [147, 163, 158], quiet ? .64 : .50);
  const character = { rock: .50, gas: .36, ocean: .39, forest: .46, ice: .33, marble: .52, dune: .44, volcanic: .54 }[kind] || .44;
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5 - radius) / radius, v = (y + .5 - radius) / radius, q = u * u + v * v;
    if (q >= 1) continue;
    const z = Math.sqrt(1 - q), index = y * width + x;
    const body = fbm(u * 3.2 + 4, v * 3.2 + 9, z * 3.2 + 2, seed, 4);
    const grain = fbm(u * 43 + 7, v * 43 + 3, z * 43 + 11, seed + 91, 2);
    // Warped strata vary in width and break up, rather than drawing regular bands.
    const strata = fbm(u * 7 + body * 3, v * 11 + body * 4, z * 6, seed + 51, 3);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 1.7 + v * 2.6 + z) * 4 + body * 18 + strata * 4)), 12);
    const feature = (strata - .5) * character + vein * (kind === 'marble' ? .18 : .11);
    const variation = (body - .5) * character + (grain - .5) * .09 + feature;
    albedo[index] = 1 + variation;
    folds[index] = vein;
    heights[index] = body * .065 + strata * .027 + grain * .012 + vein * .004;
  }
  const length = Math.hypot(Math.cos(lit), Math.sin(lit), .75);
  const lx = Math.cos(lit) / length, ly = Math.sin(lit) / length, lz = .75 / length;
  const halfLength = Math.hypot(lx, ly, lz + 1);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5 - radius) / radius, v = (y + .5 - radius) / radius, q = u * u + v * v;
    if (q >= 1) continue;
    const z = Math.sqrt(1 - q), index = y * width + x, offset = index * 4;
    const neighbour = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= width) return heights[index];
      const nu = (nx + .5 - radius) / radius, nv = (ny + .5 - radius) / radius;
      return nu * nu + nv * nv < 1 ? heights[ny * width + nx] : heights[index];
    };
    const dx = (neighbour(x + 1, y) - neighbour(x - 1, y)) * width * .25;
    const dy = (neighbour(x, y + 1) - neighbour(x, y - 1)) * width * .25;
    const nx = u - dx * .14 * z, ny = v - dy * .14 * z, nz = z;
    const nl = Math.hypot(nx, ny, nz);
    const diffuse = smooth(-.45, 1, (nx * lx + ny * ly + nz * lz) / nl);
    const lighting = (.36 + .78 * diffuse) * (.88 + .12 * z);
    const reflection = Math.max(0, (nx * lx + ny * ly + nz * (lz + 1)) / nl / halfLength);
    const polish = Math.pow(reflection, 28) * .060 * (quiet ? .78 : 1);
    const fresnel = .14 + .72 * Math.pow(1 - z, 1.6);
    const transmitted = environmentColor(environment, center[0] + (u * (.66 + .20 * z) + dx * .25) * screenRadius[0], center[1] + (v * (.66 + .20 * z) + dy * .25) * screenRadius[1], base);
    const reflected = environmentColor(environment, center[0] + nx / nl * .47, center[1] + ny / nl * .47, [216, 217, 203]);
    const local = environmentColor(environment, center[0] + u * screenRadius[0], center[1] + v * screenRadius[1], base);
    // The probe supplies incident colour, not an already-shadowed surface colour.
    // Lift that radiance before shading the body so dark nebula patches do not shade it twice.
    const mineral = blend(base, local.map(c => c * .9 + 65), environment ? .52 : 0);
    const rim = Math.pow(1 - z, 5) * (.045 + .12 * Math.max(0, u * lx + v * ly));
    for (let channel = 0; channel < 3; channel++) {
      const body = mineral[channel] * albedo[index] * lighting;
      const transmission = transmitted[channel] * (.88 + .12 * albedo[index]);
      const deep = body * .84 + transmission * .16;
      rgba[offset + channel] = clamp(deep * (1 - fresnel) + (reflected[channel] * .95 + 24) * fresnel + (reflected[channel] * .65 + 90) * (polish + rim + folds[index] * .030), 0, 255);
    }
    const translucency = .57 + .25 * Math.pow(1 - z, 2.4) + Math.min(.08, polish * .65);
    rgba[offset + 3] = Math.round(255 * clamp((1 - Math.sqrt(q)) * radius) * translucency);
  }
  return { width, rgba };
}

if (typeof module !== 'undefined') module.exports = { renderPlanetSurface };
if (typeof self !== 'undefined' && typeof document === 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = event => {
    const { id, options } = event.data;
    try {
      const { width, rgba } = renderPlanetSurface(options);
      self.postMessage({ id, width, rgba }, [rgba.buffer]);
    } catch (error) { self.postMessage({ id, error: String(error) }); }
  };
}
