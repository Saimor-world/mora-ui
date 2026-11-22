'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import { isSaimorInternal } from '@/lib/auth/organization';
import { useContext } from 'react';
import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from '@/lib/queries/queryKeys';
import { useDemoStore, useScopeCompanyId } from '@/lib/demo/demoStore';

// Ohne Provider (Tests, isolierte Renders) kein Wurf: eigener, leerer Client – dann gilt „keine Demo“.
const standaloneClient = new QueryClient();

/** Firmenliste je angemeldeter Person: ein Nutzerwechsel liest nie die Liste der vorherigen Person. */
function useCompaniesKey() {
    const principal = useSessionStore((state) => (state.user ? `${state.user.tenant_id ?? 'tenant-unknown'}:${state.user.id}` : 'anonymous'));
    return [...queryKeys.companies(), true, principal] as const;
}

/**
 * True, wenn die aktive Firma ein is_demo-Arbeitsbereich ist (z. B. Coffee/Brandt im HQ-Tenant).
 * Fail-closed: Solange die Firmenliste lädt, fehlschlägt oder die aktive Firma nicht enthält,
 * gilt sie als Demo, damit keine HQ-Inhalte (Eule, Finanzen) in einer Demo aufblitzen.
 */
export function useActiveCompanyIsDemo(): boolean {
    const activeId = useScopeCompanyId();
    const ctxClient = useContext(QueryClientContext);
    const queryKey = useCompaniesKey();
    const { data } = useQuery(
        { queryKey, queryFn: () => fetchCompanies(true), staleTime: STALE_TIMES.companies, refetchOnWindowFocus: false, enabled: Boolean(activeId && ctxClient) },
        ctxClient ?? standaloneClient,
    );
    if (!activeId) return false;
    if (!ctxClient) return false;
    if (!Array.isArray(data)) return true;
    const company = data.find((c) => c.id === activeId);
    return company ? Boolean(company.is_demo) : true;
}

/** Session-bound version of isSaimorInternal (see lib/auth/organization). Demo-Firmen gelten nie als intern. */
export function useIsSaimorInternal(): boolean {
    const activeCompanyIsDemo = useActiveCompanyIsDemo();
    return useSessionStore((state) => isSaimorInternal(state.user, { activeCompanyIsDemo }));
}

/** HQ-Zugang ohne Demo-Abzug: entscheidet nur, ob der Demo-Schalter erscheint. */
export function useIsSaimorHq(): boolean {
    return useSessionStore((state) => isSaimorInternal(state.user));
}

/** Alle is_demo-Firmen des Tenants (für den Demo-Schalter). */
export function useDemoCompanies(enabled: boolean): { id: string; name: string }[] {
    const ctxClient = useContext(QueryClientContext);
    const queryKey = useCompaniesKey();
    const { data } = useQuery(
        { queryKey, queryFn: () => fetchCompanies(true), staleTime: STALE_TIMES.companies, refetchOnWindowFocus: false, enabled: Boolean(enabled && ctxClient) },
        ctxClient ?? standaloneClient,
    );
    return Array.isArray(data) ? data.filter((c) => c.is_demo).map((c) => ({ id: c.id, name: c.name })) : [];
}

const DEMO_TENANTS = new Set(['tenant-demo', 'tenant-demo-morgenrot']);

/** Demo-Sitzung: Konto in einem Demo-Tenant oder mit Demo-Rolle. Dort ist alles erfunden und so markiert. */
export function isDemoSessionUser(user: { role?: string | null; tenant_id?: string | null; is_demo?: boolean } | null | undefined): boolean {
    if (!user) return false;
    return Boolean(user.is_demo) || user.role === 'demo' || DEMO_TENANTS.has(user.tenant_id ?? '');
}

/**
 * Wessen Welt gerade zu sehen ist:
 * - 'hq': SAIMÔR intern, die eigenen Räume (Leitung, Atelier, Kontor …)
 * - 'demo': erfundene Demo-Welt (Café-Demo im HQ oder Demo-Konto)
 * - 'customer': alle anderen. Dort steht nur, was aus CORE kommt.
 * Ohne Sitzung gilt 'customer', also nie Beispielinhalt.
 */
export type WorkScope = 'hq' | 'demo' | 'customer';
export function useWorkScope(): WorkScope {
    const demoId = useDemoStore((s) => s.demoCompanyId);
    const hq = useIsSaimorHq();
    const demoUser = useSessionStore((s) => isDemoSessionUser(s.user as { role?: string | null; tenant_id?: string | null; is_demo?: boolean } | null));
    if (demoUser) return 'demo';
    if (hq) return demoId ? 'demo' : 'hq';
    return 'customer';
}

/** Demo-Schalter, „Fiktive Demo“ und „+ Abteilung“: nur für SAIMÔR intern. */
export function useShowsDemoChrome(): boolean {
    return useIsSaimorHq();
}
