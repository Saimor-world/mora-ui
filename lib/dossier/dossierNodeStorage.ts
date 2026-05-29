/**
 * Persists the OS node id for a given websiteEntryContext.id.
 * Used to avoid creating duplicate nodes on page reload.
 */

export const DOSSIER_NODE_KEY_PREFIX = 'saimor_dossier_node_';

function key(contextId: string) {
    return `${DOSSIER_NODE_KEY_PREFIX}${contextId}`;
}

export function getDossierNodeId(contextId: string): string | null {
    if (typeof window === 'undefined' || !contextId) return null;
    try {
        return window.localStorage.getItem(key(contextId));
    } catch {
        return null;
    }
}

export function setDossierNodeId(contextId: string, nodeId: string): void {
    if (typeof window === 'undefined' || !contextId) return;
    try {
        window.localStorage.setItem(key(contextId), nodeId);
    } catch {
        // Storage unavailable — not fatal; next page load will retry.
    }
}

export function clearDossierNodeId(contextId: string): void {
    if (typeof window === 'undefined' || !contextId) return;
    try {
        window.localStorage.removeItem(key(contextId));
    } catch {
        // Best-effort cleanup.
    }
}
