'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { coreGet, corePut } from '@/lib/api/http';

/**
 * Status eines Termins im Laufe des Tages („Michelle ist da“, „abgeschlossen“).
 * Quelle ist CORE (/v3/appointments/status), getrennt von den Kalenderdaten – ein
 * Google-Abgleich überschreibt ihn nicht. Jede Änderung trägt die bekannte Version;
 * hat ein anderes Gerät inzwischen geschrieben, antwortet CORE mit 409 und wir
 * übernehmen dessen Stand. Ist CORE nicht erreichbar, bleibt der Stand auf diesem
 * Gerät (localStorage, je Firma) und wird beim nächsten Laden erneut abgeglichen.
 * Ohne Klick bleibt ein Termin „geplant“.
 */
export type EventPhase = 'geplant' | 'laeuft' | 'erledigt';
export type DaySync = 'idle' | 'core' | 'local';

interface ServerItem { event_id: string; phase: EventPhase; version: number; updated_at?: string | null; checked_in_at?: string | null }

/** Ergebnis einer Änderung: `conflict` heißt, CORE hatte schon einen anderen Stand – der gilt jetzt. */
export interface PhaseResult { phase: EventPhase; conflict: boolean }

/** Zeitpunkt des Check-ins: eigenes Feld von CORE, sonst updated_at. */
const sinceOf = (it: ServerItem): string | undefined => (it.phase === 'laeuft' ? (it.checked_in_at || it.updated_at || undefined) : undefined);

interface DayState {
  companyId: string | null;
  phases: Record<string, EventPhase>;
  versions: Record<string, number>;
  /** Seit wann ein Termin läuft (ISO), echter Check-in statt geplantem Start. */
  since: Record<string, string>;
  /** Lokaler Stand je Firma, falls CORE nicht erreichbar ist. */
  cache: Record<string, Record<string, EventPhase>>;
  sync: DaySync;
  setPhase(eventId: string, phase: EventPhase): Promise<PhaseResult>;
  loadCompany(companyId: string | null): Promise<void>;
}

const statusPath = (companyId: string) => `/v3/appointments/status?company_id=${encodeURIComponent(companyId)}`;
const putPath = (companyId: string, eventId: string) =>
  `/v3/appointments/${encodeURIComponent(eventId)}/status?company_id=${encodeURIComponent(companyId)}`;

function conflictCurrent(err: unknown): ServerItem | null | undefined {
  const e = err as { status?: number; details?: { current?: ServerItem | null } | null };
  if (e?.status !== 409) return undefined;
  return e.details?.current ?? null;
}

export const useDayStore = create<DayState>()(
  persist(
    (set, get) => ({
      companyId: null,
      phases: {},
      versions: {},
      since: {},
      cache: {},
      sync: 'idle',

      loadCompany: async (companyId) => {
        // Sitzungswechsel: nie den Stand einer anderen Firma zeigen.
        if (get().companyId !== companyId) {
          set((s) => ({ companyId, phases: companyId ? { ...(s.cache[companyId] ?? {}) } : {}, versions: {}, since: {}, sync: 'idle' }));
        }
        if (!companyId) return;
        try {
          const raw = await coreGet(statusPath(companyId), { isOptional: true });
          if (get().companyId !== companyId) return;
          if (!raw) { set({ sync: 'local' }); return; } // CORE nicht erreichbar oder abgemeldet
          const items: ServerItem[] = raw?.items ?? raw?.data?.items ?? [];
          const phases: Record<string, EventPhase> = {};
          const versions: Record<string, number> = {};
          const since: Record<string, string> = {};
          for (const it of items) {
            phases[it.event_id] = it.phase; versions[it.event_id] = it.version;
            const t = sinceOf(it); if (t) since[it.event_id] = t;
          }
          set((s) => ({ phases, versions, since, sync: 'core', cache: { ...s.cache, [companyId]: phases } }));
        } catch {
          set({ sync: 'local' });
        }
      },

      setPhase: async (eventId, phase) => {
        const companyId = get().companyId;
        const apply = (p: EventPhase, version?: number, at?: string) =>
          set((s) => {
            const phases = { ...s.phases, [eventId]: p };
            const versions = version === undefined ? s.versions : { ...s.versions, [eventId]: version };
            const since = { ...s.since };
            if (p === 'laeuft') since[eventId] = at ?? (s.phases[eventId] === 'laeuft' && s.since[eventId] ? s.since[eventId] : new Date().toISOString());
            else delete since[eventId];
            return { phases, versions, since, cache: companyId ? { ...s.cache, [companyId]: phases } : s.cache };
          });
        const done: PhaseResult = { phase, conflict: false };
        apply(phase); // sofort sichtbar, auch offline
        if (!companyId) return done;
        try {
          const res = await corePut(putPath(companyId, eventId), { phase, expected_version: get().versions[eventId] ?? 0 });
          if (get().companyId !== companyId) return done;
          const item: ServerItem | undefined = res?.version ? res : res?.data;
          if (!item?.version) { set({ sync: 'local' }); return done; } // nicht gespeichert: bleibt lokal
          apply(item.phase ?? phase, item.version, sinceOf({ ...item, phase: item.phase ?? phase }));
          set({ sync: 'core' });
          return { phase: item.phase ?? phase, conflict: false };
        } catch (err) {
          if (get().companyId !== companyId) return done;
          const current = conflictCurrent(err);
          if (current !== undefined) {
            // Ein anderes Gerät war schneller: dessen Stand gilt.
            const adopted: EventPhase = current?.phase ?? 'geplant';
            apply(adopted, current?.version, current ? sinceOf(current) : undefined);
            set({ sync: 'core' });
            return { phase: adopted, conflict: true };
          }
          set({ sync: 'local' });
          return done;
        }
      },
    }),
    {
      name: 'saimor-day-phases-v2',
      partialize: (s) => ({ cache: s.cache }),
    },
  ),
);
