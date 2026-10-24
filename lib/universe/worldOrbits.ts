/**
 * Bahnen für das Universe aus echten Planeten (visual-v1, motion.md).
 *
 * Bahn und Position benutzen dieselbe Formel: x = cx + rx·cos(a), y = cy + ry·sin(a).
 * Ein Planet sitzt nie neben seiner Bahn und nie in MÔRAs Kreis. Alles in Pixeln
 * der Fläche, damit es am Handy (390 px) und am Computer gleich rechnet.
 */

export interface OrbitRing { rx: number; ry: number; period: number }
export interface OrbitSlot { ring: number; angle: number; size: number }
export interface OrbitLayout {
  /** Größenfaktor der Fläche (1 bis 1,35): Full HD ist der Hauptfall, dort wächst alles mit. */
  scale: number;
  cx: number;
  cy: number;
  mora: number;
  rings: OrbitRing[];
  slots: OrbitSlot[];
}

export interface OrbitOptions {
  width: number;
  height: number;
  /** Gewicht je Planet (gleiche Reihenfolge wie die Planeten). */
  weights: number[];
  phone: boolean;
  /** Name und Anzahl Monde/Sterne je Planet: damit rechnet die Kollisionsprüfung (Beschriftung, Mondbogen). */
  labels?: PlanetLabel[];
}

export interface PlanetLabel { name: string; meta?: string; moons?: number; stars?: number }

/** Platz unter einem Planeten für Name und Zeile darunter. */
export const LABEL_SPACE = 44;
/** Halbe Breite, die ein Name neben der Planetenmitte braucht. */
export const LABEL_HALF = 56;
const GAP = 16;
const TILT = 0.55;
/** Bahnen bleiben flach (ry/rx ≥ TILT) und am Computer ruhig in der Mitte, nicht am Rand. */
const MAX_RX = 440;

/**
 * Größenfaktor aus der Höhe der Fläche: 1 bei ~640 px (Laptop), bis 1,35 bei Full HD
 * (1920×1080, Fläche ~860 px hoch). Am Handy immer 1.
 */
export function orbitScale(height: number, phone: boolean): number {
  if (phone) return 1;
  return Math.round(Math.max(1, Math.min(1.35, height / 640)) * 100) / 100;
}

/** MÔRA ist immer der größte Körper. */
export function moraSize(phone: boolean, scale = 1): number {
  return Math.round((phone ? 88 : 120) * scale);
}

/** Planetengröße aus dem Gewicht: matt und ruhig, nie größer als MÔRA. */
export function planetSize(weight: number, maxWeight: number, phone: boolean, scale = 1): number {
  const [min, max] = phone ? [44, 60] : [60, 84];
  const t = maxWeight > 0 ? Math.max(0, Math.min(1, weight / maxWeight)) : 0;
  return Math.round((min + (max - min) * Math.sqrt(t)) * scale);
}

/** Wie viele Planeten auf welchen Ring: innen wenige, außen mehr. */
export function ringCounts(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 3) return [n];
  if (n <= 7) return [Math.floor(n / 2), Math.ceil(n / 2)];
  const inner = Math.max(2, Math.floor(n / 4));
  const middle = Math.floor((n - inner) / 2);
  return [inner, middle, n - inner - middle];
}

/** Stabiler Startwinkel aus der Position, ringweise versetzt, damit Nachbarn sich nicht decken. */
function startAngle(index: number, count: number, ring: number): number {
  return (2 * Math.PI * index) / count + ring * 0.9 - Math.PI / 2 + 0.35;
}

