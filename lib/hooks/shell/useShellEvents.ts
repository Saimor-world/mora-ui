/**
 * useShellEvents - Centralized Event Bus for MoraShell
 *
 * Handles all window event listeners in one place:
 * - Agency events (focus_pane, navigate_*, open_pane)
 * - Resonance trigger
 * - AI actions
 * - Node detail opening
 */

import { useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';

interface UseShellEventsOptions {
    // onOpenResonance — 1.0 gated with ResonanceRoom surface
}

export function useShellEvents(_options: UseShellEventsOptions) {
    const { focusPane, openPane } = usePaneStore();

    // mora:open-resonance — 1.0 gated: ResonanceRoom not mounted in 1.0

    // Agency Event Bus
    useEffect(() => {
        const handleFocusPane = (e: CustomEvent<{ paneId: string }>) => {
            if (e.detail.paneId) {
                focusPane(e.detail.paneId);
            }
        };

        const handleNavigateDepartment = (e: CustomEvent<{ departmentId: string }>) => {
            if (e.detail.departmentId) {
                useMoraStore.getState().navigateToDepartment(e.detail.departmentId);
            }
        };

        const handleNavigateSpace = (e: CustomEvent<{ spaceId: string }>) => {
            if (e.detail.spaceId) {
                useMoraStore.getState().navigateToSpace(e.detail.spaceId);
            }
        };

        const handleNavigateFolder = (e: CustomEvent<{ folderId: string }>) => {
            if (e.detail.folderId) {
                useMoraStore.getState().navigateToFolder(e.detail.folderId);
            }
        };

        const handleOpenPane = (e: CustomEvent<{ paneType: string; paneId: string; title: string; data?: any }>) => {
            const { paneType, paneId, title, data } = e.detail;
            if (paneType && paneId) {
                openPane({
                    id: paneId,
                    type: paneType as any,
                    title: title || paneType,
                    data,
                    size: { width: 700, height: 500 }
                });
            }
        };

        window.addEventListener('agency:focus_pane', handleFocusPane as EventListener);
        window.addEventListener('agency:navigate_department', handleNavigateDepartment as EventListener);
        window.addEventListener('agency:navigate_space', handleNavigateSpace as EventListener);
        window.addEventListener('agency:navigate_folder', handleNavigateFolder as EventListener);
        window.addEventListener('agency:open_pane', handleOpenPane as EventListener);

        return () => {
            window.removeEventListener('agency:focus_pane', handleFocusPane as EventListener);
            window.removeEventListener('agency:navigate_department', handleNavigateDepartment as EventListener);
            window.removeEventListener('agency:navigate_space', handleNavigateSpace as EventListener);
            window.removeEventListener('agency:navigate_folder', handleNavigateFolder as EventListener);
            window.removeEventListener('agency:open_pane', handleOpenPane as EventListener);
        };
    }, [focusPane, openPane]);

    // Open node detail from global search
    useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent;
            const nodeId = custom?.detail?.nodeId;
            if (!nodeId) return;

            openPane({
                id: `document-${nodeId}`,
                type: 'document',
                title: 'Document',
                data: { nodeId },
                size: { width: 800, height: 600 }
            });
        };

        window.addEventListener('open-node-detail', handler as EventListener);
        return () => window.removeEventListener('open-node-detail', handler as EventListener);
    }, [openPane]);

    // mora:cursor / mora-ai-action — 1.0 gated (CursorAgent component is future-tier)
}
