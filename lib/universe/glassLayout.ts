/**
 * Glas-Ansicht (konzept2): keine Bahnen, keine Linien. Die Planeten liegen ruhig und
 * ungleich verstreut im freien Feld, MÔRA sitzt klein unten in der Mitte. Dieselbe
 * Vertragsform wie layoutOrbits (OrbitLayout, slot.pos), damit Kamera, Fokus und Tests gleich bleiben.
 * Die Verteilung ist deterministisch: gleiche Abteilungen ergeben immer dasselbe Bild.
 */
import { labelWidth, type OrbitLayout, type OrbitOptions } from './worldOrbits';

/** Unterschiedliche Größen, damit das Feld nicht wie ein Raster wirkt (wird mit dem echten Gewicht gemischt). */
const SIZE_PATTERN = [1, 0.7, 0.86, 0.58, 0.78, 0.92, 0.64, 0.74];
const GAP = 22;

interface Box { x: number; y: number; w: number; h: number; s: number }

export function glassLayout(opts: OrbitOptions): OrbitLayout {
  const { width, height, phone, weights } = opts;
  const insetLeft = opts.insetLeft ?? 0;
  const insetRight = opts.insetRight ?? 0;
  const n = weights.length;
  const scale = phone ? 1 : width - insetLeft - insetRight >= 1100 ? 1.2 : 1;
  const mora = phone ? 64 : 96;
  const x0 = insetLeft + (phone ? 12 : 40);
  const x1 = width - insetRight - (phone ? 12 : 40);
  const cx = (x0 + x1) / 2 - (phone ? 0 : 0);
  const cy = height - mora / 2 - 6;
  const top = phone ? 30 : 56;
  const labelH = phone ? 40 : 50 * (scale >= 1.2 ? 1.15 : 1);
  const bottom = cy - mora / 2 - 28; // unter dieser Linie (über MÔRA) endet das Planetenfeld
  const regionW = x1 - x0;
  const regionH = Math.max(120, bottom - top);

  const maxW = Math.max(1e-6, ...weights);
  const base = Math.max(phone ? 64 : 92, Math.min(phone ? 104 : 176, Math.min(regionW / (phone ? 3.3 : 5), regionH / (phone ? 3.4 : 2.5))));
  const sizeAt = (i: number, k: number) => Math.round(base * k * SIZE_PATTERN[i % SIZE_PATTERN.length] * (0.88 + 0.12 * (weights[i] / maxW)));

  const place = (k: number): Box[] => {
    const boxes: Box[] = weights.map((_, i) => {
      const s = sizeAt(i, k);
      const w = Math.max(s, labelWidth(opts.labels?.[i]?.name ?? '', phone, scale));
      return { x: 0, y: 0, w, h: s + 8 + labelH, s };
    });
    // Start: Goldener Winkel in der Ellipse des Feldes – ungleich, aber nie zufällig.
    boxes.forEach((b, i) => {
      const t = (i + 0.6) / (n + 0.2);
      const r = Math.sqrt(t);
      const a = i * 2.39996 + 0.5;
      b.x = x0 + regionW / 2 + Math.cos(a) * r * (regionW / 2 - b.w / 2);
      b.y = top + regionH / 2 + Math.sin(a) * r * (regionH / 2 - b.h / 2) - b.h / 2 + b.s / 2 + b.h / 2 - b.s / 2;
    });
    const moraBox = { x: cx, y: cy, w: mora + 120, h: mora + 70 };
    const rect = (b: Box) => ({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.s / 2, b: b.y - b.s / 2 + b.h });
    for (let it = 0; it < 260; it++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = rect(boxes[i]); const c = rect(boxes[j]);
          const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l) + GAP;
          const oy = Math.min(a.b, c.b) - Math.max(a.t, c.t) + GAP;
          if (ox > 0 && oy > 0) {
            if (ox < oy) { const d = (ox / 2) * (boxes[i].x < boxes[j].x ? -1 : 1); boxes[i].x += d; boxes[j].x -= d; }
            else { const d = (oy / 2) * (boxes[i].y < boxes[j].y ? -1 : 1); boxes[i].y += d; boxes[j].y -= d; }
          }
        }
        const a = rect(boxes[i]);
        const mx = Math.min(a.r, moraBox.x + moraBox.w / 2) - Math.max(a.l, moraBox.x - moraBox.w / 2) + GAP;
        const my = Math.min(a.b, moraBox.y + moraBox.h / 2) - Math.max(a.t, moraBox.y - moraBox.h / 2) + GAP;
        if (mx > 0 && my > 0) boxes[i].y -= my; // immer nach oben aus MÔRAs Feld
        const b = boxes[i];
        b.x = Math.max(x0 + b.w / 2, Math.min(x1 - b.w / 2, b.x));
        b.y = Math.max(top + b.s / 2, Math.min(bottom - b.h + b.s / 2, b.y));
      }
    }
    return boxes;
  };
  const overlaps = (boxes: Box[]) => boxes.some((a, i) => boxes.some((c, j) => {
    if (j <= i) return false;
    const ra = { l: a.x - a.w / 2, r: a.x + a.w / 2, t: a.y - a.s / 2, b: a.y - a.s / 2 + a.h };
    const rc = { l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.y - c.s / 2, b: c.y - c.s / 2 + c.h };
    return Math.min(ra.r, rc.r) > Math.max(ra.l, rc.l) && Math.min(ra.b, rc.b) > Math.max(ra.t, rc.t);
  }));
  let k = 1;
  let boxes = place(k);
  for (let tries = 0; tries < 10 && overlaps(boxes); tries++) { k *= 0.92; boxes = place(k); }

  return {
    scale, cx, cy, mora, rings: [],
    slots: boxes.map((b) => ({ ring: 0, angle: Math.atan2(b.y - cy, b.x - cx), size: b.s, pos: { x: b.x, y: b.y } })),
    flat: true, compact: false,
  };
}
