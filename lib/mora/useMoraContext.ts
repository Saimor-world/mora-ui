// lib/mora/useMoraContext.ts
"use client";

import { useMemo } from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useChatStore } from '@/lib/store/chatStore';
import { useMemoryPendingCount } from '@/lib/hooks/useMemoryPendingCount';
import { useMemoryOverview } from '@/lib/hooks/useMemoryOverview';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useTree } from '@/lib/queries/useTree';
import { useMoraPerception } from '@/lib/queries/useMoraPerception';
import { isMoraPerceiveV1Enabled } from '@/lib/featureFlags';
import type { OrbState } from '@/lib/api/awarenessClient';
import type { CoreTreeNode } from '@/lib/types/core';
import type { PerceptionBundle } from '@/lib/types/perception';

// ─── Contract ───────────────────────────────────────────────────────────────

export interface MoraContextSnapshot {
    // Active scope
    scopeLevel: 'global' | 'company' | 'department' | 'space' | 'folder';
    scopeLabels: {
        company?: string;
        department?: string;
        space?: string;
        folder?: string;
    };
    scopeEnforced: boolean;
    scopeReason: string | null;
    scopeDroppedFields: string[];

    // Runtime state
    orbState: OrbState;
    isOffline: boolean;

    // Memory state
    memoryPendingCount: number;
    memoryFactCount: number;

    // Freshness
    lastScopeUpdateAt: string | null;
    lastScopeSource: 'stream' | null;  // 'local' reserved for future non-stream scope updates

    // Answer provenance — null until backend sends answer_source in StreamFrame
    lastAnswerSource: 'memory' | 'context' | 'inference' | null;
    lastAnswerSourceMode: string | null;   // e.g. 'retrieval' | 'synthesis' | 'hybrid'
    lastAnswerScopeLabel: string | null;

    /** true = operational, false = setup-required, null = bootstrap in progress (no-render) */
    isOperational: boolean | null;
    /** Raw backend scope_source value. Admin/diagnostics only — do not expose in main UX. */
    scopeSource: string | null;
}

// ─── Scope level derivation ─────────────────────────────────────────────────

function deriveScopeLevel(
    resolved: Record<string, string | undefined> | undefined
): MoraContextSnapshot['scopeLevel'] {
    if (!resolved) return 'global';
    if (resolved.folder_id) return 'folder';
    if (resolved.space_id) return 'space';
    if (resolved.department_id) return 'department';
    if (resolved.company_id) return 'company';
    return 'global';
}

// ─── Tree traversal helpers ─────────────────────────────────────────────────

