'use client';
import { create } from 'zustand';
import { coreRequest, corePut } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';

export type EventPhase = 'geplant' | 'laeuft' | 'erledigt';
export type DaySync = 'idle' | 'core' | 'local';
interface ServerItem { event_id: string; phase: EventPhase; version: number; updated_at?: string | null; checked_in_at?: string | null }
export interface PhaseResult { phase: EventPhase; conflict: boolean; saved: boolean; version?: number; scope?: string }
interface DayState {
  companyId: string | null;
  identity: string | null;
  phases: Record<string, EventPhase>;
  versions: Record<string, number>;
  since: Record<string, string>;
  pending: Record<string, boolean>;
  sync: DaySync;
  setPhase(eventId: string, phase: EventPhase, expectedVersion?: number, expectedScope?: string): Promise<PhaseResult>;
  loadCompany(companyId: string | null): Promise<void>;
}
const identity = () => {
  const { user, sessionGeneration } = useSessionStore.getState();
  return JSON.stringify([user?.tenant_id, user?.id, sessionGeneration]);
};
const sinceOf = (it: ServerItem) => it.phase === 'laeuft' ? it.checked_in_at || it.updated_at || undefined : undefined;
const valid = (it: unknown): it is ServerItem => {
  const v = it as ServerItem | null;
  return !!v && typeof v.event_id === 'string' && ['geplant', 'laeuft', 'erledigt'].includes(v.phase) && Number.isInteger(v.version) && v.version > 0;
};
let readEpoch = 0;
let scopeEpoch = 0;
const scopeKey = (): string => JSON.stringify([scopeEpoch, identity(), useDayStore.getState().companyId]);

/** CORE is the only durable truth. Failed writes never become a successful local action.
 * State is ephemeral and scoped to the principal AND company. Old browser caches are
 * deliberately not uploaded or rehydrated. Versioned undo cannot erase a newer change.
 */
export const useDayStore = create<DayState>((set, get) => ({
  companyId: null, identity: null, phases: {}, versions: {}, since: {}, pending: {}, sync: 'idle',
  loadCompany: async companyId => {
    const who = identity();
    const epoch = ++readEpoch;
    if (get().companyId !== companyId || get().identity !== who) {
      ++scopeEpoch;
      set({ companyId, identity: who, phases: {}, versions: {}, since: {}, pending: {}, sync: 'idle' });
    }
    if (!companyId) return;
    const current = () => get().companyId === companyId && get().identity === who && identity() === who && readEpoch === epoch;
    try {
      // coreGet's shared in-flight bucket is not principal-scoped. A fresh strict
      // request prevents a new session from joining the previous session's read.
      const raw = await coreRequest(`/v3/appointments/status?company_id=${encodeURIComponent(companyId)}`, { method: 'GET', throwAuthErrors: true });
      if (!current()) return;
      const items: unknown = raw?.items ?? raw?.data?.items;
      if (!Array.isArray(items) || !items.every(valid)) throw new Error('Status nicht bestätigt');
      const phases: Record<string, EventPhase> = {}, versions: Record<string, number> = {}, since: Record<string, string> = {};
      for (const it of items) {
        phases[it.event_id] = it.phase; versions[it.event_id] = it.version;
        const at = sinceOf(it); if (at) since[it.event_id] = at;
      }
      set({ phases, versions, since, sync: 'core' });
    } catch { if (current()) set({ sync: 'local' }); }
  },
  setPhase: async (eventId, phase, expectedVersion, expectedScope) => {
    const companyId = get().companyId, who = get().identity;
    const epoch = scopeEpoch;
    const failed = (): PhaseResult => ({ phase: get().phases[eventId] ?? 'geplant', conflict: false, saved: false });
    const scope = scopeKey();
    if (!companyId || who !== identity() || get().pending[eventId] || (expectedScope !== undefined && expectedScope !== scope)) return failed();
    const expected = expectedVersion ?? get().versions[eventId] ?? 0;
    const current = () => scopeEpoch === epoch && get().companyId === companyId && get().identity === who && identity() === who;
    const apply = (item: ServerItem) => {
      ++readEpoch; // In-flight reads from before the acknowledged write are obsolete.
      set(s => {
        const since = { ...s.since };
        const at = sinceOf(item); if (at) since[eventId] = at; else delete since[eventId];
        return { phases: { ...s.phases, [eventId]: item.phase }, versions: { ...s.versions, [eventId]: item.version }, since, sync: 'core' };
      });
    };
    set(s => ({ pending: { ...s.pending, [eventId]: true } }));
    try {
      const raw = await corePut(`/v3/appointments/${encodeURIComponent(eventId)}/status?company_id=${encodeURIComponent(companyId)}`,
        { phase, expected_version: expected }, { throwAuthErrors: true });
      if (!current()) return failed();
      const item = raw?.data ?? raw;
      if (!valid(item) || item.event_id !== eventId || item.phase !== phase || item.version !== expected + 1) throw new Error('Speichern nicht bestätigt');
      if ((get().versions[eventId] ?? 0) > item.version) return { ...failed(), conflict: true, version: get().versions[eventId] };
      apply(item);
      return { phase: item.phase, conflict: false, saved: true, version: item.version, scope };
    } catch (error) {
      if (!current()) return failed();
      const e = error as { status?: number; details?: { current?: unknown } };
      if (e.status === 409 && valid(e.details?.current) && e.details.current.event_id === eventId) {
        if ((get().versions[eventId] ?? 0) > e.details.current.version) return { ...failed(), conflict: true, version: get().versions[eventId] };
        apply(e.details.current);
        return { phase: e.details.current.phase, conflict: true, saved: false, version: e.details.current.version };
      }
      set({ sync: 'local' });
      return failed();
    } finally {
      if (current()) set(s => { const pending = { ...s.pending }; delete pending[eventId]; return { pending }; });
    }
  },
}));
