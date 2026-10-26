'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import { isSaimorInternal } from '@/lib/auth/organization';
import { useContext } from 'react';
import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from '@/lib/queries/queryKeys';
import { useDemoStore, useScopeCompanyId, demoCompaniesForTenant } from '@/lib/demo/demoStore';

// Ohne Provider (Tests, isolierte Renders) kein Wurf: eigener, leerer Client – dann gilt „keine Demo“.
const standaloneClient = new QueryClient();

/** True, wenn die aktive Firma ein is_demo-Arbeitsbereich ist (z. B. Coffee/Brandt im HQ-Tenant). */
export function useActiveCompanyIsDemo(): boolean {
    const activeId = useScopeCompanyId();
    const explicitDemo = useDemoStore((s) => s.demoCompanyId);
    const tenantId = useSessionStore((s) => s.user?.tenant_id);
    const userId = useSessionStore((s) => s.user?.id);
    const generation = useSessionStore((s) => s.sessionGeneration);
    const ctxClient = useContext(QueryClientContext);
    const { data } = useQuery(
        { queryKey: [...queryKeys.companies(), true, tenantId, userId, generation], queryFn: () => fetchCompanies(true), staleTime: STALE_TIMES.companies, refetchOnWindowFocus: false, enabled: Boolean(activeId && ctxClient) },
        ctxClient ?? standaloneClient,
    );
    if (explicitDemo) return true; // Fail closed while a selected demo is loading or unavailable.
    if (!activeId || !Array.isArray(data)) return false;
    return Boolean(demoCompaniesForTenant(data, tenantId).find((c) => c.id === activeId));
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
    const tenantId = useSessionStore((s) => s.user?.tenant_id);
    const userId = useSessionStore((s) => s.user?.id);
    const generation = useSessionStore((s) => s.sessionGeneration);
    const ctxClient = useContext(QueryClientContext);
    const { data } = useQuery(
        { queryKey: [...queryKeys.companies(), true, tenantId, userId, generation], queryFn: () => fetchCompanies(true), staleTime: STALE_TIMES.companies, refetchOnWindowFocus: false, enabled: Boolean(enabled && ctxClient && tenantId) },
        ctxClient ?? standaloneClient,
    );
    return Array.isArray(data) ? demoCompaniesForTenant(data, tenantId).map((c) => ({ id: c.id, name: c.name })) : [];
}
