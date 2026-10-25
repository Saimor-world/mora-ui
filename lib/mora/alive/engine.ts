/** Pure character reducer. Presentation only: never executes tools or invents completions. */
export const CHARACTER_STATES = ['idle', 'listening', 'thinking', 'working', 'approval', 'done', 'error', 'offline', 'night-rest'] as const;
export type CharacterState = typeof CHARACTER_STATES[number];
export type CharacterSource = 'core' | 'interaction' | 'preview' | 'connection';
export interface CharacterSnapshot { state: CharacterState; source: CharacterSource; event?: string }
type JobState = 'working' | 'approval' | 'done' | 'error';
export interface CharacterEngine {
  connected: boolean;
  jobs: Record<string, { state: JobState; at: number }>;
  interaction: 'idle' | 'listening' | 'thinking';
}
export type CharacterInput =
  | { type: 'connection'; connected: boolean }
  | { type: 'interaction'; state: CharacterEngine['interaction'] }
  | { type: 'job'; id: string; state: JobState; at: number };
export const initialCharacter: CharacterEngine = { connected: false, jobs: {}, interaction: 'idle' };
export function reduceCharacter(engine: CharacterEngine, input: CharacterInput): CharacterEngine {
  if (input.type === 'connection') return { ...initialCharacter, connected: input.connected };
  if (input.type === 'interaction') return { ...engine, interaction: input.state };
  if (!input.id.trim() || !Number.isFinite(input.at)) return engine;
  const previous = engine.jobs[input.id];
  if (previous && (previous.at > input.at || ((previous.state === 'done' || previous.state === 'error') && (input.state === 'working' || input.state === 'approval')))) return engine;
  // Bounded memory. Old active jobs expire visually, never become "done" by timeout.
  const jobs = Object.fromEntries(Object.entries(engine.jobs).filter(([, job]) => input.at - job.at < 300_000).slice(-127));
  jobs[input.id] = { state: input.state, at: input.at };
  return { ...engine, connected: true, jobs };
}
export function resolveCharacter(engine: CharacterEngine, now: number, night = false): CharacterSnapshot {
  if (!engine.connected) return { state: 'offline', source: 'connection' };
  const jobs = Object.entries(engine.jobs).filter(([, job]) => now - job.at < (job.state === 'done' || job.state === 'error' ? 4000 : 120_000));
  for (const state of ['approval', 'working', 'error', 'done'] as const) {
    const match = jobs.find(([, job]) => job.state === state);
    if (match) return { state, source: 'core', event: match[0] };
  }
  return { state: engine.interaction !== 'idle' ? engine.interaction : night ? 'night-rest' : 'idle', source: 'interaction' };
}
export function executionInput(kind: string, data: unknown, now: number): CharacterInput | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.journal_id !== 'string' || !d.journal_id.trim()) return null;
  const state = kind === 'mora.execution.started' || kind === 'mora.execution.progress' ? 'working'
    : kind === 'mora.execution.done' && d.ok === true ? 'done'
    : kind === 'mora.execution.failed' && d.ok === false ? 'error' : null;
  return state ? { type: 'job', id: `execution:${d.journal_id}`, state, at: now } : null;
}
export function actionInput(data: unknown, now: number): CharacterInput | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.action_id !== 'string' || !d.action_id.trim()) return null;
  const state = d.status === 'pending_confirmation' || d.status === 'proposed' ? 'approval'
    : d.status === 'running' ? 'working' : d.status === 'done' ? 'done'
    : ['failed', 'rejected', 'expired'].includes(String(d.status)) ? 'error' : null;
  const at = typeof d.timestamp === 'string' ? Date.parse(d.timestamp) : now;
  if (!state || !Number.isFinite(at) || at > now + 5000 || now - at > 120_000) return null;
  return { type: 'job', id: `action:${d.action_id}`, state, at };
}
export const CHARACTER_LABEL: Record<CharacterState, string> = {
  idle: 'Bei dir', listening: 'Hört zu', thinking: 'Denkt nach', working: 'Arbeitet', approval: 'Braucht deine Freigabe',
  done: 'Abgeschlossen', error: 'Etwas braucht Aufmerksamkeit', offline: 'CORE nicht verbunden', 'night-rest': 'Nachtruhe',
};
