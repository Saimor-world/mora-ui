import { useEffect, useState } from 'react';
import { createNode } from '@/lib/api/orgClient';
import { buildDossierContent } from '@/lib/dossier/buildDossierContent';
import { getDossierNodeId, setDossierNodeId } from '@/lib/dossier/dossierNodeStorage';
import { useNavStore } from '@/lib/store/navStore';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

interface Result {
    nodeId: string | null;
    isCreating: boolean;
}

/**
 * Creates a private OS Node for the given websiteEntryContext exactly once.
 * On subsequent renders / page loads the stored nodeId is returned from localStorage.
 * Returns { nodeId, isCreating }.
 */
export function useCreateDossierNode(
    context: StoredWebsiteEntryContext | null
): Result {
    const { activeCompanyId } = useNavStore();
    const contextId = context?.id ?? null;

    // Initialise from localStorage so we don't flash null on remount.
    const [nodeId, setNodeId] = useState<string | null>(() =>
        contextId ? getDossierNodeId(contextId) : null
    );
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!context || !contextId || !activeCompanyId) return;

        // Dedup: already created for this context.
        const existing = getDossierNodeId(contextId);
        if (existing) {
            setNodeId(existing);
            return;
        }

        let cancelled = false;
        setIsCreating(true);

        const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

        createNode({
            company_id: activeCompanyId,
            title: `${context.companyName} — Nightwatch Dossier`,
            type: 'document',
            content: buildDossierContent(context),
            metadata: {
                source: 'website-entry',
                context_id: contextId,
                domain: context.domain,
                score: context.score,
                expires_at: expiresAt,
            },
        })
            .then(node => {
                if (cancelled) return;
                setDossierNodeId(contextId, node.id);
                setNodeId(node.id);
            })
            .catch(() => {
                // Silent failure — demo still works without the node.
            })
            .finally(() => {
                if (!cancelled) setIsCreating(false);
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextId, activeCompanyId]);

    return { nodeId, isCreating };
}
