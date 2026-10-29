/**
 * Bahnen für das Universe aus echten Planeten (visual-v1, motion.md).
 *
 * Bahn und Position benutzen dieselbe Formel: x = cx + rx·cos(a), y = cy + ry·sin(a).
 * Ein Planet sitzt nie neben seiner Bahn und nie in MÔRAs Kreis. Alles in Pixeln
 * der Fläche, damit es am Handy (390 px) und am Computer gleich rechnet.
 */

export interface OrbitRing { rx: number; ry: number; period: number }
export interface OrbitSlot { ring: number; angle: number; size: number; /** Ruhiges Raster: fester Platz statt Bahn. */ at?: { x: number; y: number } }
export interface OrbitLayout {
  /** Größenfaktor der Fläche (1 bis 1,35): Full HD ist der Hauptfall, dort wächst alles mit. */
  scale: number;
  cx: number;
  cy: number;
  mora: number;
  rings: OrbitRing[];
  slots: OrbitSlot[];
  /** Ruhiges Raster (Pixel-Ansicht): MÔRA oben, Planeten in Reihen nach Wichtigkeit, keine Bahnen. */
  calm?: boolean;
}

export interface OrbitOptions {
  width: number;
  height: number;
  /** Gewicht je Planet (gleiche Reihenfolge wie die Planeten). */
  weights: number[];
  phone: boolean;
  /** Name und Anzahl Monde/Sterne je Planet: damit rechnet die Kollisionsprüfung (Beschriftung, Mondbogen). */
  labels?: PlanetLabel[];
  /** Belegte Spalten links/rechts (Karten, Horizont, Fokus): dort liegt kein Planet und kein Name. */
  insetLeft?: number;
  insetRight?: number;
  /** Pixel-Ansicht: größere MÔRA (Basis in px statt 120) und größere Planetenkörper. */
  moraBase?: number;
  planetMul?: number;
  /** Ruhiges Raster statt Bahnen (nur Computer). */
  calm?: boolean;
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
/** Breite Flächen (Full HD): flachere Bahnen und Bahnbreite aus der Breite, damit das Feld gefüllt wird. */
const WIDE_TILT = 0.45;
const WIDE_ASPECT = 1.4;
const WIDE_RX_SHARE = 0.42;
/** Referenzbreite für den Größenfaktor: schmale Flächen wachsen nicht mit der Höhe allein. */
const SCALE_WIDTH = 860; // layout-1026: freie Spalte zwischen den Panels, nicht Fensterbreite
const SCALE_HEIGHT = 460;

/**
 * Größenfaktor aus der Höhe der Fläche: 1 bei ~640 px (Laptop), bis 1,35 bei Full HD
 * (1920×1080, Fläche ~860 px hoch). Am Handy immer 1.
 */
export function orbitScale(height: number, phone: boolean, width = Infinity): number {
  if (phone) return 1;
  return Math.round(Math.max(1, Math.min(1.35, height / SCALE_HEIGHT, width / SCALE_WIDTH)) * 100) / 100;
}

/** MÔRA ist immer der größte Körper. */
export function moraSize(phone: boolean, scale = 1, base = 120): number {
  return Math.round((phone ? 88 : base) * scale);
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
  const insetLeft = Math.max(0, opts.insetLeft ?? 0);
  const insetRight = Math.max(0, opts.insetRight ?? 0);
  const width = Math.max(0, opts.width - insetLeft - insetRight);
  // In der freien Spalte rechnen, danach die Mitte in die Fläche zurückschieben.
  const local = opts.calm && !opts.phone && opts.weights.length > 0 ? layoutCalm({ ...opts, width }) : layoutInFrame({ ...opts, width });
  if (!insetLeft) return local;
  return { ...local, cx: local.cx + insetLeft, slots: local.slots.map((sl) => (sl.at ? { ...sl, at: { x: sl.at.x + insetLeft, y: sl.at.y } } : sl)) };
}

/** Größenstufen des ruhigen Rasters (px bei Scale 1): wichtig / normal / klein. Gleiche Stufe = gleiche Größe. */
export const CALM_SIZES = [104, 88, 76] as const;
/** Luft über jeder Reihe für den Mondbogen (Radius + Mond − Planetenradius, plus Rand) und unter dem Namen (zweite Zeile). */
const CALM_MOONS = 56;
const CALM_WRAP = 22;
const CALM_GAP = 8;

/**
 * Ruhiges, lesbares Raster: MÔRA mittig oben, darunter die Abteilungen in Reihen. Reihenfolge =
 * Wichtigkeit (Gewicht), links nach rechts, oberste Reihe zuerst; jede Reihe mittig, gleiche Abstände,
 * eine Größenstufe je Gewichtsklasse. Keine Bahnen, kein Zufall – gleiche Daten ergeben immer dasselbe Bild.
 */
export function layoutCalm(opts: OrbitOptions): OrbitLayout {
  const { width, height, weights } = opts;
  const n = weights.length;
  const scale = orbitScale(height, false, width);
  const mora0 = moraSize(false, scale, opts.moraBase);
  const maxW = Math.max(0, ...weights);
  const tier = (w: number) => { const t = maxW > 0 ? w / maxW : 0; return t >= 0.5 ? 0 : t >= 0.12 ? 1 : 2; };
  const order = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i);
  const allSame = order.every((o) => o.w === order[0].w);
  const large = scale >= 1.2;
  const lab = LABEL_SPACE + CALM_WRAP + 6;
  const labelW = large ? 176 : 140;
  const fit = (f: number, cap: number) => {
    const pad = cap > 4 ? 0 : 4;
    const big = Math.max(...weights.map((w) => (allSame ? CALM_SIZES[1] : CALM_SIZES[tier(w)]))) * scale * f;
    // Zellbreite: breiter Name, Mondbogen (0,825·Größe + 84) oder Sternenkranz (Größe + 40), plus Luft.
    const cellW = Math.ceil(Math.max(labelW, big * 0.825 + 84, big + 40) + pad);
    const maxCols = Math.max(1, Math.min(cap, Math.floor((width - 12) / cellW)));
    const rows = Math.ceil(n / maxCols);
    const cols = Math.ceil(n / rows);
    const rowH = big + (lab + CALM_MOONS) * scale; // Schrift und Mondbogen schrumpfen nicht mit
    const mora = mora0 * f;
    return { cellW, cols, rows, big, rowH, mora, total: mora + CALM_GAP * scale * f + rows * rowH };
  };
  // Erst luftig (max. 4 Spalten, volle Größe), dann etwas kleiner, zuletzt breiter statt höher.
  const tries: [number, number][] = [];
  for (let f = 1; f >= 0.8; f = Math.round((f - 0.04) * 100) / 100) tries.push([f, 4]);
  for (let f = 1; f >= 0.5; f = Math.round((f - 0.04) * 100) / 100) tries.push([f, 6]);
  let g = fit(tries[0][0], tries[0][1]);
  let f = tries[0][0];
  for (const [tf, cap] of tries) { f = tf; g = fit(tf, cap); if (g.total <= height) break; }
  const top = Math.max(4, (height - g.total) / 2 - 6);
  const cx = width / 2;
  const cy = top + g.mora / 2;
  const slots: OrbitSlot[] = new Array(n);
  order.forEach((o, rank) => {
    const row = Math.floor(rank / g.cols);
    const inRow = row === g.rows - 1 ? n - row * g.cols : g.cols;
    const col = rank - row * g.cols;
    const size = Math.round((allSame ? CALM_SIZES[1] : CALM_SIZES[tier(o.w)]) * scale * f);
    const x = cx + (col - (inRow - 1) / 2) * g.cellW;
    // Unterkanten bündig: Namen stehen je Reihe auf einer Linie, kleinere Planeten sitzen etwas höher über ihrem Namen.
    const y = top + g.mora + CALM_GAP * scale * f + row * g.rowH + CALM_MOONS * scale + g.big - size / 2;
    // angle π/4: Licht von links oben, Planet „vorne“ (Name darunter, Monde oben).
    slots[o.i] = { ring: 0, angle: Math.PI / 4, size, at: { x, y } };
  });
  return { scale, cx, cy, mora: Math.round(g.mora), rings: [{ rx: 0, ry: 0, period: 1e9 }], slots, calm: true };
}

