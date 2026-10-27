/**
 * Pixel-Universe (Phase 2, lokaler Mock): handgesetzte Planeten, Monde, Nebel und Sterne –
 * alles deterministisch gerechnet, pixelweise gesetzt, ohne Filter. Gezeichnet wird in ein kleines
 * Raster (1 Kunstpixel = ganzzahlig viele Bildschirmpixel, `image-rendering: pixelated`), damit nichts
 * weichgezeichnet wird. Text, Panels und Dock liegen darüber im normalen HTML.
 */
export type PlanetKind = 'gas' | 'ocean' | 'lava' | 'ice' | 'rock' | 'desert' | 'jade';
export const PLANET_KINDS: PlanetKind[] = ['gas', 'ocean', 'lava', 'ice', 'rock', 'desert', 'jade'];

export type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = (...h: string[]): RGB[] => h.map(hex);

/** Ein Charakter je Abteilung: der Name entscheidet, sonst ein stabiler Platz aus der Tonfamilie. */
export function planetKind(name: string, slot = 0): PlanetKind {
  const n = (name || '').toLowerCase();
  if (/r\s*&\s*d|forsch|research|labor|entwickl|develop/.test(n)) return 'gas';
  if (/product|produkt/.test(n)) return 'ocean';
  if (/growth|wachstum|vertrieb|sales|marketing/.test(n)) return 'lava';
  if (/intelligen|analy|daten|data|strategie/.test(n)) return 'ice';
  if (/ohne|none|unzugeordnet|sonstig|inbox/.test(n)) return 'rock';
  if (/finan|geld|kasse|buchhalt|finance|legal|recht/.test(n)) return 'jade';
  if (/kund|client|crm|support|service/.test(n)) return 'desert';
  const pool: PlanetKind[] = ['gas', 'ocean', 'lava', 'ice', 'desert', 'jade'];
  return pool[Math.abs(slot) % pool.length];
}

interface Look { base: RGB[]; atmo: RGB | null; ring: RGB[]; moon: RGB[]; glow: RGB; speed: number }
const LOOK: Record<PlanetKind, Look> = {
  gas: { base: ramp('#1b1233', '#3a2468', '#6a43a3', '#a47ad0', '#e3c9f2'), atmo: hex('#b48be0'), ring: ramp('#3a2468', '#7a55b0', '#c7a6e6', '#f4e2c0'), moon: ramp('#241a3a', '#43355e', '#675a88', '#9488b0', '#c4bbd8'), glow: hex('#a47ad0'), speed: 0.05 },
  ocean: { base: ramp('#0a2540', '#12467a', '#1f78b4', '#4eb0d8', '#bfe8f4'), atmo: hex('#7cc8ec'), ring: ramp('#2c4a64', '#58809c', '#9cc0d4', '#d8ecf4'), moon: ramp('#1c2a36', '#34495a', '#5a7284', '#8aa0b0', '#bccbd6'), glow: hex('#4eb0d8'), speed: 0.03 },
  lava: { base: ramp('#1a0c0c', '#3a1713', '#6b2a1a', '#a24a22', '#d9783a'), atmo: hex('#ff7a3a'), ring: ramp('#3a1713', '#6b2a1a', '#a24a22', '#d9a066'), moon: ramp('#201210', '#3d2620', '#5e4034', '#86604c', '#b08a70'), glow: hex('#ff5a1f'), speed: 0.025 },
  ice: { base: ramp('#10223a', '#25507a', '#4f8fb8', '#9fd3e8', '#eaf8ff'), atmo: hex('#a8e4f4'), ring: ramp('#3a6a90', '#7cb4d4', '#c4e8f4', '#ffffff'), moon: ramp('#1a2a3c', '#34506c', '#5c7e9c', '#8eb0c8', '#c8dce8'), glow: hex('#9fd3e8'), speed: 0.02 },
  rock: { base: ramp('#17171c', '#2c2c34', '#4a4a55', '#73737f', '#a6a6b2'), atmo: null, ring: ramp('#34343c', '#5c5c68', '#8a8a96', '#bcbcc8'), moon: ramp('#18181d', '#2e2e36', '#4c4c58', '#767682', '#a8a8b4'), glow: hex('#8a8a96'), speed: 0.018 },
  desert: { base: ramp('#2b1608', '#5c3112', '#9a5a22', '#d28e3c', '#f0c878'), atmo: hex('#f0b868'), ring: ramp('#5c3112', '#9a5a22', '#d28e3c', '#f4d9a0'), moon: ramp('#241a10', '#44341f', '#6a5434', '#96805a', '#c4b088'), glow: hex('#d28e3c'), speed: 0.03 },
  jade: { base: ramp('#06201a', '#0f4034', '#1f7358', '#3fae86', '#9ee0bf'), atmo: hex('#6fd0a8'), ring: ramp('#0f4034', '#2a8a68', '#74c8a0', '#d9b24c'), moon: ramp('#0d1f1a', '#1b3a30', '#32604f', '#5a8f7a', '#92c2ae'), glow: hex('#3fae86'), speed: 0.035 },
};
export const kindLook = (k: PlanetKind): Look => LOOK[k];