export function layoutOrbits(opts: OrbitOptions): OrbitLayout {
  const { width, height, weights, phone } = opts;
  const scale = orbitScale(height, phone);
  const mora = moraSize(phone, scale);
  const maxWeight = Math.max(0, ...weights);
  const sizes = weights.map((w) => planetSize(w, maxWeight, phone, scale));
  const biggest = Math.max(0, ...sizes);
  // Größere Schrift auf großen Flächen braucht mehr Platz für die Namen.
  const labelSpace = LABEL_SPACE * scale;
  const labelHalf = LABEL_HALF * scale;
  const cx = width / 2;
  const cy = height / 2 - labelSpace / 4;
  const n = weights.length;
  // Handy: ab 6 Planeten drei Bahnen, sonst fehlt der Platz für die Namen.
  const counts = phone && n >= 6 && n <= 7 ? [2, Math.floor((n - 2) / 2), n - 2 - Math.floor((n - 2) / 2)] : ringCounts(n);

  // Außen: so weit, dass Planet und Name noch in der Fläche liegen.
  const outerRy = Math.max(0, Math.min(height - cy, cy) - biggest / 2 - labelSpace);
  const outerRx = Math.max(0, Math.min(cx - Math.max(biggest / 2, labelHalf) - 8, outerRy / TILT, MAX_RX * scale));
  // Innen: frei von MÔRA in jeder Richtung. Namen stehen oben über, unten unter dem Planeten
  // (nie zu MÔRA hin); seitlich braucht ein Name seine halbe Breite neben MÔRA.
  const clear = mora / 2 + biggest / 2 + GAP;
  const sideClear = mora / 2 + labelHalf + 8;
  const innerRx = Math.min(outerRx, Math.max(clear, sideClear, outerRx * (counts.length > 1 ? 0.55 : 1)));
  const innerRy = Math.min(outerRy, Math.max(clear, innerRx * TILT));

  const rings: OrbitRing[] = counts.map((_, i) => {
    const t = counts.length === 1 ? 1 : i / (counts.length - 1);
    const rx = counts.length === 1 ? Math.max(innerRx, Math.min(outerRx, Math.max(clear * 1.6, outerRx * 0.8))) : innerRx + (outerRx - innerRx) * t;
    const ry = counts.length === 1 ? Math.max(innerRy, Math.min(outerRy, rx * TILT)) : innerRy + (outerRy - innerRy) * t;
    // Handy (hochkant): Bahnen dürfen höher als breit sein, sonst drängen sich Namen in der Mitte.
    return { rx, ry: phone ? Math.max(Math.min(ry, rx), Math.min(outerRy * (0.62 + 0.38 * t), rx * 1.6)) : Math.min(ry, rx), period: 120 + i * 30 };
  });

  const slots: OrbitSlot[] = [];
  let k = 0;
  counts.forEach((count, ring) => {
    for (let i = 0; i < count; i++, k++) slots.push({ ring, angle: startAngle(i, count, ring), size: sizes[k] });
  });
  const ropts = { width, height, phone, labels: opts.labels };
  // Ruhig zuerst: alle Planeten gleichmäßig auf EINER Bahn (gleiche Winkelabstände). Nur wenn das
  // nicht kollisionsfrei passt, greifen mehrere Bahnen und der Koordinatenabstieg.
  if (n >= 2 && n <= (phone ? 7 : 8)) {
    const ry1 = phone ? outerRy * 0.92 : Math.min(outerRy, outerRx * TILT);
    const ring1: OrbitRing = { rx: outerRx * (phone ? 1 : 0.96), ry: ry1, period: 120 };
    for (let r = 0; r < 12; r++) {
      const off = -Math.PI / 2 + (r * Math.PI) / (6 * n);
      const even: OrbitLayout = { scale, cx, cy, mora, rings: [ring1], slots: sizes.map((size, i) => ({ ring: 0, angle: off + (2 * Math.PI * i) / n, size })) };
      if (layoutOverlap(even, ropts, phone ? 0 : 6) === 0) return even;
    }
  }
  let layout: OrbitLayout = { scale, cx, cy, mora, rings, slots };
  resolveCollisions(layout, ropts);
  // Bleibt etwas übrig (enge Handy-Fläche), mit gedrehten Startwinkeln neu versuchen; das beste Bild gewinnt.
  let best = layoutOverlap(layout, ropts);
  for (let seed = 1; best > 0 && seed < (phone ? 8 : 12); seed++) {
    const trial: OrbitLayout = { ...layout, slots: slots.map((sl) => ({ ...sl, angle: sl.angle + (seed * Math.PI) / 6 + sl.ring * seed * 0.37 })) };
    resolveCollisions(trial, ropts);
    const o = layoutOverlap(trial, ropts);
    if (o < best) { best = o; layout = trial; }
  }
  return layout;
}

/* ───────────────────────── Kollisionen (Marius, 24.10.2026) ─────────────────────────
 * Jeder Planet belegt mehrere Rechtecke: Kugel (+ Sternkranz), Name samt Zeile (unten bei
 * vorderen, oben bei hinteren Planeten) und den Mondbogen auf der Gegenseite. Ein
 * Koordinatenabstieg probiert je Planet Winkel auf allen Ringen und nimmt den mit der
 * kleinsten Überdeckung (andere Planeten, MÔRA, Rand). Funktioniert für beliebig viele Planeten.
 */
