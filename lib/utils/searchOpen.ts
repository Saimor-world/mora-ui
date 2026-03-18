import type { LucideIcon } from 'lucide-react';
import { FileText, Folder, Building2 } from 'lucide-react';
import type { PaneConfig } from '@/lib/store/paneStore';
import { corePost, fetchNodeDetails, searchGlobal, searchSemantic } from '@/lib/api/coreClient';
import { dispatchWorkSessionPlan } from '@/lib/utils/moraExplanation';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';

type OpenPaneFn = (pane: Omit<PaneConfig, 'position' | 'zIndex' | 'minimized'>) => void;
export const NAVIGATION_RESULT_EVENT = 'saimor:navigation-result';
export const NAVIGATION_ACTION_INTENT = 'navigation_open';

export interface OpenableSearchResult {
    id: string;
    type: 'department' | 'space' | 'folder' | 'file' | 'node';
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    path?: string;
    score?: number;
    departmentId?: string;
    spaceId?: string;
    folderId?: string;
    nodeId?: string;
}

interface ActiveScope {
    companyId?: string | null;
    departmentId?: string | null;
    spaceId?: string | null;
    folderId?: string | null;
}

export interface NavigationOutcome {
    title: string;
    message: string;
    targetType: 'company' | 'department' | 'space' | 'folder' | 'node' | 'search';
    label?: string;
    path?: string;
    query?: string;
    companyId?: string;
    departmentId?: string;
    spaceId?: string;
    folderId?: string;
    nodeId?: string;
    source?: 'chat' | 'search-popup' | 'search-pane' | 'search';
}

export function dispatchNavigationResult(outcome: NavigationOutcome) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<NavigationOutcome>(NAVIGATION_RESULT_EVENT, { detail: outcome }));
}

export function openNavigationOutcome(outcome: NavigationOutcome, openPane: OpenPaneFn) {
    if (outcome.targetType === 'search') {
        openPane({
            id: 'search-main',
            type: 'search',
            title: 'Suche',
            size: { width: 960, height: 720 },
            data: { query: outcome.query || outcome.label || '' },
        });
        return;
    }

    if (outcome.targetType === 'node' && outcome.nodeId) {
        if (outcome.folderId || outcome.companyId) {
            openPane({
                id: `finder-${outcome.folderId || outcome.companyId || 'main'}`,
                type: 'finder',
                title: outcome.label || 'Finder',
                size: { width: 1280, height: 820 },
                data: {
                    folderId: outcome.folderId,
                    companyId: outcome.companyId,
                }
            });
        }
        openPane({
            id: `document-${outcome.nodeId}`,
            type: 'document',
            title: outcome.label || 'Dokument',
            size: { width: 800, height: 600 },
            data: {
                nodeId: outcome.nodeId,
                name: outcome.label,
            }
        });
        return;
    }

    openPane({
        id: `finder-${outcome.folderId || outcome.spaceId || outcome.departmentId || outcome.companyId || 'main'}`,
        type: 'finder',
        title: outcome.label || 'Finder',
        size: { width: 1280, height: 820 },
        data: {
            companyId: outcome.companyId,
            departmentId: outcome.departmentId,
            spaceId: outcome.spaceId,
            folderId: outcome.folderId,
        }
    });
}

export function surfaceNavigationOutcome(outcome: NavigationOutcome, openPane: OpenPaneFn) {
    openNavigationOutcome(outcome, openPane);
    dispatchNavigationResult(outcome);
    const activePlanId = useWorkSessionStore.getState().activePlanId;
    if (!activePlanId) return;

    void corePost('/v3/work-session/navigation', {
        plan_id: activePlanId,
        target_type: outcome.targetType,
        label: outcome.label,
        message: outcome.message,
        query: outcome.query,
        company_id: outcome.companyId,
        department_id: outcome.departmentId,
        space_id: outcome.spaceId,
        folder_id: outcome.folderId,
        node_id: outcome.nodeId,
        open_mode: outcome.targetType === 'node' ? 'finder_and_document' : outcome.targetType === 'search' ? 'search' : 'finder',
        source: outcome.source || 'search',
    }, { isOptional: true })
        .then((plan) => {
            if (!plan || typeof plan !== 'object') return;
            const typedPlan = plan as Record<string, any>;
            if (typeof typedPlan.plan_id !== 'string') return;
            dispatchWorkSessionPlan({
                planId: typedPlan.plan_id,
                sessionId: typedPlan.session_id,
                source: 'navigation',
                state: typedPlan.state,
                title: typedPlan.title,
                summary: typedPlan.summary,
                mode: typedPlan.mode,
                scope: typedPlan.scope,
                stats: typedPlan.stats,
                transparencyNote: typedPlan.transparency_note,
            });
        })
        .catch(() => {
            // navigation remains a valid UI outcome even if session recording fails
        });
}