// ---------- Rauschen (deterministisch, ohne Math.random) ----------
function h3(x: number, y: number, z: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const sm = (t: number) => t * t * (3 - 2 * t);
export function noise3(x: number, y: number, z: number, s = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => h3(xi + dx, yi + dy, zi + dz, s);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
}
export function fbm3(x: number, y: number, z: number, s = 0, oct = 3): number {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += a * noise3(x * f, y * f, z * f, s + i * 31); norm += a; a *= 0.5; f *= 2.03; }
  return sum / norm;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number) => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
export const seedOf = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const pick = (r: RGB[], v: number, b: number): RGB => r[clamp(Math.floor(v * r.length + (b - 0.5) * 0.42), 0, r.length - 1)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface Bitmap { w: number; h: number; data: Uint8ClampedArray }
const newBitmap = (w: number, h: number): Bitmap => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });
const put = (b: Bitmap, x: number, y: number, c: RGB, a = 255) => {
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.data[i] = c[0]; b.data[i + 1] = c[1]; b.data[i + 2] = c[2]; b.data[i + 3] = a;
};

export interface PlanetSpec {
  kind: PlanetKind;
  /** Durchmesser in Kunstpixeln. */
  d: number;
  seed: number;
  /** Lichtrichtung (zur Mitte, wie die glatte Kugel). */
  light: { x: number; y: number };
  /** Daten: Ordner → Ringe, Aktivität → Atmosphäre, Überfälliges → Polarlicht, Offenes → Funkeln. */
  folders?: number; activity?: number; overdue?: number; open?: number;
}

export function planetCanvasSize(spec: Pick<PlanetSpec, 'd' | 'kind' | 'folders'>): number {
  const ring = hasRing(spec);
  const r = spec.d / 2;
  return ring ? Math.ceil(r * 2 * 1.85) + 6 : spec.d + 10;
}
export const hasRing = (s: Pick<PlanetSpec, 'kind' | 'folders'>) => s.kind === 'gas' || (s.folders ?? 0) > 0;

/** Statisches Grundgerüst eines Planeten (Maske, Normale, Licht): einmal gerechnet, je Takt nur die Oberfläche neu. */
export function planetGeometry(spec: PlanetSpec) {
  const S = planetCanvasSize(spec);
  const R = spec.d / 2;
  const c = S / 2;
  const L0 = { x: spec.light.x * 0.82, y: spec.light.y * 0.82, z: 0.58 };
  const ln = Math.hypot(L0.x, L0.y, L0.z);
  const L = { x: L0.x / ln, y: L0.y / ln, z: L0.z / ln };
  const mask = new Uint8Array(S * S);
  const nx = new Float32Array(S * S), ny = new Float32Array(S * S), nz = new Float32Array(S * S), lam = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - c) / R, dy = (y + 0.5 - c) / R;
    const rr = dx * dx + dy * dy;
    const i = y * S + x;
    if (rr <= 1) {
      const z = Math.sqrt(1 - rr);
      mask[i] = 1; nx[i] = dx; ny[i] = dy; nz[i] = z;
      lam[i] = Math.max(0, dx * L.x + dy * L.y + z * L.z);
    }
  }
  return { S, R, c, L, mask, nx, ny, nz, lam };
}
export type Geometry = ReturnType<typeof planetGeometry>;

