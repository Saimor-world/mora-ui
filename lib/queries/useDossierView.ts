import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { queryKeys } from '@/lib/queries/queryKeys';

export interface DossierViewCompany {
    id: string | null;
    name: string;
    is_visitor: boolean;
}

export interface DossierViewAudit {
    id: string;
    title: string;
    score: number | null;
    level: string | null;
    domain: string | null;
    created_at: string;
}

export interface DossierView {
    company: DossierViewCompany;
    /** null when the audit node doesn't exist in the DB yet */
    audit: DossierViewAudit | null;
}

/**
 * Fetches the backend-verified dossier view for a security-audit node.
 * Only fires when `auditId` is provided — visitors who arrived before
 * the node was persisted get a graceful `data: undefined`.
 */
export function useDossierView(auditId: string | null | undefined) {
    return useQuery<DossierView>({
        queryKey: queryKeys.viewDossier(auditId ?? ''),
        queryFn: () => coreGet(`/v3/views/dossier/${auditId}`),
        enabled: Boolean(auditId),
    });
}
