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

interface ServerItem { event_id: string; phase: EventPhase; version: number }

interface DayState {
  companyId: string | null;
  phases: Record<string, EventPhase>;
  versions: Record<string, number>;
  /** Lokaler Stand je Firma, falls CORE nicht erreichbar ist. */
  cache: Record<string, Record<string, EventPhase>>;
  sync: DaySync;
  setPhase(eventId: string, phase: EventPhase): Promise<void>;
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
      cache: {},
      sync: 'idle',

      loadCompany: async (companyId) => {
        // Sitzungswechsel: nie den Stand einer anderen Firma zeigen.
        if (get().companyId !== companyId) {
          set((s) => ({ companyId, phases: companyId ? { ...(s.cache[companyId] ?? {}) } : {}, versions: {}, sync: 'idle' }));
        }
        if (!companyId) return;
        try {
          const raw = await coreGet(statusPath(companyId), { isOptional: true });
          if (get().companyId !== companyId) return;
          if (!raw) { set({ sync: 'local' }); return; } // CORE nicht erreichbar oder abgemeldet
          const items: ServerItem[] = raw?.items ?? raw?.data?.items ?? [];
          const phases: Record<string, EventPhase> = {};
          const versions: Record<string, number> = {};
          for (const it of items) { phases[it.event_id] = it.phase; versions[it.event_id] = it.version; }
          set((s) => ({ phases, versions, sync: 'core', cache: { ...s.cache, [companyId]: phases } }));
        } catch {
          set({ sync: 'local' });
        }
      },

      setPhase: async (eventId, phase) => {
        const companyId = get().companyId;
        const apply = (p: EventPhase, version?: number) =>
          set((s) => {
            const phases = { ...s.phases, [eventId]: p };
            const versions = version === undefined ? s.versions : { ...s.versions, [eventId]: version };
            return { phases, versions, cache: companyId ? { ...s.cache, [companyId]: phases } : s.cache };
          });
        apply(phase); // sofort sichtbar, auch offline
        if (!companyId) return;
        try {
          const res = await corePut(putPath(companyId, eventId), { phase, expected_version: get().versions[eventId] ?? 0 });
          if (get().companyId !== companyId) return;
          const item: ServerItem | undefined = res?.version ? res : res?.data;
          if (!item?.version) { set({ sync: 'local' }); return; } // nicht gespeichert: bleibt lokal
          apply(item.phase ?? phase, item.version);
          set({ sync: 'core' });
        } catch (err) {
          if (get().companyId !== companyId) return;
          const current = conflictCurrent(err);
          if (current !== undefined) {
            // Ein anderes Gerät war schneller: dessen Stand gilt.
            if (current) apply(current.phase, current.version);
            set({ sync: 'core' });
            return;
          }
          set({ sync: 'local' });
        }
      },
    }),
    {
      name: 'saimor-day-phases-v2',
      partialize: (s) => ({ cache: s.cache }),
    },
  ),
);