const craters = (seed: number, n: number) => Array.from({ length: n }, (_, i) => {
  const a = h3(i, 1, 2, seed) * Math.PI * 2, b = (h3(i, 3, 4, seed) - 0.5) * 2.2, r = 0.1 + h3(i, 5, 6, seed) * 0.2;
  const ca = Math.cos(b), v: [number, number, number] = [Math.cos(a) * ca, Math.sin(b), Math.sin(a) * ca];
  return { v, r };
});

const GOLD = hex('#d9b24c');
const LIGHTS = hex('#ffd36b');

/** Ein Takt (Frame) eines Planeten: Oberfläche, Ring, Atmosphäre, Funkeln. `rot` dreht die Oberfläche. */
export function paintPlanet(spec: PlanetSpec, geo: Geometry, frame = 0): Bitmap {
  const { S, R, c, mask, nx, ny, nz, lam } = geo;
  const look = LOOK[spec.kind];
  const bm = newBitmap(S, S);
  const sd = spec.seed % 9973;
  const rot = frame * look.speed + (spec.seed % 628) / 100;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const ring = hasRing(spec);
  const th = (-14 * Math.PI) / 180, ct = Math.cos(th), st = Math.sin(th);
  const fol = spec.folders ?? (spec.kind === 'gas' ? 3 : 0);
  const bands: Array<[number, number, number]> = [[1.3, 1.46, 2]];
  if (fol >= 3 || spec.kind === 'gas') bands.push([1.52, 1.64, 1]);
  if (fol > 4) bands.push([1.7, 1.76, 0]);
  const cs = spec.kind === 'rock' || spec.kind === 'desert' ? craters(sd, spec.kind === 'rock' ? 9 : 4) : [];
  const storm: [number, number, number] = [Math.sin(1.1), 0.28, Math.cos(1.1)];

  const surface = (i: number, x: number, y: number): RGB => {
    const b = bayer(x, y);
    const lv = lam[i];
    const shade = 0.07 + 0.93 * lv;
    // Punkt auf der Kugel (gedreht um die Hochachse): nahtlos, kein Polpinch.
    const px = nx[i] * cr + nz[i] * sr, py = ny[i], pz = -nx[i] * sr + nz[i] * cr;
    switch (spec.kind) {
      case 'gas': {
        const warp = fbm3(px * 2.2, py * 2.2, pz * 2.2, sd) - 0.5;
        const band = Math.sin((py * 7.5 + warp * 2.6) * Math.PI) * 0.5 + 0.5;
        let t = band * 0.62 + 0.18 + (fbm3(px * 5, py * 9, pz * 5, sd + 7) - 0.5) * 0.14;
        const cream = Math.sin((py * 7.5 + warp * 2.6 + 0.5) * Math.PI) > 0.93;
        let col: RGB;
        const sd2 = (px - storm[0]) ** 2 + ((py - storm[1]) * 1.7) ** 2 + (pz - storm[2]) ** 2;
        if (sd2 < 0.05) col = sd2 < 0.012 ? hex('#f4d0b0') : sd2 < 0.03 ? hex('#e0795a') : hex('#a04a3a');
        else col = cream ? look.ring[3] : pick(look.base, clamp(t, 0, 1), 0.5);
        return shadeBy(col, shade, b, look.base);
      }
      case 'ocean': {
        const hgt = fbm3(px * 2.1 + 3, py * 2.1, pz * 2.1, sd, 4);
        const land = hgt > 0.54;
        const cloudN = fbm3(px * 3.1 + sr * 0.5, py * 3.4, pz * 3.1 + cr * 0.5, sd + 11, 3);
        const polar = Math.abs(py) > 0.8 + (hgt - 0.5) * 0.18;
        let col: RGB;
        if (polar) col = hex('#eaf6fb');
        else if (land) col = hgt > 0.68 ? hex('#c9b46a') : hgt > 0.6 ? hex('#6aa84f') : hex('#2f7a3a');
        else col = hgt > 0.5 ? hex('#4eb0d8') : hgt > 0.38 ? hex('#1f78b4') : hex('#12467a');
        if (cloudN > 0.64) col = cloudN > 0.7 ? hex('#ffffff') : hex('#cfe3ee');
        const out = shadeBy(col, shade, b, [hex('#050f1c'), hex('#0a2540'), col, col, col]);
        const city = land && !polar && cloudN < 0.6 && lv < 0.16 && noise3(px * 15, py * 15, pz * 15, sd + 5) > 0.72;
        return city ? LIGHTS : out;
      }
      case 'lava': {
        const crust = fbm3(px * 2.4, py * 2.4, pz * 2.4, sd, 4);
        const crack = 1 - Math.abs(2 * fbm3(px * 2.7 + 3, py * 2.7, pz * 2.7, sd + 4, 3) - 1);
        if (crack > 0.952 && crust > 0.3) return crack > 0.975 ? hex('#fff0a0') : crack > 0.962 ? hex('#ffb347') : hex('#ff5a1f');
        return pick(look.base, clamp(crust * 0.7 * (0.25 + shade * 0.95), 0, 1), b);
      }
      case 'ice': {
        const facet = Math.floor(fbm3(px * 3.4, py * 3.4, pz * 3.4, sd, 2) * 5) / 5;
        const crack = 1 - Math.abs(2 * fbm3(px * 3 + 9, py * 3, pz * 3, sd + 2, 3) - 1);
        if (crack > 0.958 && lv > 0.1) return look.base[4];
        if (noise3(px * 19, py * 19, pz * 19, sd + 3) > 0.9 && lv > 0.3) return hex('#ffffff');
        return pick(look.base, clamp((0.12 + facet * 0.35) * 0.55 + shade * 0.62 + (Math.abs(py) > 0.78 ? 0.14 : 0), 0, 1), b);
      }
      case 'desert': {
        const warp = fbm3(px * 3, py * 3, pz * 3, sd) - 0.5;
        const dune = Math.sin((py * 9 + warp * 3.2) * Math.PI) * 0.5 + 0.5;
        let t = (0.2 + dune * 0.28 + (fbm3(px * 5, py * 5, pz * 5, sd + 1) - 0.5) * 0.18) * 0.4 + shade * 0.62;
        for (const k of cs) { const d = Math.acos(clamp(px * k.v[0] + py * k.v[1] + pz * k.v[2], -1, 1)); if (d < k.r) t -= 0.18; else if (d < k.r + 0.05) t += 0.12; }
        return pick(look.base, clamp(t, 0, 1), b);
      }
      case 'jade': {
        const patch = fbm3(px * 2, py * 2, pz * 2, sd, 3);
        const vein = 1 - Math.abs(2 * fbm3(px * 2.4 + 5, py * 2.4, pz * 2.4, sd + 8, 3) - 1);
        if (vein > 0.945 && lv > 0.12) return GOLD;
        return pick(look.base, clamp(0.1 + patch * 0.28 + shade * 0.66, 0, 1), b);
      }
      default: { // rock
        let t = (fbm3(px * 3, py * 3, pz * 3, sd, 3) - 0.5) * 0.2 + shade * 0.74 + 0.06;
        for (const k of cs) { const d = Math.acos(clamp(px * k.v[0] + py * k.v[1] + pz * k.v[2], -1, 1)); if (d < k.r) t -= 0.2; else if (d < k.r + 0.06) t += 0.16; }
        return pick(look.base, clamp(t, 0, 1), b);
      }
    }
  };
  function shadeBy(col: RGB, shade: number, b: number, dark: RGB[]): RGB {
    // Schattenseite: dunkle Stufen der Familie; Lichtseite: Eigenfarbe, an der Kante ein Dither-Übergang.
    const t = clamp(shade * 1.25 + (b - 0.5) * 0.3, 0, 1);
    if (t < 0.2) return dark[0] === col ? col : mix(dark[0], col, 0.1);
    if (t < 0.4) return mix(dark[1] ?? dark[0], col, 0.38);
    if (t < 0.62) return mix(col, dark[1] ?? dark[0], 0.12);
    return t > 0.94 ? mix(col, [255, 255, 255], 0.12) : col;
  }

  const edge = (x: number, y: number) => {
    const o = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= S || yy >= S || !mask[yy * S + xx];
    return o(x - 1, y) || o(x + 1, y) || o(x, y - 1) || o(x, y + 1);
  };

  // 1) Ring, hintere Hälfte + 2) Planet + 3) Ring, vordere Hälfte
  const ringAt = (x: number, y: number): { col: RGB; front: boolean } | null => {
    if (!ring) return null;
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    const rx = dx * ct + dy * st, ry = -dx * st + dy * ct;
    const q = Math.hypot(rx, ry / 0.3) / R;
    for (const [a, b2, tone] of bands) {
      if (q >= a && q <= b2) {
        const lvl = clamp(tone + (h3(Math.floor((q - a) * 40), 7, 7, sd) > 0.6 ? 1 : 0) - (bayer(x, y) < 0.18 ? 1 : 0), 0, look.ring.length - 1);
        return { col: look.ring[lvl], front: ry > 0 };
      }
    }
    return null;
  };

  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const rg = ringAt(x, y);
    if (mask[i]) {
      if (rg && rg.front) { put(bm, x, y, rg.col); continue; }
      let col = surface(i, x, y);
      if (edge(x, y)) {
        const lit = lam[i] > 0.28 || (nx[i] * geo.L.x + ny[i] * geo.L.y) > 0.25;
        col = lit && look.atmo ? mix(col, look.atmo, 0.55) : mix(col, look.base[0], 0.65);
      }
      put(bm, x, y, col);
    } else if (rg) {
      // Ring im Schatten des Planeten dunkler (Gegenlicht).
      const dark = (x + 0.5 - c) * geo.L.x + (y + 0.5 - c) * geo.L.y < -R * 0.55 && !rg.front;
      put(bm, x, y, dark ? mix(rg.col, look.base[0], 0.55) : rg.col);
    }
  }

  // 4) Atmosphäre (Aktivität der letzten 7 Tage): ein bis zwei Pixelringe, gedithert.
  const act = spec.activity ?? 0;
  if (act > 0 && look.atmo) {
    const k = clamp(0.4 + act * 0.22, 0, 1);
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
      const i = y * S + x;
      if (mask[i] || bm.data[i * 4 + 3]) continue;
      const near1 = mask[i - 1] || mask[i + 1] || mask[i - S] || mask[i + S];
      const dxr = (x + 0.5 - c) / R, dyr = (y + 0.5 - c) / R;
      const rr = Math.hypot(dxr, dyr) * R - R; // Abstand zum Rand in Kunstpixeln
      if (rr > 0 && rr <= 2.2) {
        const side = clamp(0.55 + (dxr * geo.L.x + dyr * geo.L.y) / Math.max(0.1, Math.hypot(dxr, dyr)) * 0.5, 0.15, 1);
        if (near1 ? side > 0.5 || bayer(x, y) < side * k : bayer(x, y) < k * side * 0.3) put(bm, x, y, mix(look.atmo, look.base[2], near1 ? 0.15 : 0.5), near1 ? 255 : 150);
      }
    }
  }
  // 5) Polarlicht für Überfälliges: rosa-rote Pixel an der Nordkappe.
  if ((spec.overdue ?? 0) > 0) {
    const aur = [hex('#ff6f91'), hex('#ffb3c1'), hex('#ff4d6d')];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dxr = (x + 0.5 - c) / R, dyr = (y + 0.5 - c) / R;
      const d = Math.hypot(dxr, dyr) * R - R;
      if (dyr < -0.35 && d > 0 && d < 2.6 && Math.abs(dxr) < 0.78 && !mask[y * S + x] && bayer(x + 1, y) < 0.5 - d * 0.14) put(bm, x, y, aur[(x + y) % 3]);
    }
  }
  // 6) Funkeln für offene Aufgaben: kleine Kreuze, die im Takt wechseln.
  const sparks = Math.min(spec.open ?? 0, 6);
  for (let k = 0; k < sparks; k++) {
    const a = -2.4 + (k * 4.8) / Math.max(1, sparks) + 0.3;
    const rad = R * (ring ? 1.82 : 1.28) + 3 + (k % 2) * 2;
    const sx = Math.round(c + Math.cos(a) * rad), sy = Math.round(c + Math.sin(a) * rad);
    const on = (frame + k) % 2 === 0;
    const col = hex('#fff3c4');
    put(bm, sx, sy, col);
    if (on) { put(bm, sx - 1, sy, col, 200); put(bm, sx + 1, sy, col, 200); put(bm, sx, sy - 1, col, 200); put(bm, sx, sy + 1, col, 200); }
  }
  return bm;
}

