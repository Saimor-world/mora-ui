import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

/** Spec: /nightwatch/avatar/VERHALTEN.md — morning fly-in ~5 min after the first open of the day, at once on CRIT. */
export const VISIT_DELAY_MS = 5 * 60_000;
export const VISIT_KEY = 'saimor.nightwatch.visit';

export interface VisitState { day: string; firstOpenAt: number; dismissed: boolean }

const RESOLVED = new Set(['resolved', 'dismissed', 'closed']);
export const isOpen = (i: NightwatchIncidentItem) => !RESOLVED.has(String(i.status || 'open').toLowerCase());
export const isCritical = (i: NightwatchIncidentItem) => isOpen(i) && /^(crit|critical)$/i.test(String(i.severity || ''));

export function localDay(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Keeps the first open of today; a stored state from an earlier day starts a fresh day. */
export function rollVisit(stored: VisitState | null, now: Date): VisitState {
  const day = localDay(now);
  if (stored && stored.day === day) return stored;
  return { day, firstOpenAt: now.getTime(), dismissed: false };
}

/** ms until the owl should appear: 0 = now, null = not today (dismissed, unless something critical is open). */
export function visitDelay(state: VisitState, now: Date, critical: boolean): number | null {
  if (critical) return 0;
  if (state.dismissed) return null;
  return Math.max(0, state.firstOpenAt + VISIT_DELAY_MS - now.getTime());
}

export interface NightPoint { tone: 'crit' | 'warn' | 'ok'; text: string }

/**
 * Three-point night report from CORE incidents (there is no night-report endpoint yet;
 * the report is derived from /v3/nightwatch/incidents?include_resolved=true). Nothing invented:
 * with no data the report says so.
 */
export function nightReport(incidents: NightwatchIncidentItem[] | null, now: Date, healthScore?: number | null): NightPoint[] {
  if (!incidents) return [{ tone: 'warn', text: 'CORE hat mir heute Nacht keinen Stand geliefert. Ruhe heißt das nicht.' }];
  const since = now.getTime() - 16 * 3_600_000;
  const t = (i: NightwatchIncidentItem) => Date.parse(i.updated_at || i.detected_at || '') || 0;
  const open = incidents.filter(isOpen);
  const crit = open.filter(isCritical);
  const resolvedNight = incidents.filter((i) => !isOpen(i) && t(i) >= since);
  const name = (i: NightwatchIncidentItem) => i.title || i.host || 'Vorfall';
  const points: NightPoint[] = [];
  if (crit.length) points.push({ tone: 'crit', text: `${crit.length === 1 ? 'Kritisch' : `${crit.length} kritisch`}: ${crit.slice(0, 2).map(name).join(', ')}.` });
  if (open.length - crit.length > 0) points.push({ tone: 'warn', text: `${open.length - crit.length} offene${open.length - crit.length === 1 ? 'r Vorfall' : ' Vorfälle'}: ${open.filter((i) => !isCritical(i)).slice(0, 2).map(name).join(', ')}.` });
  if (!open.length) points.push({ tone: 'ok', text: 'Keine offenen Vorfälle. Die Nacht war ruhig.' });
  points.push(resolvedNight.length
    ? { tone: 'ok', text: `${resolvedNight.length} ${resolvedNight.length === 1 ? 'Vorfall' : 'Vorfälle'} über Nacht gelöst: ${resolvedNight.slice(0, 2).map(name).join(', ')}.` }
    : { tone: 'ok', text: 'Über Nacht musste nichts gelöst werden.' });
  if (typeof healthScore === 'number') points.push({ tone: healthScore >= 80 ? 'ok' : 'warn', text: `Systemzustand laut CORE: ${Math.round(healthScore)} von 100.` });
  return points.slice(0, 3);
}
