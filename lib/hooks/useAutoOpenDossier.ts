import { useEffect, useRef } from 'react';
import { usePaneStore } from '@/lib/store/paneStore';
import type { StoredWebsiteEntryContext } from '@/lib/websiteEntryStorage';

const FLAG_PREFIX = 'saimor_dossier_auto_opened_';

/**
 * Opens the dossier pane once per websiteEntryContext.id.
 *
 * Fresh Security-Check handoffs are owned by HomeSurface via `openOnHome`.
 * In that case this hook marks its legacy auto-open sequence as handled and
 * deliberately stays quiet so multiple panes cannot stack during first arrival.
 *
 * For older/non-explicit contexts we keep the one-time dossier fallback, but
 * never auto-open Môra on top of it. The user can open Môra intentionally.
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

        // A fresh website/security-check handoff already has an explicit owner:
        // HomeSurface opens the website dossier. Mark this legacy sequence as
        // consumed so it cannot add a document pane and Môra on top of it now
        // or on the next visit.
        if (context.openOnHome) {
            if (typeof window !== 'undefined') localStorage.setItem(flagKey, '1');
            return;
        }

        if (typeof window !== 'undefined') localStorage.setItem(flagKey, '1');

        const timer = setTimeout(() => {
            openPane({
                id: 'dossier-main',
                type: 'document',
                title: `${context.companyName} — Dossier`,
                size: { width: 760, height: 620 },
                data: { nodeId: dossierNodeId },
            });
        }, 800);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context?.id, context?.openOnHome, dossierNodeId]);
}