/** Kleiner Mond (ein Ordner): Krater, ein Lichtkante, Fenster-Lichter wenn Aufgaben darin offen sind. */
export function paintMoon(kind: PlanetKind, d: number, seed: number, light: { x: number; y: number }, tasks = false): Bitmap {
  const S = d + 4;
  const geo = planetGeometry({ kind: 'rock', d, seed, light, folders: 0 });
  const g = { ...geo, S, c: S / 2 };
  const bm = newBitmap(S, S);
  const look = LOOK[kind];
  const sd = seed % 9973;
  const R = d / 2, c = S / 2;
  const cs = craters(sd, Math.max(2, Math.round(d / 3)));
  const L = geo.L;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - c) / R, dy = (y + 0.5 - c) / R;
    const rr = dx * dx + dy * dy;
    if (rr > 1) continue;
    const z = Math.sqrt(1 - rr);
    const lv = Math.max(0, dx * L.x + dy * L.y + z * L.z);
    let t = 0.07 + 0.93 * lv;
    for (const k of cs) { const dd = Math.acos(clamp(dx * k.v[0] + dy * k.v[1] + z * k.v[2], -1, 1)); if (dd < k.r) t -= 0.18; else if (dd < k.r + 0.07) t += 0.12; }
    t += (fbm3(dx * 3, dy * 3, z * 3, sd) - 0.5) * 0.2;
    let col = pick(look.moon, clamp(t, 0, 1), bayer(x, y));
    const o = (xx: number, yy: number) => { const ex = (xx + 0.5 - c) / R, ey = (yy + 0.5 - c) / R; return ex * ex + ey * ey > 1; };
    if (o(x - 1, y) || o(x + 1, y) || o(x, y - 1) || o(x, y + 1)) col = lv > 0.3 ? look.moon[3] : look.moon[0];
    put(bm, x, y, col);
  }
  if (tasks) { // offene Aufgaben: zwei warme Lichter auf der Nachtseite
    const col = LIGHTS;
    [[-0.45, 0.35], [0.1, 0.55]].forEach(([ox, oy]) => { const x = Math.round(c + ox * R * -L.x * 1.4 + (L.x > 0 ? -1 : 1)), y = Math.round(c + oy * R * 0.9); put(bm, x, y, col); });
  }
  void g;
  return bm;
}