export interface Rect { x0: number; y0: number; x1: number; y1: number; kind: 'sphere' | 'label' | 'moons' }

/** Geschätzte Breite eines Namens in px (Mittelwert der UI-Schrift, gekappt wie .wd-name). */
export function labelWidth(name: string, phone: boolean, scale = 1): number {
  const large = !phone && scale >= 1.2;
  const per = phone ? 6.6 : large ? 8.6 : 7.6;
  const max = phone ? 104 : large ? 168 : 132;
  return Math.min(max, Math.max(36, (name || '').length * per)) + 8;
}

export function planetFootprint(layout: OrbitLayout, slot: OrbitSlot, label: PlanetLabel | undefined, phone: boolean): Rect[] {
  const p = placeOnOrbit(layout, slot);
  const k = p.front ? 1 : 0.85; // hintere Planeten sind kleiner gezeichnet
  const s = (phone ? Math.max(52, slot.size) : slot.size) * k;
  const r = s / 2;
  const rects: Rect[] = [];
  const starPad = label?.stars ? (phone ? 14 : 20) * k : 0;
  rects.push({ x0: p.x - r - starPad, y0: p.y - r - starPad, x1: p.x + r + starPad, y1: p.y + r + starPad, kind: 'sphere' });
  // Breiten wie in world.css: .wd-name/.wd-meta brechen bei 132 px (Full HD 168, Handy 104) um.
  const large = !phone && layout.scale >= 1.2;
  const maxW = phone ? 104 : large ? 168 : 132;
  const nameRaw = label ? (label.name || '').length * (phone ? 6.6 : large ? 8.6 : 7.6) : LABEL_HALF * 2;
  const metaRaw = label?.meta ? label.meta.length * (phone ? 5.6 : large ? 7 : 6.4) : 0;
  const lw = (Math.max(36, Math.min(maxW, nameRaw), Math.min(maxW, metaRaw)) + 8) * k;
  const extra = Math.max(0, Math.ceil(nameRaw / maxW) - 1) * (phone ? 18 : large ? 24 : 20) + Math.max(0, Math.ceil(metaRaw / maxW) - 1) * (large ? 20 : 16);
  const lh = (LABEL_SPACE * layout.scale + extra) * k;
  if (p.front) rects.push({ x0: p.x - lw / 2, y0: p.y + r + 6 * k, x1: p.x + lw / 2, y1: p.y + r + 6 * k + lh, kind: 'label' });
  else rects.push({ x0: p.x - lw / 2, y0: p.y - r - 6 * k - lh, x1: p.x + lw / 2, y1: p.y - r - 6 * k, kind: 'label' });
  if (label?.moons) {
    const moonR = ((phone ? Math.max(52, slot.size) : slot.size) / 2 + (phone ? 22 : 34)) * k;
    const m = (phone ? 10 : 14) * k;
    const away = Math.cos(slot.angle) < 0 ? -1 : 1;
    // Monde liegen auf einem Bogen zur Außenseite hin (siehe PlanetOrbit.moonAt).
    const xa = away > 0 ? p.x - moonR * 0.65 - m : p.x - moonR - m;
    const xb = away > 0 ? p.x + moonR + m : p.x + moonR * 0.65 + m;
    if (p.front) rects.push({ x0: xa, y0: p.y - moonR - m, x1: xb, y1: p.y - r * 0.4, kind: 'moons' });
    else rects.push({ x0: xa, y0: p.y + r * 0.4, x1: xb, y1: p.y + moonR + m, kind: 'moons' });
  }
  return rects;
}

const PAD = 6;
function overlap(a: Rect, b: Rect, pad = PAD): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + pad;
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + pad;
  return w > 0 && h > 0 ? w * h : 0;
}
function moraRect(layout: OrbitLayout): Rect {
  const r = layout.mora / 2 + 4;
  return { x0: layout.cx - r, y0: layout.cy - r, x1: layout.cx + r, y1: layout.cy + r, kind: 'sphere' };
}
function outside(r: Rect, width: number, height: number): number {
  const dx = Math.max(0, -r.x0) + Math.max(0, r.x1 - width);
  const dy = Math.max(0, -r.y0) + Math.max(0, r.y1 - height);
  return (dx + dy) * 40;
}

