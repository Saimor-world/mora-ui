/**
 * MÔRA live run (CORE GET /v3/mora/live, owner-only SSE).
 * Pure state + mapping, kept free of React so it is testable and so a new
 * MÔRA figure can reuse it unchanged.
 */
export type LiveKind = 'task.started' | 'step.started' | 'step.finished' | 'task.done';
export interface LiveTarget { department_id?: string; space_id?: string; name?: string }
export interface LiveEvent { kind: LiveKind; run: string; source: string; label: string; target: LiveTarget | null; ts: number }
export interface LiveState { run: string | null; active: boolean; done: boolean; label: string | null; target: LiveTarget | null; source: string | null }

export const IDLE_LIVE: LiveState = { run: null, active: false, done: false, label: null, target: null, source: null };
const KINDS = new Set<LiveKind>(['task.started', 'step.started', 'step.finished', 'task.done']);

export function parseLiveEvent(raw: string): LiveEvent | null {
  try {
    const e = JSON.parse(raw) as Partial<LiveEvent>;
    if (!e || typeof e.kind !== 'string' || !KINDS.has(e.kind as LiveKind) || typeof e.run !== 'string') return null;
    return { kind: e.kind as LiveKind, run: e.run, source: String(e.source ?? ''), label: String(e.label ?? '').slice(0, 80), target: e.target && typeof e.target === 'object' ? e.target : null, ts: Number(e.ts) || Date.now() };
  } catch { return null; }
}

export function reduceLive(s: LiveState, e: LiveEvent): LiveState {
  if (e.kind === 'task.started') return { run: e.run, active: true, done: false, label: null, target: e.target, source: e.source };
  if (s.run && e.run !== s.run) return s; // late events of an older run
  if (e.kind === 'step.started') return { ...s, run: e.run, active: true, done: false, label: e.label || s.label, target: e.target ?? s.target, source: e.source };
  if (e.kind === 'step.finished') return { ...s, target: e.target ?? s.target };
  return { ...s, active: false, done: true, label: e.label || 'Fertig' };
}

interface PlanetLike { id: string; name: string; moons?: { id: string }[] }

/** Real target → planet id in the current Universe. Unknown target → null (MÔRA stays in the centre). */
export function planetForTarget(target: LiveTarget | null, planets: PlanetLike[]): string | null {
  if (!target) return null;
  if (target.department_id) { const p = planets.find((x) => x.id === target.department_id); if (p) return p.id; }
  if (target.space_id) { const p = planets.find((x) => x.moons?.some((m) => m.id === target.space_id)); if (p) return p.id; }
  if (target.name) { const n = target.name.trim().toLowerCase(); const p = planets.find((x) => x.name.trim().toLowerCase() === n); if (p) return p.id; }
  return null;
}