// ---------- Himmel ----------
const WARM = ramp('#05060d', '#0b0b1a', '#150f24', '#26142e', '#3d1a35', '#5e2a3a', '#8a4a3a', '#c07a48', '#e8b062');
const COOL = ramp('#05060d', '#07102a', '#0c1c40', '#142c5a', '#1f4678', '#2f6a92');
const VIOLET = ramp('#05060d', '#0f0b24', '#1b1240', '#2c1a5e', '#46288a', '#6a42b4');

/** Pixel-Nebel: gedithertes, gestuftes Farbband statt Weichzeichner – eine Farbstufe = ein klarer Pixelton. */
export function paintNebula(w: number, h: number, seed = 7): Bitmap {
  const bm = newBitmap(w, h);
  const asp = w / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const px = u * asp * 4.2, py = v * 4.2;
    const wx = fbm3(px * 0.7, py * 0.7, 1.7, seed, 3) - 0.5;
    const n1 = fbm3(px + wx * 2.2, py + wx * 1.5, 0.4, seed + 3, 5);
    const ridge = 1 - Math.abs(2 * fbm3(px * 1.6 + wx, py * 1.6, 3.3, seed + 5, 4) - 1);
    const lane = Math.abs(2 * fbm3(px * 1.1 + 4, py * 1.1, 2.2, seed + 9, 3) - 1);
    const far = (cx: number, cy: number, r: number) => clamp(1 - Math.hypot((u - cx) * asp, v - cy) / r, 0, 1);
    const warm = clamp(far(0.0, 1.0, 1.0) * 1.35 + far(1.0, 0.0, 0.6) * 0.8 + far(1.0, 1.0, 0.42) * 0.4, 0, 1);
    const cool = clamp(far(0.5, 0.0, 0.8) * 0.95 + far(0.08, 0.12, 0.5) * 0.7 + far(0.82, 0.72, 0.42) * 0.5, 0, 1);
    const centre = clamp(1 - Math.hypot((u - 0.5) * asp * 0.8, (v - 0.55) * 0.9) / 0.5, 0, 1);
    const b = bayer(x, y);
    const body = clamp((n1 - 0.32) * 2.6, 0, 1) * 0.65 + ridge * ridge * 0.55;
    let iw = clamp(warm * (0.06 + body) * 1.1 * (1 - centre * 0.75), 0, 1);
    iw *= 1 - clamp((0.2 - lane) * 3.6, 0, 1) * 0.7; // dunkle Staubbahnen
    const ic = clamp(cool * (0.06 + body) * 0.62 * (1 - centre * 0.7), 0, 1);
    const useWarm = iw + (b - 0.5) * 0.1 >= ic;
    const rr = useWarm ? WARM : (fbm3(px * 0.5, py * 0.5, 9, seed + 12, 2) > 0.5 ? COOL : VIOLET);
    const iv = useWarm ? iw : ic;
    const idx = clamp(Math.floor(iv * (rr.length - 0.01) + (b - 0.5) * 0.5), 0, rr.length - 1);
    put(bm, x, y, rr[idx]);
  }
  return bm;
}

