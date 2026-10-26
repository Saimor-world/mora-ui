/**
 * MÔRAs kleiner Verstand: entscheidet aus echtem Zustand (Planeten-Aktivität, neue Ereignisse, Uhrzeit, Stimmung),
 * wohin sie als Nächstes geht. Rein und deterministisch bei gegebener Zufallsquelle, damit testbar.
 */
export type RoamPoint = { id: string; x: number; y: number; weight: number };
export type BrainInput = { points: RoamPoint[]; fresh: string | null; night: boolean; busy: boolean };
export type Intent = { kind: 'rest' | 'visit' | 'look' | 'sleep' | 'work'; x: number; y: number; ms: number; id?: string };

const near = (p: RoamPoint) => ({ x: Math.round(p.x * 0.72), y: Math.round(p.y * 0.72 - 18) });

export function decide(input: BrainInput, rand: () => number = Math.random, last?: Intent): Intent {
  if (input.night) return { kind: 'sleep', x: 0, y: 6, ms: 20000 };
  if (input.busy) return { kind: 'work', x: 0, y: 0, ms: 4000 };
  if (input.fresh) { const p = input.points.find((q) => q.id === input.fresh); if (p) return { kind: 'look', ...near(p), ms: 6000, id: p.id }; }
  const total = input.points.reduce((s, p) => s + Math.max(0, p.weight), 0);
  const restW = last?.kind === 'visit' ? 3 : 1.5; // nach einem Besuch lieber kurz ausruhen
  let r = rand() * (total + restW);
  if (r < restW || total === 0) return { kind: 'rest', x: Math.round((rand() - 0.5) * 24), y: Math.round((rand() - 0.5) * 12), ms: 5000 + rand() * 5000 };
  r -= restW;
  for (const p of input.points) { r -= Math.max(0, p.weight); if (r <= 0) { if (last?.id === p.id && input.points.length > 1) continue; return { kind: 'visit', ...near(p), ms: 6000 + rand() * 6000, id: p.id }; } }
  return { kind: 'rest', x: 0, y: 0, ms: 6000 };
}
