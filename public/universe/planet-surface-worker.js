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

/** Opaque albedo, relief and lighting baked into one small sphere image. */
function renderPlanetSurface({ width: requestedWidth, kind = 'rock', hue = [160, 140, 120], seed = 1, lit = -2.2, quiet = false }) {
  const width = Math.round(clamp(Number(requestedWidth) || 96, 16, 256));
  const count = width * width, rgba = new Uint8ClampedArray(count * 4);
  const albedo = new Float32Array(count * 3), heights = new Float32Array(count);
  const radius = width / 2;
  const craters = Array.from({ length: 15 }, (_, i) => {
    const angle = hash(i, 7, 1, seed) * Math.PI * 2;
    const reach = Math.sqrt(hash(i, 11, 3, seed)) * .94;
    return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach, z: Math.sqrt(1 - reach * reach), r: .065 + hash(i, 17, 5, seed) * .22 };
  });
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5 - radius) / radius, v = (y + .5 - radius) / radius, q = u * u + v * v;
    if (q >= 1) continue;
    const z = Math.sqrt(1 - q), index = y * width + x;
    // Noise is sampled on the sphere, so coastlines and strata curve towards its edge.
    const broad = fbm(u * 3.1 + 4, v * 3.1 + 9, z * 3.1 + 2, seed);
    const grain = fbm(u * 23 + 7, v * 23 + 3, z * 23 + 11, seed + 91, 2);
    const latitude = Math.asin(v);
    let color, height = broad, relief = 0;
    switch (kind) {
      case 'gas': {
        const bands = .5 + .5 * Math.sin(latitude * 25 + (broad - .5) * 9 + Math.sin(u * 6 + z * 4) * .7);
        color = blend([114, 76, 41], [239, 211, 150], bands * .82 + grain * .18);
        const storm = Math.hypot((u - .28) / .28, (v + .17) / .105);
        if (storm < 1) color = blend(color, [165, 89, 48], (1 - storm) * (.7 + .25 * Math.sin(storm * 19)));
        height = bands * .025 + grain * .014;
        break;
      }
      case 'ocean':
      case 'forest': {
        const land = smooth(kind === 'forest' ? .40 : .50, kind === 'forest' ? .47 : .56, broad);
        const sea = blend([15, 53, 92], [43, 132, 159], broad * .8 + grain * .2);
        const continent = blend([43, 85, 55], [167, 160, 104], smooth(.44, .73, broad) + (grain - .5) * .3);
        color = blend(sea, continent, land);
        const snow = smooth(.78, .96, Math.abs(v)) * .8 + smooth(.72, .87, broad) * land;
        color = blend(color, [224, 231, 217], snow);
        const clouds = smooth(.55, .72, fbm(u * 5 - 8, v * 7 + 2, z * 5, seed + 217, 3));
        color = blend(color, [224, 235, 231], clouds * .84);
        height = .025 * grain + land * broad * .13 + clouds * .035;
        break;
      }
      case 'ice': {
        const folded = Math.sin(u * 9 + v * 5 + broad * 13) * Math.sin(v * 13 + z * 5 + broad * 6);
        const crack = 1 - smooth(.025, .12, Math.abs(folded));
        color = blend([70, 129, 147], [221, 237, 230], broad * .9 + grain * .28);
        color = blend(color, [24, 68, 88], crack * .8);
        height = broad * .22 + grain * .08 - crack * .10;
        break;
      }
      case 'marble': {
        const folded = Math.sin((u * 2.5 + v * 3.5 + z) * 6 + broad * 16);
        const vein = Math.pow(1 - Math.abs(folded), 12);
        color = blend([48, 35, 88], [169, 145, 203], smooth(.25, .72, broad) + (grain - .5) * .25);
        color = blend(color, [227, 216, 237], vein * .72);
        height = broad * .12 + vein * .018 + grain * .02;
        break;
      }
      case 'dune': {
        const dunes = .5 + .5 * Math.sin(latitude * 37 + broad * 12 + u * 5);
        color = blend([132, 91, 49], [239, 210, 154], broad * .65 + dunes * .25 + grain * .1);
        height = broad * .20 + dunes * .065 + grain * .015;
        break;
      }
      case 'volcanic': {
        const lava = (1 - smooth(.009, .037, Math.abs(broad - .49))) * smooth(.32, .65, grain);
        color = blend([52, 39, 38], [153, 93, 67], broad * .78 + grain * .22);
        color = blend(color, [252, 151, 51], lava);
        height = broad * .35 + grain * .12 - lava * .06;
        relief = lava;
        break;
      }
      default: {
        let craterRelief = 0;
        for (const crater of craters) {
          const distance = Math.sqrt(Math.max(0, 2 - 2 * (u * crater.x + v * crater.y + z * crater.z))) / crater.r;
          if (distance > 1.55) continue;
          const bowl = distance < 1 ? -.12 * (1 - distance * distance) : 0;
          const rim = .055 * Math.exp(-Math.pow((distance - 1.02) * 7, 2));
          craterRelief += bowl + rim;
        }
        const terrain = smooth(.23, .77, broad) * .74 + grain * .26;
        color = blend([76, 50, 39], [214, 165, 126], terrain);
        color = blend(color, [46, 37, 35], smooth(.1, -.07, craterRelief) * .23);
        height = broad * .35 + grain * .045 + craterRelief;
      }
    }
    // Keep the established area colour, without turning the material into grey glass.
    const luminance = color[0] * .30 + color[1] * .55 + color[2] * .15;
    const hueLuminance = Math.max(1, hue[0] * .30 + hue[1] * .55 + hue[2] * .15);
    const tinted = hue.map(value => value / hueLuminance * luminance);
    color = blend(color, tinted, kind === 'rock' ? .9 : .07);
    if (quiet) color = blend(color, [123, 132, 116], .12);
    albedo[index * 3] = color[0]; albedo[index * 3 + 1] = color[1]; albedo[index * 3 + 2] = color[2];
    heights[index] = height;
    // Lava emits its own small amount of light; it does not trigger any CSS glow/filter.
    if (kind === 'volcanic') rgba[index * 4 + 3] = Math.round(relief * 255);
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
    const strength = kind === 'gas' || kind === 'ocean' ? .045 : .17;
    const dx = (neighbour(x + 1, y) - neighbour(x - 1, y)) * width * .25;
    const dy = (neighbour(x, y + 1) - neighbour(x, y - 1)) * width * .25;
    const nx = u - dx * strength * z, ny = v - dy * strength * z, nz = z;
    const nl = Math.hypot(nx, ny, nz);
    const diffuse = Math.max(0, (nx * lx + ny * ly + nz * lz) / nl);
    const lighting = (.35 + .76 * Math.pow(diffuse, .85)) * (.79 + .21 * z);
    const rim = Math.pow(1 - z, 4) * Math.max(0, u * lx + v * ly) * .30;
    const specular = kind === 'ocean' || kind === 'ice'
      ? Math.pow(Math.max(0, (nx * lx + ny * ly + nz * (lz + 1)) / nl / halfLength), 70) * .14 : 0;
    const emissive = kind === 'volcanic' ? rgba[offset + 3] / 255 * .35 : 0;
    for (let channel = 0; channel < 3; channel++) {
      rgba[offset + channel] = clamp(albedo[index * 3 + channel] * (lighting + emissive) + 235 * specular + hue[channel] * rim, 0, 255);
    }
    // Only the silhouette is antialiased. Nebula/stars cannot show through solid ground.
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
