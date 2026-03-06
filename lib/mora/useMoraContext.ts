// lib/mora/useMoraContext.ts
"use client";

import { useMemo } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { useMemoryPendingCount } from '@/lib/hooks/useMemoryPendingCount';
import type { OrbState } from '@/lib/api/awarenessClient';

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
    lastAnswerScopeLabel: string | null;
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

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * useMoraContext
 *
 * Normalization-only hook. Reads moraState + useMemoryPendingCount.
 * No fetches. No mutations. Safe to call in any surface.
 *
 * NOTE: The store tracks active entities by ID only (activeDepartmentId,
 * activeSpaceId, activeFolderId). Names are resolved by joining against
 * the departments / spacesByDepartment / foldersBySpace collections.
 */
export function useMoraContext(): MoraContextSnapshot {
    const orbState = useMoraStore((s) => s.orbState);
    const coreError = useMoraStore((s) => s.coreError);
    const lastChatScope = useMoraStore((s) => s.lastChatScope);
    const companies = useMoraStore((s) => s.companies);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    // Store uses ID-only fields — not full entity objects.
    const activeDepartmentId = useMoraStore((s) => s.activeDepartmentId);
    const activeSpaceId = useMoraStore((s) => s.activeSpaceId);
    const activeFolderId = useMoraStore((s) => s.activeFolderId);
    // Entity collections for name resolution.
    const departments = useMoraStore((s) => s.departments);
    const spacesByDepartment = useMoraStore((s) => s.spacesByDepartment);
    const foldersBySpace = useMoraStore((s) => s.foldersBySpace);

    // Answer provenance — wired from store (MR18 backend now live)
    const storeAnswerSource = useMoraStore((s) => s.lastAnswerSource);
    const storeAnswerScopeLabel = useMoraStore((s) => s.lastAnswerScopeLabel);

    const memoryPendingCount = useMemoryPendingCount();

    return useMemo((): MoraContextSnapshot => {
        const resolved = lastChatScope?.resolved_scope;
        const contract = lastChatScope?.scope_contract;

        // Scope level
        const scopeLevel = deriveScopeLevel(resolved);

        // Name resolution helpers
        const safeCompanies = Array.isArray(companies) ? companies : [];
        const safeDepartments = Array.isArray(departments) ? departments : [];
        // Flatten nested space/folder maps into searchable arrays.
        const allSpaces = Object.values(spacesByDepartment ?? {}).flat();
        const allFolders = Object.values(foldersBySpace ?? {}).flat();

        const activeCompany = safeCompanies.find((c) => c.id === activeCompanyId);
        const activeDepartment = safeDepartments.find((d) => d.id === activeDepartmentId);
        const activeSpace = allSpaces.find((s) => s.id === activeSpaceId);
        const activeFolder = allFolders.find((f) => f.id === activeFolderId);

        // Scope labels — prefer store entity names, fall back to resolved_scope IDs.
        const scopeLabels: MoraContextSnapshot['scopeLabels'] = {};
        if (resolved?.company_id || activeCompanyId) {
            scopeLabels.company = activeCompany?.name ?? resolved?.company_id ?? undefined;
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

        // Answer provenance — wired from store, populated by useMoraStream SSE preamble (MR18)
        const lastAnswerSource = storeAnswerSource;
        const lastAnswerScopeLabel = storeAnswerScopeLabel;

        return {
            scopeLevel,
            scopeLabels,
            scopeEnforced,
            scopeReason,
            scopeDroppedFields,
            orbState,
            isOffline: coreError !== null,
            memoryPendingCount,
            memoryFactCount: 0, // extend when metrics are in store
            lastScopeUpdateAt,
            lastScopeSource,
            lastAnswerSource,
            lastAnswerScopeLabel,
        };
    }, [
        orbState, coreError, lastChatScope,
        companies, activeCompanyId,
        activeDepartmentId, activeSpaceId, activeFolderId,
        departments, spacesByDepartment, foldersBySpace,
        memoryPendingCount,
        storeAnswerSource, storeAnswerScopeLabel,
    ]);
}
