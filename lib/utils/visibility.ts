import type { NodeVisibility } from '@/lib/types/core';

export type VisibilityScope = 'personal' | 'company' | 'department' | 'public_link';

const VISIBILITY_VALUES = new Set<NodeVisibility>(['private', 'department', 'company', 'public']);

export function normalizeVisibilityScope(scope?: string | null): VisibilityScope | null {
    const normalized = (scope || '').trim().toLowerCase();
    if (!normalized) return null;
    if (['personal', 'private', 'owner', 'me'].includes(normalized)) return 'personal';
    if (['company', 'workspace', 'team'].includes(normalized)) return 'company';
    if (['department', 'bereich'].includes(normalized)) return 'department';
    if (['public_link', 'public', 'link'].includes(normalized)) return 'public_link';
    return null;
}

export function visibilityFromScope(
    scope?: string | null,
    fallback?: string | null,
): NodeVisibility | null {
    const normalizedScope = normalizeVisibilityScope(scope);
    if (normalizedScope === 'personal') return 'private';
    if (normalizedScope === 'department') return 'department';
    if (normalizedScope === 'company') return 'company';
    if (normalizedScope === 'public_link') return 'public';

    const normalizedFallback = (fallback || '').trim().toLowerCase();
    if (normalizedFallback === 'visible') return 'company';
    if (VISIBILITY_VALUES.has(normalizedFallback as NodeVisibility)) return normalizedFallback as NodeVisibility;
    return null;
}

export function isWorkspaceVisibilityScope(scope?: string | null): boolean {
    return normalizeVisibilityScope(scope) === 'company';
}

export function isPrivateVisibilityScope(scope?: string | null): boolean {
    return normalizeVisibilityScope(scope) === 'personal';
}

export function isSharedVisibilityScope(scope?: string | null): boolean {
    const normalized = normalizeVisibilityScope(scope);
    return normalized === 'company' || normalized === 'department' || normalized === 'public_link';
}

export function getCoreFileVisibilityLabel(scope?: string | null, linkedNodeId?: string | null): string {
    const normalized = normalizeVisibilityScope(scope);
    if (normalized === 'public_link') return 'Freigabelink';
    if (normalized === 'department') return 'Bereich sichtbar';
    if (normalized === 'company') return 'Workspace sichtbar';
    return linkedNodeId ? 'Privat + OS-Dokument' : 'Privat';
}
