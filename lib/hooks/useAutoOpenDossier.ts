import { useEffect, useRef } from 'react';
import { usePaneStore } from '@/lib/store/paneStore';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

const FLAG_PREFIX = 'saimor_dossier_auto_opened_';

/**
 * Opens the dossier pane and Môra chat once per websiteEntryContext.id
 * when the visitor lands in the OS after a Security Check.
 *
 * Sequence:
 *   800ms  → Dossier pane opens (type: 'document', nodeId)
 *   1400ms → Môra chat opens with pre-filled contextual question
 *
 * Uses localStorage flag to ensure it fires only on the first visit.
 */
export function useAutoOpenDossier(
    context: StoredWebsiteEntryContext | null,
    dossierNodeId: string | null
): void {
    const { openPane } = usePaneStore();
    const fired = useRef(false);

    useEffect(() => {
        if (!context || !dossierNodeId || fired.current) return;

        const flagKey = `${FLAG_PREFIX}${context.id ?? context.companyName}`;
        if (typeof window !== 'undefined' && localStorage.getItem(flagKey)) return;

        fired.current = true;
        if (typeof window !== 'undefined') localStorage.setItem(flagKey, '1');

        const domain    = context.domain ?? context.companyName;
        const firstTask = context.tasks?.find(t => t.priority === 'hoch') ?? context.tasks?.[0];
        const taskHint  = firstTask ? ` Mein dringendster Punkt ist: ${firstTask.title}.` : '';
        const moraMessage = `Was sind meine drei dringendsten Maßnahmen für ${domain}?${taskHint}`;

        const t1 = setTimeout(() => {
            openPane({
                id: 'dossier-main',
                type: 'document',
                title: `${context.companyName} — Dossier`,
                size: { width: 760, height: 620 },
                data: { nodeId: dossierNodeId },
            });
        }, 800);

        const t2 = setTimeout(() => {
            openPane({
                id: 'chat-main',
                type: 'chat',
                title: 'Môra',
                size: { width: 860, height: 680 },
                data: { initialMessage: moraMessage },
            });
        }, 1400);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context?.id, dossierNodeId]);
}
