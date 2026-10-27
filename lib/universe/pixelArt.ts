/**
 * Pixel-Universe (Phase 2, lokaler Mock): handgesetzte Planeten, Monde, Nebel und Sterne –
 * alles deterministisch gerechnet, pixelweise gesetzt, ohne Filter. Gezeichnet wird in ein kleines
 * Raster (1 Kunstpixel = ganzzahlig viele Bildschirmpixel, `image-rendering: pixelated`), damit nichts
 * weichgezeichnet wird. Text, Panels und Dock liegen darüber im normalen HTML.
 */
export type PlanetKind = 'gas' | 'ocean' | 'lava' | 'ice' | 'rock' | 'desert' | 'jade';
export const PLANET_KINDS: PlanetKind[] = ['gas', 'ocean', 'lava', 'ice', 'rock', 'desert', 'jade'];

export type RGB = [number, number, number];
const mh = (h: string): RGB => mute(hex(h), 0.15);
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Gedämpfte Farben (ruhige Arbeitsatmosphäre): Sättigung nur leicht zurück (warme Vielfalt bleibt), etwas weicher im Licht. */
const mute = (c: RGB, k = 0.1): RGB => { const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return [c[0] + (l - c[0]) * k, c[1] + (l - c[1]) * k, c[2] + (l - c[2]) * k]; };
const ramp = (...h: string[]): RGB[] => h.map((x) => mute(hex(x)));

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
  gas: { base: ramp('#1b1233', '#3a2468', '#6a43a3', '#a47ad0', '#e3c9f2'), atmo: mh('#b48be0'), ring: ramp('#3a2468', '#7a55b0', '#c7a6e6', '#f4e2c0'), moon: ramp('#241a3a', '#43355e', '#675a88', '#9488b0', '#c4bbd8'), glow: mh('#a47ad0'), speed: 0.05 },
  ocean: { base: ramp('#0a2540', '#12467a', '#1f78b4', '#4eb0d8', '#bfe8f4'), atmo: mh('#7cc8ec'), ring: ramp('#2c4a64', '#58809c', '#9cc0d4', '#d8ecf4'), moon: ramp('#1c2a36', '#34495a', '#5a7284', '#8aa0b0', '#bccbd6'), glow: mh('#4eb0d8'), speed: 0.03 },
  lava: { base: ramp('#1a0c0c', '#3a1713', '#6b2a1a', '#a24a22', '#d9783a'), atmo: mh('#ff7a3a'), ring: ramp('#3a1713', '#6b2a1a', '#a24a22', '#d9a066'), moon: ramp('#201210', '#3d2620', '#5e4034', '#86604c', '#b08a70'), glow: mh('#ff5a1f'), speed: 0.025 },
  ice: { base: ramp('#10223a', '#25507a', '#4f8fb8', '#9fd3e8', '#eaf8ff'), atmo: mh('#a8e4f4'), ring: ramp('#3a6a90', '#7cb4d4', '#c4e8f4', '#ffffff'), moon: ramp('#1a2a3c', '#34506c', '#5c7e9c', '#8eb0c8', '#c8dce8'), glow: mh('#9fd3e8'), speed: 0.02 },
  rock: { base: ramp('#17171c', '#2c2c34', '#4a4a55', '#73737f', '#a6a6b2'), atmo: null, ring: ramp('#34343c', '#5c5c68', '#8a8a96', '#bcbcc8'), moon: ramp('#18181d', '#2e2e36', '#4c4c58', '#767682', '#a8a8b4'), glow: mh('#8a8a96'), speed: 0.018 },
  desert: { base: ramp('#2b1608', '#5c3112', '#9a5a22', '#d28e3c', '#f0c878'), atmo: mh('#f0b868'), ring: ramp('#5c3112', '#9a5a22', '#d28e3c', '#f4d9a0'), moon: ramp('#241a10', '#44341f', '#6a5434', '#96805a', '#c4b088'), glow: mh('#d28e3c'), speed: 0.03 },
  jade: { base: ramp('#06201a', '#0f4034', '#1f7358', '#3fae86', '#9ee0bf'), atmo: mh('#6fd0a8'), ring: ramp('#0f4034', '#2a8a68', '#74c8a0', '#d9b24c'), moon: ramp('#0d1f1a', '#1b3a30', '#32604f', '#5a8f7a', '#92c2ae'), glow: mh('#3fae86'), speed: 0.035 },
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
/** Ring nur wo er etwas bedeutet: Gasriesen und Bereiche mit vielen Ordnern (≥ 3). */
export const hasRing = (s: Pick<PlanetSpec, 'kind' | 'folders'>) => s.kind === 'gas' || (s.folders ?? 0) >= 3;

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

const LIGHTS = hex('#e6c98a');

/**
 * Flache Planeten (Marius t782u): je Planet 2–3 Töne, kein Glanz, keine Oberflächen-Details.
 * Gedeckte Töne, die zum warmen Nebel passen (Bernstein, Rost, Dunkelblau, Violett, Salbei).
 */
