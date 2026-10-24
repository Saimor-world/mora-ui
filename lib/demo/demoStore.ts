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

type DemoState = { demoCompanyId: string | null; setDemoCompany: (id: string | null) => void };

const initial = (): string | null => {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(KEY); } catch { return null; }
};

export const useDemoStore = create<DemoState>((set) => ({
  demoCompanyId: initial(),
  setDemoCompany: (id) => {
    if (typeof window !== 'undefined') {
      try { if (id) window.sessionStorage.setItem(KEY, id); else window.sessionStorage.removeItem(KEY); } catch { /* privat */ }
    }
    set({ demoCompanyId: id });
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
