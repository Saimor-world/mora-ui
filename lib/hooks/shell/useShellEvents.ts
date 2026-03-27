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
import type { MoraPresenceDetail } from '@/lib/mora/presenceEvents';

interface UseShellEventsOptions {
    // onOpenResonance — 1.0 gated with ResonanceRoom surface
}

export function useShellEvents(_options: UseShellEventsOptions) {
    const { setCursorAgent } = useMoraStore();
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

    // Unified Mora presence handler.
    // Canonical event is `mora:cursor`; legacy `mora-ai-action` remains supported during transition.
    useEffect(() => {
        const resolveTargetPosition = (detail: Record<string, any>) => {
            const { targetId, targetSelector, targetPosition, position } = detail;
            let targetPos = (targetPosition || position) as { x: number; y: number } | undefined;
            if (!targetPos) {
                let el: Element | null = null;
                if (typeof targetSelector === 'string' && targetSelector.length > 0) {
                    el = document.querySelector(targetSelector);
                    if (!el && !targetSelector.startsWith('#') && !targetSelector.startsWith('.')) {
                        el = document.getElementById(targetSelector);
                    }
                }
                if (!el && typeof targetId === 'string' && targetId.length > 0) {
                    el = document.getElementById(targetId) || document.querySelector(`[data-agency-id="${targetId}"]`);
                }
                if (el) {
                    const rect = el.getBoundingClientRect();
                    targetPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                }
            }
            return targetPos;
        };

        const activateCursor = (detail: MoraPresenceDetail | Record<string, any>, fallbackType?: 'highlight' | 'point') => {
            const rawType = (detail as Record<string, any>).type;
            const rawAction = detail.action || rawType || fallbackType;
            const action = rawAction === 'highlight'
                ? 'highlight'
                : rawAction === 'point' || rawAction === 'navigate'
                    ? 'point'
                    : rawAction === 'activate'
                        ? 'idle'
                        : rawAction;

            if (action === 'deactivate' || action === 'return') {
                setCursorAgent({ active: true, action: 'return', target: undefined, message: null });
                return;
            }

            if (action === 'idle') {
                setCursorAgent({ active: false, action: 'idle', target: undefined, message: null });
                return;
            }

            const targetPos = resolveTargetPosition(detail);
            if (action !== 'idle' && !targetPos) return;

            setCursorAgent({
                active: true,
                action,
                target: targetPos,
                message: typeof detail.message === 'string' && detail.message.length > 0 ? detail.message : null
            });

            const timeoutMs = typeof detail.duration === 'number' ? detail.duration : 2500;
            window.setTimeout(() => {
                setCursorAgent({ active: true, action: 'return', target: undefined, message: null });
            }, timeoutMs);
        };

        const handlePresenceAction = (e: CustomEvent<MoraPresenceDetail>) => activateCursor(e.detail);
        const handleLegacyAIAction = (e: CustomEvent) => activateCursor(e.detail);

        window.addEventListener('mora:cursor' as any, handlePresenceAction as any);
        window.addEventListener('mora-ai-action' as any, handleLegacyAIAction as any);
        return () => {
            window.removeEventListener('mora:cursor' as any, handlePresenceAction as any);
            window.removeEventListener('mora-ai-action' as any, handleLegacyAIAction as any);
        };
    }, [setCursorAgent]);
}
