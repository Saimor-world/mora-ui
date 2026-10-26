'use client';

import { create } from 'zustand';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * Demo-Arbeitsbereiche im HQ: eine is_demo-Firma (CORE-Paket über
 * POST /v3/companies/guided-demo) wird nur für diese Browser-Sitzung als Bühne
 * gewählt. Standard bleibt die echte Firma der Sitzung. Nichts wird an der
 * Sitzung in CORE geändert; alle Lese- und Schreibaufrufe laufen mit der
 * company_id der Demo-Firma und landen damit nur dort.
 */
const KEY = 'saimor_demo_company';

/** A platform owner may list every tenant; its working demo picker must not. */
export function demoCompaniesForTenant<T extends { id: string; name: string; tenant_id?: string; is_demo?: boolean }>(companies: T[], tenantId?: string | null): T[] {
  if (!tenantId) return [];
  return companies.filter((c) => c.is_demo && c.tenant_id === tenantId);
}

type DemoState = { demoCompanyId: string | null; selectionGeneration: number; setDemoCompany: (id: string | null) => void };

const initial = (): string | null => {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(KEY); } catch { return null; }
};

export const useDemoStore = create<DemoState>((set) => ({
  demoCompanyId: initial(),
  selectionGeneration: 0,
  setDemoCompany: (id) => {
    // A retained HQ folder must never silently override a selected demo in chat.
    if (id !== useDemoStore.getState().demoCompanyId) {
      useNavStore.setState({ activeDepartmentId: null, activeSpaceId: null, activeFolderId: null });
    }
    if (typeof window !== 'undefined') {
      try { if (id) window.sessionStorage.setItem(KEY, id); else window.sessionStorage.removeItem(KEY); } catch { /* privat */ }
    }
    set((s) => ({ demoCompanyId: id, selectionGeneration: s.selectionGeneration + (id !== s.demoCompanyId ? 1 : 0) }));
  },
}));

/** Die Firma, mit der Heute, Termine, Universe und Finder arbeiten: Demo vor Sitzung vor Navigation. */
export function resolveScopeCompany(demo: string | null, session: string | null, nav: string | null): string | null {
  return demo || session || nav || null;
}

export function useScopeCompanyId(): string | null {
  const demo = useDemoStore((s) => s.demoCompanyId);
  const nav = useNavStore((s) => s.activeCompanyId);
  const session = useSessionStore((s) => (s.user as { active_company_id?: string | null } | null)?.active_company_id ?? null);
  return resolveScopeCompany(demo, session, nav);
}
