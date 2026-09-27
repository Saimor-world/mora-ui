'use client';

import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';

/**
 * Structured UI actions returned by CORE (/v3/cognition/agent → ui_actions).
 *
 * CORE derives these from tool calls and proposed actions, never from free
 * model text. The UI only executes the small allowlist below; anything else
 * is ignored so a new or unexpected action type can never drive the shell.
 */
export interface CoreUiAction {
    type: string;
    target_id: string;
    pane_type?: string | null;
    title?: string | null;
    data?: Record<string, unknown> | null;
}

const MAX_ACTIONS = 5;
const MAX_ID_LENGTH = 200;

function asId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    return id && id.length <= MAX_ID_LENGTH ? id : null;
}

function asText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : null;
}

function openPaneAction(action: CoreUiAction): boolean {
    const { openPane } = usePaneStore.getState();
    const data = action.data ?? {};

    if (action.pane_type === 'search') {
        const query = asText(data.query);
        if (!query) return false;
        openPane({ id: 'search-main', type: 'search', title: 'Suche', size: { width: 780, height: 560 }, data: { query } });
        return true;
    }

    if (action.pane_type === 'document') {
        const nodeId = asId(data.nodeId);
        if (!nodeId) return false;
        openPane({ id: `document-${nodeId}`, type: 'document', title: 'Dokument', size: { width: 860, height: 640 }, data: { nodeId } });
        return true;
    }

    return false;
}

/**
 * Execute CORE ui_actions. Returns the number of actions actually executed.
 */
export function executeCoreUiActions(actions: unknown): number {
    if (!Array.isArray(actions)) return 0;

    let executed = 0;
    for (const raw of actions.slice(0, MAX_ACTIONS)) {
        if (!raw || typeof raw !== 'object') continue;
        const action = raw as CoreUiAction;
        const targetId = asId(action.target_id);
        const nav = useNavStore.getState();

        switch (action.type) {
            case 'navigate_department':
                if (!targetId) continue;
                nav.navigateToDepartment(targetId);
                break;
            case 'navigate_space':
                if (!targetId) continue;
                nav.navigateToSpace(targetId);
                break;
            case 'navigate_folder':
                if (!targetId) continue;
                nav.navigateToFolder(targetId);
                break;
            case 'highlight':
                if (!targetId) continue;
                dispatchMoraPresence({ action: 'highlight', targetId, source: 'ai' });
                break;
            case 'open_pane':
                if (!openPaneAction(action)) continue;
                break;
            default:
                continue;
        }
        executed += 1;
    }
    return executed;
}