export interface Star { x: number; y: number; kind: 0 | 1 | 2 | 3; col: RGB; twinkle: boolean }
const STAR_COL = ramp('#ffffff', '#cfe3ff', '#ffe9b0', '#ffc89a', '#9fd0ff');
/** Sterne: überwiegend einzelne Pixel, einige Kreuze, wenige große Funkel – die twinkelnden liegen auf einer eigenen Ebene. */
export function makeStars(w: number, h: number, seed = 11): Star[] {
  const n = Math.round((w * h) / 210);
  const out: Star[] = [];
  for (let i = 0; i < n; i++) {
    const r = h3(i, 1, 1, seed);
    const kind: Star['kind'] = r > 0.992 ? 3 : r > 0.96 ? 2 : r > 0.8 ? 1 : 0;
    const col = STAR_COL[Math.floor(h3(i, 2, 2, seed) * STAR_COL.length)];
    out.push({ x: Math.floor(h3(i, 3, 3, seed) * w), y: Math.floor(h3(i, 4, 4, seed) * h), kind, col, twinkle: kind >= 2 || h3(i, 5, 5, seed) > 0.86 });
  }
  return out;
}
export function paintStars(w: number, h: number, stars: Star[], twinkle: boolean): Bitmap {
  const bm = newBitmap(w, h);
  const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
  for (const s of stars) {
    if (s.twinkle !== twinkle) continue;
    if (s.kind === 0) put(bm, s.x, s.y, dim(s.col, 0.5));
    else if (s.kind === 1) put(bm, s.x, s.y, s.col);
    else {
      put(bm, s.x, s.y, s.col);
      const a = s.kind === 3 ? 2 : 1;
      for (let k = 1; k <= a; k++) { const c2 = dim(s.col, k === 1 ? 0.8 : 0.5); put(bm, s.x - k, s.y, c2); put(bm, s.x + k, s.y, c2); put(bm, s.x, s.y - k, c2); put(bm, s.x, s.y + k, c2); }
    }
  }
  return bm;
}
