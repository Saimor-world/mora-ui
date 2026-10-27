/**
 * Glas-Ansicht: ruhige Konstellation. MÔRA schwebt als Mitte des Feldes, die Abteilungen liegen
 * locker und ausgewogen auf einem weiten Bogen um sie (ganze Fensterbreite, viel Leerraum).
 * Die Größe kommt allein aus der echten Zahl (Ordner + Einträge), begrenzt auf einen engen Bereich.
 * Dieselbe Vertragsform wie layoutOrbits (OrbitLayout, slot.pos), damit Kamera, Fokus und Tests gleich bleiben.
 * Die Verteilung ist deterministisch: gleiche Abteilungen ergeben immer dasselbe Bild.
 */
import { labelWidth, type OrbitLayout, type OrbitOptions } from './worldOrbits';

/** Kleinster Planet = 62 % des größten: genug Unterschied, nie ein Winzling neben einem Riesen. */
const MIN_RATIO = 0.62;
const GAP = 26;
/** Winkel- und Radiusversatz je Platz: locker, aber nie zufällig. */
const JITTER_DEG = [0, 11, -8, 7, -12, 9, -6, 10];
const RADIUS_MUL = [1, 0.84, 0.97, 0.8, 0.93, 0.88, 0.99, 0.82];

interface Box { x: number; y: number; w: number; h: number; s: number }

/** Planetengröße aus dem echten Gewicht: Wurzel (flächentreu), begrenzt auf [MIN_RATIO·max, max]. */
export function glassPlanetSize(weight: number, maxWeight: number, maxSize: number): number {
  const t = maxWeight > 0 ? Math.max(0, Math.min(1, weight / maxWeight)) : 0;
  return Math.round(maxSize * (MIN_RATIO + (1 - MIN_RATIO) * Math.sqrt(t)));
}

/** Schritt, der n Plätze so durchläuft, dass aufeinanderfolgende Ränge weit auseinander liegen (teilerfremd zu n). */
function spreadStep(n: number): number {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  let step = Math.max(1, Math.round(n * 0.4));
  while (n > 1 && gcd(step, n) !== 1) step++;
  return step;
}

