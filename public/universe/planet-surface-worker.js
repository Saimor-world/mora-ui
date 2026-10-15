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

/** One quiet mineral family: area colour, shallow grain, soft light; no miniature landscapes. */
function renderPlanetSurface({ width: requestedWidth, kind = 'rock', hue = [160, 140, 120], seed = 1, lit = -2.2, quiet = false }) {
  const width = Math.round(clamp(Number(requestedWidth) || 96, 16, 256));
  const count = width * width, rgba = new Uint8ClampedArray(count * 4);
  const heights = new Float32Array(count), albedo = new Float32Array(count);
  const radius = width / 2;
  const base = blend(hue, [147, 163, 158], quiet ? .64 : .50);
  const character = { rock: .18, gas: .12, ocean: .10, forest: .14, ice: .08, marble: .11, dune: .16, volcanic: .17 }[kind] || .14;
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5 - radius) / radius, v = (y + .5 - radius) / radius, q = u * u + v * v;
    if (q >= 1) continue;
    const z = Math.sqrt(1 - q), index = y * width + x;
    const body = fbm(u * 4 + 4, v * 4 + 9, z * 4 + 2, seed, 3);
    const grain = fbm(u * 34 + 7, v * 34 + 3, z * 34 + 11, seed + 91, 2);
    // Differences remain in the material's grain, not in illustrative surface objects.
    const fold = Math.sin(v * 12 + u * 2 + body * 6 + seed * .13);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 2 + v * 3 + z) * 5 + body * 9)), 8);
    const feature = kind === 'gas' ? fold * .020
      : kind === 'dune' ? fold * .012
      : kind === 'marble' ? (vein - .12) * .025
      : kind === 'ice' ? (grain - .5) * .025 : 0;
    const variation = (body - .5) * character + (grain - .5) * .075 + feature;
    albedo[index] = 1 + variation;
    heights[index] = body * .035 + grain * .012 + feature * .12;
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
    const nx = u - dx * .075 * z, ny = v - dy * .075 * z, nz = z;
    const nl = Math.hypot(nx, ny, nz);
    const diffuse = smooth(-.45, 1, (nx * lx + ny * ly + nz * lz) / nl);
    const lighting = (.57 + .44 * diffuse) * (.88 + .12 * z);
    const satin = Math.pow(Math.max(0, (nx * lx + ny * ly + nz * (lz + 1)) / nl / halfLength), 22) * .035;
    const rim = Math.pow(1 - z, 4) * Math.max(0, u * lx + v * ly) * .12;
    for (let channel = 0; channel < 3; channel++) {
      rgba[offset + channel] = clamp(base[channel] * albedo[index] * lighting + 230 * satin + base[channel] * rim, 0, 255);
    }
    rgba[offset + 3] = Math.round(255 * clamp((1 - Math.sqrt(q)) * radius));
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
