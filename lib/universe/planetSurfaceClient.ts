import { renderPlanetSurface, type PlanetSurfaceOptions, type PlanetSurfaceResult, type SurfaceKind } from '@/public/universe/planet-surface-worker';
export type { PlanetSurfaceOptions, PlanetSurfaceResult, SurfaceKind };

const pending = new Map<number, { options: PlanetSurfaceOptions; resolve: (result: PlanetSurfaceResult) => void }>();
const cache = new Map<string, Promise<PlanetSurfaceResult>>();
let worker: Worker | null = null;
let workerFailed = false;
let nextId = 0;

function fallback(options: PlanetSurfaceOptions, resolve: (result: PlanetSurfaceResult) => void) {
  // Older browsers can still show the material, once, without an animation loop.
  window.setTimeout(() => resolve(renderPlanetSurface(options)), 0);
}
function getWorker(): Worker | null {
  if (worker || workerFailed) return worker;
  if (typeof Worker === 'undefined') { workerFailed = true; return null; }
  try {
    worker = new Worker('/universe/planet-surface-worker.js');
    worker.onmessage = (event: MessageEvent<PlanetSurfaceResult & { id: number; error?: string }>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      if (event.data.error) fallback(job.options, job.resolve);
      else job.resolve({ width: event.data.width, rgba: event.data.rgba });
    };
    worker.onerror = event => {
      event.preventDefault(); workerFailed = true;
      worker?.terminate(); worker = null;
      pending.forEach(job => fallback(job.options, job.resolve)); pending.clear();
    };
  } catch { workerFailed = true; worker = null; }
  return worker;
}

/** Bounded, shared cache. Size/lighting changes do not start per-frame texture work. */
export function loadPlanetSurface(options: PlanetSurfaceOptions): Promise<PlanetSurfaceResult> {
  const key = [options.width, options.kind, options.hue.join(','), options.seed, options.lit.toFixed(2), !!options.quiet, options.environment?.key, options.center?.join(','), options.radius?.join(',')].join('|');
  const hit = cache.get(key); if (hit) return hit;
  const result = new Promise<PlanetSurfaceResult>(resolve => {
    const renderer = getWorker();
    if (!renderer) { fallback(options, resolve); return; }
    const id = ++nextId; pending.set(id, { options, resolve }); renderer.postMessage({ id, options });
  });
  if (cache.size >= 48) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}

export function planetSurfaceKind(name: string, archetype?: string | null): SurfaceKind {
  const archetypes: Record<string, SurfaceKind> = {
    'gas-gold': 'gas', ocean: 'ocean', 'marble-indigo': 'marble', ice: 'ice',
    'copper-rock': 'rock', forest: 'forest', coral: 'rock', 'nebula-violet': 'marble',
    'sand-dune': 'dune', 'crystal-teal': 'ice', ember: 'volcanic', pearl: 'ice',
  };
  if (archetype && archetypes[archetype]) return archetypes[archetype];
  if (/finanz|finance|geld|buchhalt/i.test(name)) return 'gas';
  if (/post|termin|mail|kalender/i.test(name)) return 'ocean';
  if (/wissen|knowledge|doku/i.test(name)) return 'marble';
  if (/wache|security|sicher|research|forschung|r&d/i.test(name)) return 'ice';
  if (/growth|wachstum|menschen|team/i.test(name)) return 'forest';
  if (/intelligence|analyse|markt/i.test(name)) return 'dune';
  return 'rock';
}
