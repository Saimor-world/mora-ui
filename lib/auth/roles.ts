import type { UserRole } from '@/lib/types/mora';

// ═══════════════════════════════════════════════════════════════════════════
// Centralized Role Guards — single source of truth for access decisions
// ═══════════════════════════════════════════════════════════════════════════
//
// Role hierarchy (ascending privilege):
//   demo → member → manager → admin → owner → system_owner
//
// system_owner is a superuser that inherits ALL lower privileges.
// Every role check in the codebase should use these guards instead of
// ad-hoc `role === 'owner' || role === 'admin'` comparisons.

const ROLE_RANK: Record<UserRole, number> = {
    demo:         0,
    member:       1,
    manager:      2,
    admin:        3,
    owner:        4,
    system_owner: 5,
};

/**
 * Check if a role meets or exceeds a minimum required role.
 *
 *   hasMinRole('admin', 'admin')        → true
 *   hasMinRole('member', 'admin')       → false
 *   hasMinRole('system_owner', 'owner') → true
 */
export function hasMinRole(role: UserRole | string | undefined | null, minRole: UserRole): boolean {
    if (!role) return false;
    const rank = ROLE_RANK[role as UserRole];
    if (rank === undefined) return false;
    return rank >= ROLE_RANK[minRole];
}

/** admin, owner, or system_owner */
export function isAdmin(role: UserRole | string | undefined | null): boolean {
    return hasMinRole(role, 'admin');
}

/** Any real user (member+). Excludes demo. */
export function isMember(role: UserRole | string | undefined | null): boolean {
    return hasMinRole(role, 'member');
}

/** owner or system_owner */
export function isOwner(role: UserRole | string | undefined | null): boolean {
    return hasMinRole(role, 'owner');
}

/** Convenience: extract role string and check. Works with user objects. */
export function userIsAdmin(user: { role?: string } | null | undefined): boolean {
    return isAdmin(user?.role);
}

export function userIsMember(user: { role?: string } | null | undefined): boolean {
    return isMember(user?.role);
}

export function userIsOwner(user: { role?: string } | null | undefined): boolean {
    return isOwner(user?.role);
}

/**
 * Human-readable German role label for UI display.
 */
export function roleLabel(role: UserRole | string | undefined | null): string {
    switch (role) {
        case 'system_owner': return 'System-Eigentümer';
        case 'owner':        return 'Eigentümer';
        case 'admin':        return 'Administrator';
        case 'manager':      return 'Manager';
        case 'member':       return 'Mitglied';
        case 'demo':         return 'Demo';
        default:             return 'Unbekannt';
    }
}