export function mapRawSearchResult(raw: any): OpenableSearchResult | null {
    const type = String(raw?.type || raw?.result_type || '').toLowerCase();
    const normalizedType = (['department', 'space', 'folder', 'file', 'node'].includes(type)
        ? type
        : 'node') as OpenableSearchResult['type'];

    const departmentId = raw?.department_id || raw?.departmentId;
    const spaceId = raw?.space_id || raw?.spaceId;
    const folderId = raw?.folder_id || raw?.folderId;
    const nodeId = raw?.node_id || raw?.nodeId || (normalizedType === 'node' || normalizedType === 'file' ? raw?.id : undefined);
    const id = departmentId || spaceId || folderId || nodeId || raw?.id;

    if (!id) return null;

    return {
        id,
        title: raw?.title || raw?.name || raw?.filename || 'Unbenannt',
        type: normalizedType,
        path: raw?.path || raw?.scope_path || undefined,
        subtitle: raw?.path || raw?.scope_path || undefined,
        icon: normalizedType === 'department' ? Building2 : normalizedType === 'space' || normalizedType === 'folder' ? Folder : FileText,
        departmentId,
        spaceId,
        folderId,
        nodeId,
    };
}

function scoreResult(result: OpenableSearchResult, query: string, scope: ActiveScope): number {
    const lowerQuery = query.trim().toLowerCase();
    const title = result.title.toLowerCase();
    let score = 0;

    if (title === lowerQuery) score += 120;
    else if (title.includes(lowerQuery)) score += 60;

    if (result.path?.toLowerCase().includes(lowerQuery)) score += 20;
    if (result.folderId && scope.folderId && result.folderId === scope.folderId) score += 50;
    if (result.spaceId && scope.spaceId && result.spaceId === scope.spaceId) score += 35;
    if (result.departmentId && scope.departmentId && result.departmentId === scope.departmentId) score += 20;
    if (result.type === 'file' || result.type === 'node') score += 5;
    if (typeof result.score === 'number') score += result.score * 10;

    return score;
}

function dedupeResults(results: OpenableSearchResult[]): OpenableSearchResult[] {
    const map = new Map<string, OpenableSearchResult>();
    results.forEach((result) => {
        const key = `${result.type}:${result.id}`;
        if (!map.has(key)) map.set(key, result);
    });
    return Array.from(map.values());
}

export async function resolveSearchResults(query: string, scope: ActiveScope): Promise<OpenableSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || !scope.companyId) return [];

    const [keywordResponse, semanticResponse] = await Promise.all([
        searchGlobal(trimmed, scope.companyId),
        searchSemantic(trimmed, scope.companyId, 10, 0.55),
    ]);

    const keywordResults = (keywordResponse?.results || [])
        .map(mapRawSearchResult)
        .filter((result): result is OpenableSearchResult => result !== null);

    const semanticResults = semanticResponse
        .map((result) => ({
            id: result.node_id,
            type: 'node' as const,
            title: result.metadata?.title || 'Unbenannt',
            subtitle: result.content?.substring(0, 100) || result.metadata?.type || 'Treffer',
            icon: FileText,
            score: result.score,
            nodeId: result.node_id,
            folderId: result.metadata?.folder_id,
            spaceId: result.metadata?.space_id,
        }))
        .filter((result) => !!result.id);

    return dedupeResults([...keywordResults, ...semanticResults]).sort(
        (a, b) => scoreResult(b, trimmed, scope) - scoreResult(a, trimmed, scope)
    );
}

export async function openSearchResult(
    result: OpenableSearchResult,
    openPane: OpenPaneFn,
    scope: ActiveScope,
    source: NavigationOutcome['source'] = 'search',
) {
    switch (result.type) {
        case 'department':
            surfaceNavigationOutcome({
                title: 'Bereich geoeffnet',
                message: `Ich habe ${result.title} im aktuellen Firmenkontext geoeffnet.`,
                targetType: 'department',
                label: result.title,
                path: result.path,
                companyId: scope.companyId || undefined,
                departmentId: result.departmentId || result.id,
                source,
            }, openPane);
            return;
        case 'space':
            surfaceNavigationOutcome({
                title: 'Bereich geoeffnet',
                message: `Ich habe ${result.title} im aktuellen Firmenkontext geoeffnet.`,
                targetType: 'space',
                label: result.title,
                path: result.path,
                companyId: scope.companyId || undefined,
                spaceId: result.spaceId || result.id,
                source,
            }, openPane);
            return;
        case 'folder':
            surfaceNavigationOutcome({
                title: 'Ordner geoeffnet',
                message: `Ich habe ${result.title} im Finder geoeffnet.`,
                targetType: 'folder',
                label: result.title,
                path: result.path,
                companyId: scope.companyId || undefined,
                folderId: result.folderId || result.id,
                source,
            }, openPane);
            return;
        case 'file':
        case 'node': {
            let resolvedFolderId = result.folderId;
            let resolvedNodeId = result.nodeId || result.id;
            if (!resolvedFolderId && resolvedNodeId) {
                try {
                    const node = await fetchNodeDetails(resolvedNodeId);
                    resolvedFolderId = (node as any)?.folder_id || resolvedFolderId;
                    resolvedNodeId = (node as any)?.id || resolvedNodeId;
                } catch {
                    // document-only fallback remains acceptable
                }
            }
            surfaceNavigationOutcome({
                title: 'Datei geoeffnet',
                message: resolvedFolderId
                    ? `Ich habe ${result.title} im Finder-Kontext und als Dokument geoeffnet.`
                    : `Ich habe ${result.title} als Dokument geoeffnet.`,
                targetType: 'node',
                label: result.title,
                path: result.path,
                companyId: scope.companyId || undefined,
                folderId: resolvedFolderId,
                nodeId: resolvedNodeId,
                source,
            }, openPane);
            return;
        }
    }
}