interface Flat { light: RGB; mid: RGB; shadow: RGB; band: RGB }
const flat = (light: string, mid: string, shadow: string, band: string): Flat => ({ light: hex(light), mid: hex(mid), shadow: hex(shadow), band: hex(band) });
const FLAT: Record<PlanetKind, Flat> = {
  gas: flat('#8c7aa6', '#75638f', '#483c63', '#5f5078'),
  ocean: flat('#5a8cae', '#477796', '#2b4b63', '#3a6481'),
  lava: flat('#bf7347', '#a45c36', '#643322', '#8a4a2c'),
  ice: flat('#a3bdcb', '#8aa7b8', '#52697a', '#7692a4'),
  rock: flat('#8f8d94', '#79777f', '#4b4a52', '#656369'),
  desert: flat('#d0a766', '#b98e50', '#76572f', '#a07a41'),
  jade: flat('#43a082', '#2f8a6c', '#1c5845', '#277659'),
};
const flatLook = (k: PlanetKind): Flat => FLAT[k];

/** Ein Planet: Kugel in zwei Tönen plus ein hartes Schattenband, bei vielen Ordnern ein einziger dünner Ring. Rotation und Datensignale entfallen bewusst (ruhig, ohne Glanz). */
export function paintPlanet(spec: PlanetSpec, geo: Geometry, _frame = 0): Bitmap {
  void _frame;
  const { S, R, c, mask, lam, ny } = geo;
  const fl = flatLook(spec.kind);
  const bm = newBitmap(S, S);
  const ring = hasRing(spec);
  const th = (-14 * Math.PI) / 180, ct = Math.cos(th), st = Math.sin(th);
  const phase = ((spec.seed % 7) - 3) * 0.04;
  const stripe = (v: number) => (spec.kind === 'gas' && ((v > -0.5 + phase && v < -0.3 + phase) || (v > 0.12 + phase && v < 0.34 + phase)));
  const ringAt = (x: number, y: number): { col: RGB; front: boolean } | null => {
    if (!ring) return null;
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    const rx = dx * ct + dy * st, ry = -dx * st + dy * ct;
    const q = Math.hypot(rx, ry / 0.3) / R;
    if (q < 1.34 || q > 1.5) return null;
    return { col: fl.light, front: ry > 0 };
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const rg = ringAt(x, y);
    if (mask[i]) {
      if (rg && rg.front) { put(bm, x, y, rg.col); continue; }
      const lv = lam[i];
      let col = lv < 0.36 ? fl.shadow : lv > 0.82 ? fl.light : fl.mid;
      if (stripe(ny[i])) col = lv < 0.36 ? mix(fl.shadow, fl.band, 0.4) : fl.band;
      put(bm, x, y, col);
    } else if (rg) {
      const dark = (x + 0.5 - c) * geo.L.x + (y + 0.5 - c) * geo.L.y < -R * 0.55 && !rg.front;
      put(bm, x, y, dark ? fl.shadow : rg.col);
    }
  }
  return bm;
}

/** Kleiner Mond (ein Ordner): flach in zwei Tönen; offene Aufgaben als ein warmes Licht auf der Nachtseite. */
export function paintMoon(kind: PlanetKind, d: number, seed: number, light: { x: number; y: number }, tasks = false): Bitmap {
  void seed;
  const S = d + 4;
  const geo = planetGeometry({ kind: 'rock', d, seed, light, folders: 0 });
  const bm = newBitmap(S, S);
  const fl = flatLook(kind);
  const grey: RGB = [128, 126, 134];
  const mid = mix(fl.mid, grey, 0.55), shadow = mix(fl.shadow, grey, 0.4);
  const R = d / 2, c = S / 2;
  const L = geo.L;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - c) / R, dy = (y + 0.5 - c) / R;
    const rr = dx * dx + dy * dy;
    if (rr > 1) continue;
    const lv = Math.max(0, dx * L.x + dy * L.y + Math.sqrt(1 - rr) * L.z);
    put(bm, x, y, lv < 0.36 ? shadow : mid);
  }
  if (tasks) put(bm, Math.round(c + (L.x > 0 ? -1 : 1) * R * 0.4), Math.round(c + R * 0.35), LIGHTS);
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
    let iw = clamp(warm * (0.05 + body) * 0.5 * (1 - centre * 0.8), 0, 1);
    iw *= 1 - clamp((0.2 - lane) * 3.6, 0, 1) * 0.7; // dunkle Staubbahnen
    const ic = clamp(cool * (0.05 + body) * 0.5 * (1 - centre * 0.75), 0, 1);
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
  const n = Math.round((w * h) / 420);
  const out: Star[] = [];
  for (let i = 0; i < n; i++) {
    const r = h3(i, 1, 1, seed);
    const kind: Star['kind'] = r > 0.997 ? 3 : r > 0.975 ? 2 : r > 0.8 ? 1 : 0;
    const col = STAR_COL[Math.floor(h3(i, 2, 2, seed) * STAR_COL.length)];
    out.push({ x: Math.floor(h3(i, 3, 3, seed) * w), y: Math.floor(h3(i, 4, 4, seed) * h), kind, col, twinkle: kind >= 2 || h3(i, 5, 5, seed) > 0.93 });
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