function layoutInFrame(opts: OrbitOptions): OrbitLayout {
  const { width, height, weights, phone } = opts;
  const scale = orbitScale(height, phone, width);
  const mora = moraSize(phone, scale, opts.moraBase);
  const maxWeight = Math.max(0, ...weights);
  const sizes = weights.map((w) => Math.round(planetSize(w, maxWeight, phone, scale) * (opts.planetMul ?? 1)));
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
  const wide = !phone && width / Math.max(1, height) >= WIDE_ASPECT;
  const tilt = wide ? WIDE_TILT : TILT;
  const maxRx = wide ? Math.max(MAX_RX * scale, width * WIDE_RX_SHARE) : MAX_RX * scale;
  const outerRx = Math.max(0, Math.min(cx - Math.max(biggest / 2, labelHalf) - 8, outerRy / tilt, maxRx));
  // Innen: frei von MÔRA in jeder Richtung. Namen stehen oben über, unten unter dem Planeten
  // (nie zu MÔRA hin); seitlich braucht ein Name seine halbe Breite neben MÔRA.
  const clear = mora / 2 + biggest / 2 + GAP;
  const sideClear = mora / 2 + labelHalf + 8;
  const innerRx = Math.min(outerRx, Math.max(clear, sideClear, outerRx * (counts.length > 1 ? 0.55 : 1)));
  const innerRy = Math.min(outerRy, Math.max(clear, innerRx * tilt));

  const rings: OrbitRing[] = counts.map((_, i) => {
    const t = counts.length === 1 ? 1 : i / (counts.length - 1);
    const rx = counts.length === 1 ? Math.max(innerRx, Math.min(outerRx, Math.max(clear * 1.6, outerRx * 0.8))) : innerRx + (outerRx - innerRx) * t;
    const ry = counts.length === 1 ? Math.max(innerRy, Math.min(outerRy, rx * tilt)) : innerRy + (outerRy - innerRy) * t;
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
    const ry1 = phone ? outerRy * 0.92 : Math.min(outerRy, outerRx * tilt);
    // Organisch statt Sechseck: Gewicht zieht nach innen (bis 3 Bahnen, ±7 %), gleiche Gewichte
    // wechseln sanft; dazu ein kleiner fester Winkelversatz je Planet. Größe folgt der Bahn leicht.
    const order = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i);
    const allSame = order.every((o) => o.w === order[0].w);
    const level = new Array<number>(n);
    order.forEach((o, rank) => { level[o.i] = allSame ? [1, 0, 2][o.i % 3] : Math.min(2, Math.floor((rank * 3) / n)); });
    const fac = [0.9, 0.97, 1.04];
    const ringsO: OrbitRing[] = fac.map((f, k) => ({ rx: outerRx * (phone ? 1 : 0.96) * f, ry: ry1 * f, period: 110 + k * 20 }));
    const jitter = (i: number) => (((i * 7919) % 13) / 13 - 0.5) * 0.16;
    const sizesO = sizes.map((sz, i) => Math.round(sz * [1.08, 1, 0.93][level[i]]));
    for (const damp of [1, 0.6, 0.3, 0]) {
      for (let r = 0; r < 12; r++) {
        const off = -Math.PI / 2 + (r * Math.PI) / (6 * n);
        const even: OrbitLayout = { scale, cx, cy, mora, rings: damp ? ringsO : [ringsO[1]], slots: sizesO.map((size, i) => ({ ring: damp ? level[i] : 0, angle: off + (2 * Math.PI * i) / n + jitter(i) * damp, size: damp ? size : sizes[i] })) };
        if (layoutOverlap(even, ropts, phone ? 0 : 6) === 0) return even;
      }
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
    f.forEach((r) => { total += (mora ? overlap(r, mora, pad) : 0) + outside(r, opts.width, opts.height); });
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
      c += (mora ? overlap(r, mora) : 0) + outside(r, opts.width, opts.height);
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
  if (slot.at) return { x: slot.at.x, y: slot.at.y, front: true, z: 10 + Math.round(slot.at.y) };
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
