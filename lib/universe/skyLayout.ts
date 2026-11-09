/**
 * Home-Himmel: Abteilungen über die ganze Himmelsbreite, ruhig auf einem flachen Bogen,
 * mit Tiefe. Wo echt etwas los ist (weight hoch), steht der Planet vorn: größer und tiefer.
 * Ruhige Planeten liegen fern: kleiner, höher. Reihenfolge bleibt stabil (keine Zufallsstreuung).
 */
export interface SkySlot { x: number; y: number; size: number; depth: number }

/** `scale` (Home, Konzept „ein Universum“): Planeten größer, Abstände/Begrenzung rechnen mit der echten Größe. */
export function skyLayout(weights: number[], width: number, height: number, scale = 1): SkySlot[] {
  const n = weights.length;
  if (!n) return [];
  const max = Math.max(...weights), min = Math.min(...weights);
  const span = max - min || 1;
  const lane = (width * 0.88) / n;
  const base = Math.max(44, Math.min(height * 0.16, lane * 0.4, 96));
  return weights.map((w, i) => {
    const depth = max === min ? 0.5 : (w - min) / span;
    // Organisch: feste, deterministische Streuung je Slot (kein Zufall pro Render).
    const r1 = hash(i * 2 + 1), r2 = hash(i * 2 + 2);
    const x = width * 0.06 + lane * (i + 0.5 + (r1 - 0.5) * 0.3);
    const t = (x / width - 0.5) * 2; // -1 … 1
    const size = Math.round(base * scale * (0.66 + 0.34 * depth));
    // Weiter, flacher Himmel; vorn heißt tiefer, näher am See.
    const y = height * (0.16 + 0.08 * t * t + 0.26 * r2) + height * 0.1 * (depth - 0.5);
    const clampY = Math.max(size / 2 + 8, Math.min(height - size / 2 - 34, y));
    return { x: Math.round(x), y: Math.round(clampY), size, depth: Math.round(depth * 100) / 100 };
  });
}

function hash(n: number): number { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); }
