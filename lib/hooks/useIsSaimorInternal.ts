'use client';

import { useSessionStore } from '@/lib/store/sessionStore';
import { isSaimorInternal } from '@/lib/auth/organization';
import { useContext } from 'react';
import { QueryClient, QueryClientContext, useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '@/lib/api/orgClient';
import { queryKeys, STALE_TIMES } from '@/lib/queries/queryKeys';

// Ohne Provider (Tests, isolierte Renders) kein Wurf: eigener, leerer Client – dann gilt „keine Demo“.
const standaloneClient = new QueryClient();

/** True, wenn die aktive Firma ein is_demo-Arbeitsbereich ist (z. B. Coffee/Brandt im HQ-Tenant). */
export function useActiveCompanyIsDemo(): boolean {
    const user = useSessionStore((s) => s.user as { active_company_id?: string | null } | null);
    const activeId = user?.active_company_id ?? null;
    const ctxClient = useContext(QueryClientContext);
    const { data } = useQuery(
        { queryKey: [...queryKeys.companies(), true], queryFn: () => fetchCompanies(true), staleTime: STALE_TIMES.companies, refetchOnWindowFocus: false, enabled: Boolean(activeId && ctxClient) },
        ctxClient ?? standaloneClient,
    );
    if (!activeId || !Array.isArray(data)) return false;
    return Boolean(data.find((c) => c.id === activeId)?.is_demo);
}

/** Session-bound version of isSaimorInternal (see lib/auth/organization). Demo-Firmen gelten nie als intern. */
export function useIsSaimorInternal(): boolean {
    const activeCompanyIsDemo = useActiveCompanyIsDemo();
    return useSessionStore((state) => isSaimorInternal(state.user, { activeCompanyIsDemo }));
}
