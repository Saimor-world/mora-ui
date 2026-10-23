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
}

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

export function layoutOrbits({ width, height, weights, phone }: OrbitOptions): OrbitLayout {
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
  const counts = ringCounts(weights.length);

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
    return { rx, ry: Math.min(ry, rx), period: 120 + i * 30 };
  });

  const slots: OrbitSlot[] = [];
  let k = 0;
  counts.forEach((count, ring) => {
    for (let i = 0; i < count; i++, k++) slots.push({ ring, angle: startAngle(i, count, ring), size: sizes[k] });
  });
  return { scale, cx, cy, mora, rings, slots };
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
