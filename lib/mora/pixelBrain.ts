/**
 * MÔRAs kleiner Verstand: entscheidet aus echtem Zustand (Planeten-Aktivität, neue Ereignisse, Uhrzeit, Stimmung),
 * wohin sie als Nächstes geht. Rein und deterministisch bei gegebener Zufallsquelle, damit testbar.
 */
export type RoamPoint = { id: string; x: number; y: number; weight: number; /** Planetenradius und Mittelpunkt (relativ zur Mitte) in px, für den Abstand. */ r?: number; px?: number; py?: number };
export type BrainInput = { points: RoamPoint[]; fresh: string | null; night: boolean; busy: boolean; /** Radius von MÔRAs Körper in px: sie landet nie auf einem Planeten. */ moraR?: number };
export type Intent = { kind: 'rest' | 'visit' | 'look' | 'sleep' | 'work'; x: number; y: number; ms: number; id?: string };

const near = (p: RoamPoint) => ({ x: Math.round(p.x * 0.72), y: Math.round(p.y * 0.72 - 10) });
const MARGIN = 10;
/** Ziel nur, wenn MÔRAs Körper dort auf keinem Planeten liegt; sonst Ruhepunkt in der Mitte. */
function safe<T extends { x: number; y: number }>(i: T, input: BrainInput): T | { x: number; y: number } {
  const mr = input.moraR ?? 0; if (!mr) return i;
  const hit = input.points.some((q) => Math.hypot(i.x - (q.px ?? q.x), i.y - (q.py ?? q.y)) < (q.r ?? 0) + mr + MARGIN);
  return hit ? { x: 0, y: 0 } : i;
}

export function decide(input: BrainInput, rand: () => number = Math.random, last?: Intent): Intent {
  if (input.night) return { kind: 'sleep', x: 0, y: 6, ms: 20000 };
  if (input.busy) return { kind: 'work', x: 0, y: 0, ms: 4000 };
  if (input.fresh) { const p = input.points.find((q) => q.id === input.fresh); if (p) return { kind: 'look', ...safe(near(p), input), ms: 6000, id: p.id }; }
  const total = input.points.reduce((s, p) => s + Math.max(0, p.weight), 0);
  const restW = last?.kind === 'visit' ? 3 : 1.5; // nach einem Besuch lieber kurz ausruhen
  let r = rand() * (total + restW);
  if (r < restW || total === 0) return { kind: 'rest', x: Math.round((rand() - 0.5) * 24), y: Math.round((rand() - 0.5) * 12), ms: 5000 + rand() * 5000 };
  r -= restW;
  for (const p of input.points) { r -= Math.max(0, p.weight); if (r <= 0) { if (last?.id === p.id && input.points.length > 1) continue; return { kind: 'visit', ...safe(near(p), input), ms: 6000 + rand() * 6000, id: p.id }; } }
  return { kind: 'rest', x: 0, y: 0, ms: 6000 };
}