export function glassLayout(opts: OrbitOptions & { reserveMora?: boolean }): OrbitLayout {
  const { width, height, phone, weights } = opts;
  const insetLeft = opts.insetLeft ?? 0;
  const insetRight = opts.insetRight ?? 0;
  const n = weights.length;
  const reserveMora = opts.reserveMora !== false;
  const scale = phone ? 1 : width - insetLeft - insetRight >= 1100 ? 1.2 : 1;
  const mora = phone ? 64 : 96;
  const x0 = insetLeft + (phone ? 10 : 48);
  const x1 = width - insetRight - (phone ? 10 : 48);
  const cx = (x0 + x1) / 2;
  const top = phone ? 26 : 44;
  const labelH = phone ? 40 : 50 * (scale >= 1.2 ? 1.15 : 1);
  const bottomEdge = height - 4;
  const regionW = x1 - x0;
  const maxW = Math.max(1e-6, ...weights);
  const focus = !reserveMora && n !== 2 ? weights.indexOf(Math.max(...weights)) : -1;

  const base = Math.max(phone ? 64 : 92, Math.min(phone ? 100 : 190, Math.min(regionW / (phone ? 3.6 : 6.4), (bottomEdge - top) / (phone ? 4.2 : 3.2))));
  const sizeAt = (i: number, k: number) => glassPlanetSize(weights[i], maxW, Math.round(base * k));

  const place = (k: number): { boxes: Box[]; cy: number } => {
    const sizes = weights.map((_, i) => sizeAt(i, k));
    const maxS = Math.max(0, ...sizes);
    // Mitte des Feldes: die Planetenmitten liegen so, dass oben der größte Planet und unten sein Label noch hineinpassen.
    const yMin = top + maxS / 2;
    const yMax = bottomEdge - labelH - 8 - maxS / 2;
    const cy = (yMin + yMax) / 2;
    const ry = Math.max(40, (yMax - yMin) / 2);
    const rx = Math.max(60, regionW / 2 - Math.max(maxS, phone ? 70 : 150) / 2);
    const step = spreadStep(n);
    const rank = weights.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w || a.i - b.i);
    const slotOf: number[] = [];
    rank.forEach((r, j) => { slotOf[r.i] = (j * step) % Math.max(1, n); });
    const boxes: Box[] = weights.map((_, i) => {
      const s = sizes[i];
      const w = Math.max(s, labelWidth(opts.labels?.[i]?.name ?? '', phone, scale));
      const slot = slotOf[i];
      const a = (-90 + 360 * (slot + 0.5) / n + (phone ? 0 : -14) + JITTER_DEG[slot % JITTER_DEG.length] * (n > 4 ? 1 : 0.5)) * Math.PI / 180;
      const rm = RADIUS_MUL[slot % RADIUS_MUL.length];
      // Dock-only MÔRA leaves no invisible central obstacle. Give the largest real
      // department the focal position and balance the others around it.
      const rankIndex = rank.findIndex((r) => r.i === i);
      if (!reserveMora) {
        if (n === 1 || (n > 2 && rankIndex === 0)) {
          return { x: cx, y: cy, w, h: s + 8 + labelH, s };
        }
        if (n === 2) {
          return { x: cx + (rankIndex === 0 ? -1 : 1) * rx * .58,
            y: cy, w, h: s + 8 + labelH, s };
        }
        const angle = (-135 + 360 * (rankIndex - 1) / (n - 1)) * Math.PI / 180;
        return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry,
          w, h: s + 8 + labelH, s };
      }
      return { x: cx + Math.cos(a) * rx * rm, y: cy + Math.sin(a) * ry * rm, w, h: s + 8 + labelH, s };
    });
    const rect = (b: Box) => ({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.s / 2, b: b.y - b.s / 2 + b.h });
    const clearR = reserveMora ? mora / 2 + (phone ? 34 : 64) : 0; // freie Luft um MÔRA
    for (let it = 0; it < 260; it++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = rect(boxes[i]); const c = rect(boxes[j]);
          const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l) + GAP;
          const oy = Math.min(a.b, c.b) - Math.max(a.t, c.t) + GAP;
          if (ox > 0 && oy > 0) {
            if (ox < oy) {
              const d = (ox / 2) * (boxes[i].x < boxes[j].x ? -1 : 1);
              if (i === focus) boxes[j].x -= d * 2;
              else if (j === focus) boxes[i].x += d * 2;
              else { boxes[i].x += d; boxes[j].x -= d; }
            } else {
              const d = (oy / 2) * (boxes[i].y < boxes[j].y ? -1 : 1);
              if (i === focus) boxes[j].y -= d * 2;
              else if (j === focus) boxes[i].y += d * 2;
              else { boxes[i].y += d; boxes[j].y -= d; }
            }
          }
        }
        const b = boxes[i];
        // MÔRAs Luft: der Planet (samt Label) bleibt außerhalb eines Kreises um sie, radial nach außen.
        const near = rect(b);
        const px = Math.max(near.l, Math.min(cx, near.r)); const py = Math.max(near.t, Math.min(cy, near.b));
        const dd = Math.hypot(px - cx, py - cy);
        if (dd < clearR) {
          const ux = b.x - cx; const uy = b.y - cy; const u = Math.hypot(ux, uy) || 1;
          b.x += (ux / u) * (clearR - dd); b.y += (uy / u) * (clearR - dd);
        }
        b.x = Math.max(x0 + b.w / 2, Math.min(x1 - b.w / 2, b.x));
        b.y = Math.max(top + b.s / 2, Math.min(bottomEdge - b.h + b.s / 2, b.y));
      }
    }
    return { boxes, cy };
  };
  const overlaps = (boxes: Box[]) => boxes.some((a, i) => boxes.some((c, j) => {
    if (j <= i) return false;
    const ra = { l: a.x - a.w / 2, r: a.x + a.w / 2, t: a.y - a.s / 2, b: a.y - a.s / 2 + a.h };
    const rc = { l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.y - c.s / 2, b: c.y - c.s / 2 + c.h };
    return Math.min(ra.r, rc.r) > Math.max(ra.l, rc.l) && Math.min(ra.b, rc.b) > Math.max(ra.t, rc.t);
  }));
  let k = 1;
  let { boxes, cy } = place(k);
  for (let tries = 0; tries < 10 && overlaps(boxes); tries++) { k *= 0.92; ({ boxes, cy } = place(k)); }

  return {
    scale, cx, cy, mora, rings: [],
    slots: boxes.map((b) => ({ ring: 0, angle: Math.atan2(b.y - cy, b.x - cx), size: b.s, pos: { x: b.x, y: b.y } })),
    flat: true, compact: false,
  };
}