function flattenTree(nodes: CoreTreeNode[], type: CoreTreeNode['type']): CoreTreeNode[] {
    const result: CoreTreeNode[] = [];
    const walk = (n: CoreTreeNode) => {
        if (n.type === type) result.push(n);
        n.children?.forEach(walk);
    };
    nodes.forEach(walk);
    return result;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * useMoraContext
 *
 * Normalization hook. Reads focused stores + TanStack Query hooks.
 * No moraState dependency. No mutations. Safe to call in any surface.
 *
 * NOTE: The store tracks active entities by ID only (activeDepartmentId,
 * activeSpaceId, activeFolderId). Names are resolved by joining against
 * the departments / tree collections.
 */
export function useMoraContext(): MoraContextSnapshot {
    const orbState = useOrbStore((s) => s.orbState);
    const lastChatScope = useChatStore((s) => s.lastChatScope);
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    // Store uses ID-only fields — not full entity objects.
    const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
    const activeSpaceId = useNavStore((s) => s.activeSpaceId);
    const activeFolderId = useNavStore((s) => s.activeFolderId);

    // Entity collections for name resolution — TanStack Query.
    const { data: companies = [] } = useCompanies();
    const { data: departments = [] } = useDepartments(activeCompanyId);
    // Tree provides all spaces + folders without extra per-department fetches.
    const { data: treeNodes = [] } = useTree(activeCompanyId);

    // Answer provenance — wired from orbStore (MR18/MR19 backend now live)
    const storeAnswerSource = useOrbStore((s) => s.lastAnswerSource);
    const storeAnswerSourceMode = useOrbStore((s) => s.lastAnswerSourceMode);
    const storeAnswerScopeLabel = useOrbStore((s) => s.lastAnswerScopeLabel);

    // Session user — for isOperational derivation and pre-chat company label
    const user = useSessionStore((s) => s.user);

    const memoryPendingCount = useMemoryPendingCount();
    const memoryOverview = useMemoryOverview();

    // Real Mora P1: when the perceive flag is on, fetch the canonical bundle.
    // Hook is called unconditionally to keep React hook order stable; the
    // result is only consumed inside the memo when the flag is on.
    const flagOn = isMoraPerceiveV1Enabled();
    const { data: perceptionBundle } = useMoraPerception({});

    return useMemo((): MoraContextSnapshot => {
        const resolved = lastChatScope?.resolved_scope;
        const contract = lastChatScope?.scope_contract;

        // Scope level
        const scopeLevel = deriveScopeLevel(resolved);

        // Name resolution helpers
        const safeCompanies = Array.isArray(companies) ? companies : [];
        const safeDepartments = Array.isArray(departments) ? departments : [];
        // Derive all spaces and folders from the cached tree (no extra fetches).
        const allSpaces = flattenTree(treeNodes, 'space');
        const allFolders = flattenTree(treeNodes, 'folder');

        const activeCompany = safeCompanies.find((c) => c.id === activeCompanyId);
        const activeDepartment = safeDepartments.find((d) => d.id === activeDepartmentId);
        const activeSpace = allSpaces.find((s) => s.id === activeSpaceId);
        const activeFolder = allFolders.find((f) => f.id === activeFolderId);

        // Scope labels — prefer store entity names, fall back to resolved_scope IDs.
        const scopeLabels: MoraContextSnapshot['scopeLabels'] = {};
        if (resolved?.company_id || activeCompanyId || user?.active_company_name) {
            const resolvedCompanyName = resolved?.company_id
                ? (activeCompany?.name ?? resolved?.company_id)
                : undefined;
            scopeLabels.company =
                resolvedCompanyName           // from lastChatScope resolved_scope (highest priority)
                ?? activeCompany?.name        // from store entity
                ?? user?.active_company_name  // from session bootstrap (pre-chat)
                ?? undefined;
        }
        if (resolved?.department_id || activeDepartmentId) {
            scopeLabels.department = activeDepartment?.name ?? resolved?.department_id ?? undefined;
        }
        if (resolved?.space_id || activeSpaceId) {
            scopeLabels.space = activeSpace?.name ?? resolved?.space_id ?? undefined;
        }
        if (resolved?.folder_id || activeFolderId) {
            scopeLabels.folder = activeFolder?.name ?? resolved?.folder_id ?? undefined;
        }

        // Scope enforcement
        const scopeEnforced = lastChatScope?.scope_enforced ?? false;
        // scope_reason: populated by backend in scope_contract (P1 dep).
        // Falls back to generic label when enforced but reason absent.
        const rawReason = contract?.scope_reason;
        const scopeReason = rawReason ?? (scopeEnforced ? 'Scope eingeschränkt' : null);

        const scopeDroppedFields = contract?.dropped_fields ?? [];

        // Freshness
        const lastScopeUpdateAt = lastChatScope?.updatedAt ?? null;
        const lastScopeSource: MoraContextSnapshot['lastScopeSource'] =
            lastChatScope ? 'stream' : null;

        // Answer provenance — wired from store, populated by useMoraStream SSE preamble (MR18/MR19)
        const lastAnswerSource = storeAnswerSource;
        const lastAnswerSourceMode = storeAnswerSourceMode;
        const lastAnswerScopeLabel = storeAnswerScopeLabel;

        // isOperational: backend session truth first, heuristic fallback for pre-session window
        const resolvedCompanyId = lastChatScope?.resolved_scope?.company_id;
        // null = session not yet bootstrapped; surfaces should show nothing (no flash)
        const isOperational: boolean | null =
            user === null && !activeCompanyId && !resolvedCompanyId
                ? null
                : user?.operational_state != null
                    ? user.operational_state === 'operational'
                    : !!(resolvedCompanyId ?? activeCompanyId);

        const scopeSource = lastChatScope?.resolved_scope?.scope_source ?? null;

        // Real Mora P1: when the perceive flag is on AND a bundle is loaded,
        // override scope-derived fields with bundle truth. The bundle is the
        // canonical perception; legacy fields stay where the bundle is silent.
        let bundleScopeLevel = scopeLevel;
        let bundleScopeLabels = scopeLabels;
        let bundleIsOperational = isOperational;
        if (flagOn && perceptionBundle) {
            bundleScopeLevel = deriveScopeLevelFromBundle(perceptionBundle);
            bundleScopeLabels = deriveScopeLabelsFromBundle(perceptionBundle);
            // A successful bundle delivery implies an authenticated, scoped session.
            // Preserve explicit setup_required if backend says so; otherwise treat
            // bundle presence as a positive operational signal.
            if (user?.operational_state === 'setup_required') {
                bundleIsOperational = false;
            } else {
                bundleIsOperational = true;
            }
        }

        return {
            scopeLevel: bundleScopeLevel,
            scopeLabels: bundleScopeLabels,
            scopeEnforced,
            scopeReason,
            scopeDroppedFields,
            orbState,
            // isOffline: no coreError in focused stores — treat as always online.
            // coreError on moraState is being deprecated; this field will be wired
            // to a dedicated connectivity store in a future migration step.
            isOffline: false,
            memoryPendingCount,
            memoryFactCount: memoryOverview.structuredFacts,
            lastScopeUpdateAt,
            lastScopeSource,
            lastAnswerSource,
            lastAnswerSourceMode,
            lastAnswerScopeLabel,
            isOperational: bundleIsOperational,
            scopeSource,
        };
    }, [
        orbState, lastChatScope,
        companies, activeCompanyId,
        activeDepartmentId, activeSpaceId, activeFolderId,
        departments, treeNodes,
        memoryPendingCount,
        storeAnswerSource, storeAnswerSourceMode, storeAnswerScopeLabel,
        memoryOverview,
        user,
        flagOn, perceptionBundle,
    ]);
}

// ─── Bundle-driven derivation helpers (Real Mora P1) ───────────────────────

function deriveScopeLevelFromBundle(bundle: PerceptionBundle): MoraContextSnapshot['scopeLevel'] {
    const s = bundle.scope;
    if (s.folder) return 'folder';
    if (s.space) return 'space';
    if (s.department) return 'department';
    if (s.company) return 'company';
    return 'global';
}

function deriveScopeLabelsFromBundle(bundle: PerceptionBundle): MoraContextSnapshot['scopeLabels'] {
    const labels: MoraContextSnapshot['scopeLabels'] = {};
    const s = bundle.scope;
    if (s.company) labels.company = s.company.name;
    if (s.department) labels.department = s.department.name;
    if (s.space) labels.space = s.space.name;
    if (s.folder) labels.folder = s.folder.name;
    return labels;
}
