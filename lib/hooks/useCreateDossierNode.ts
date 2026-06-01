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

    const [nodeId, setNodeId] = useState<string | null>(() =>
        contextId ? getDossierNodeId(contextId) : null
    );
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!context || !contextId || !activeCompanyId) return;

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
            title: `${context.companyName} - Nightwatch Dossier`,
            type: 'document',
            content: buildDossierContent(context),
            metadata: {
                source: 'website-security-check',
                context_id: contextId,
                website_entry_id: contextId,
                domain: context.domain,
                score: context.score,
                expires_at: expiresAt,
                wall_eligible: true,
                wall_status: 'none',
                playground: {
                    status: 'temporary',
                    author_type: 'visitor',
                    visitor_id: typeof window !== 'undefined' ? window.localStorage.getItem('saimor_visitor_id') : null,
                    visitor_only: true,
                    expires_at: expiresAt,
                    moderation: 'auto',
                },
                audit: {
                    audit_id: contextId,
                    domain: context.domain,
                    score: context.score,
                    grade: context.grade,
                    level: context.level,
                    summary: context.summary,
                    findings: context.tasks.map((task) => ({
                        title: task.title,
                        severity: task.priority,
                        desc: 'Aus dem Security-Check als Aufgabe vorbereitet.',
                    })),
                },
            },
        })
            .then(node => {
                if (cancelled) return;
                setDossierNodeId(contextId, node.id);
                setNodeId(node.id);
            })
            .catch(() => {
                // Silent failure: the visitor preview still works from local scan context.
            })
            .finally(() => {
                if (!cancelled) setIsCreating(false);
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextId, activeCompanyId]);

    return { nodeId, isCreating };
}
