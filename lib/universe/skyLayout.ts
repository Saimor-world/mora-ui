/**
 * Home-Himmel: Abteilungen über die ganze Himmelsbreite, ruhig auf einem flachen Bogen,
 * mit Tiefe. Wo echt etwas los ist (weight hoch), steht der Planet vorn: größer und tiefer.
 * Ruhige Planeten liegen fern: kleiner, höher. Reihenfolge bleibt stabil (keine Zufallsstreuung).
 */
export interface SkySlot { x: number; y: number; size: number; depth: number }

export function skyLayout(weights: number[], width: number, height: number): SkySlot[] {
  const n = weights.length;
  if (!n) return [];
  const max = Math.max(...weights), min = Math.min(...weights);
  const span = max - min || 1;
  const lane = (width * 0.88) / n;
  const base = Math.max(44, Math.min(height * 0.16, lane * 0.4, 96));
  return weights.map((w, i) => {
    const depth = max === min ? 0.5 : (w - min) / span;
    const x = width * 0.06 + lane * (i + 0.5);
    const t = (x / width - 0.5) * 2; // -1 … 1
    const size = Math.round(base * (0.72 + 0.28 * depth));
    // Bogen: Mitte hoch, Ränder tiefer; vorn heißt näher am See.
    const y = height * (0.2 + 0.14 * t * t) + height * 0.06 * (depth - 0.5) + (i % 2 ? height * 0.09 : 0);
    const clampY = Math.max(size / 2 + 8, Math.min(height - size / 2 - 34, y));
    return { x: Math.round(x), y: Math.round(clampY), size, depth: Math.round(depth * 100) / 100 };
  });
}