/**
 * Summe aller Überdeckungen im Layout (0 = kollisionsfrei). `pad`: geforderter Mindestabstand;
 * der Löser zielt auf 6 px Luft, 0 prüft echte Überlappung.
 */
export function layoutOverlap(layout: OrbitLayout, opts: { width: number; height: number; phone: boolean; labels?: PlanetLabel[] }, pad = PAD): number {
  const feet = layout.slots.map((sl, i) => planetFootprint(layout, sl, opts.labels?.[i], opts.phone));
  const mora = moraRect(layout);
  let total = 0;
  feet.forEach((f, i) => {
    f.forEach((r) => { total += overlap(r, mora, pad) + outside(r, opts.width, opts.height); });
    for (let j = i + 1; j < feet.length; j++) for (const a of f) for (const b of feet[j]) total += overlap(a, b, pad);
  });
  return total;
}

function resolveCollisions(layout: OrbitLayout, opts: { width: number; height: number; phone: boolean; labels?: PlanetLabel[] }) {
  const n = layout.slots.length;
  if (n < 1) return;
  const mora = moraRect(layout);
  const cost = (i: number, slot: OrbitSlot, feet: Rect[][]) => {
    const f = planetFootprint(layout, slot, opts.labels?.[i], opts.phone);
    let c = 0;
    for (const r of f) {
      c += overlap(r, mora) + outside(r, opts.width, opts.height);
      for (let j = 0; j < n; j++) if (j !== i) for (const b of feet[j]) c += overlap(r, b);
    }
    return c;
  };
  const feet = layout.slots.map((sl, i) => planetFootprint(layout, sl, opts.labels?.[i], opts.phone));
  const STEPS = 72;
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const cur = layout.slots[i];
      const here = cost(i, cur, feet);
      if (here === 0) continue;
      let best = cur;
      let bestC = here;
      for (let ring = 0; ring < layout.rings.length; ring++) {
        for (let s = 0; s < STEPS; s++) {
          const cand = { ...cur, ring, angle: cur.angle + (2 * Math.PI * s) / STEPS };
          if (cand.angle === cur.angle && ring === cur.ring) continue;
          // kleine Vorliebe für den alten Platz/Ring: das Bild springt nicht ohne Not
          const c = cost(i, cand, feet) + (ring !== cur.ring ? 1 : 0) + Math.min(s, STEPS - s) * 0.01;
          if (c < bestC) { bestC = c; best = cand; }
        }
      }
      if (best !== cur) {
        layout.slots[i] = best;
        feet[i] = planetFootprint(layout, best, opts.labels?.[i], opts.phone);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export interface PlacedPlanet { x: number; y: number; front: boolean; z: number }

/** Position zum Zeitpunkt t (Sekunden). Vorne = unterer Halbbogen. */
export function placeOnOrbit(layout: OrbitLayout, slot: OrbitSlot, t = 0): PlacedPlanet {
  const ring = layout.rings[slot.ring];
  const a = slot.angle + (2 * Math.PI * t) / ring.period;
  const x = layout.cx + ring.rx * Math.cos(a);
  const y = layout.cy + ring.ry * Math.sin(a);
  return { x, y, front: Math.sin(a) > 0, z: 10 + Math.round(y) };
}

/**
 * Ruhiges Schweben auf der Stelle (Marius, 23.10.: der Umlauf lenkt ab). Wenige Pixel,
 * sehr langsam, je Planet versetzt, damit nicht alle im Takt atmen.
 */
export const FLOAT = { x: 3, y: 2.5, periodX: 11, periodY: 14 } as const;

export function floatOffset(index: number, t: number): { dx: number; dy: number } {
  const phase = index * 1.7;
  return {
    dx: FLOAT.x * Math.sin((2 * Math.PI * t) / FLOAT.periodX + phase),
    dy: FLOAT.y * Math.sin((2 * Math.PI * t) / FLOAT.periodY + phase * 0.6),
  };
}

/** Abstand zwischen Planetenrand und MÔRAs Kreis (px). Negativ = überlappt. */
export function clearanceFromMora(layout: OrbitLayout, p: { x: number; y: number }, size: number): number {
  return Math.hypot(p.x - layout.cx, p.y - layout.cy) - size / 2 - layout.mora / 2;
}
