// lib/api/adminClient.ts
// Admin user management functions extracted from coreClient.ts.
// Covers: team admin (v3/team/admin) and roster admin (v3/admin).

import { coreGet, corePost, corePatch, normalizeList } from './http';

// ─── Admin user management (v3) ──────────────────────────────────────────────

export interface AdminUser {
    user_id?: string;
    id?: string;
    name?: string;
    full_name?: string | null;
    email: string;
    role: 'member' | 'admin' | 'owner';
    is_active: boolean;
    default_company_id?: string | null;
    created_at?: string;
    company_context?: {
        owned_companies?: Array<{ id: string; name: string }>;
        effective_companies?: Array<{ id: string; name: string }>;
        binding_source?: 'owner' | 'tenant_scope' | string;
    };
}

export interface AdminUserPatch {
    role?: 'member' | 'admin' | 'owner';
    is_active?: boolean;
}

export async function fetchAdminUsers(includeInactive = true): Promise<AdminUser[]> {
    const result = await coreGet(
        `/v3/team/admin/users?include_inactive=${includeInactive}`,
        { isOptional: true }
    );
    return normalizeList<AdminUser>(result, ['users', 'members']);
}

export async function patchAdminUser(userId: string, patch: AdminUserPatch): Promise<AdminUser | null> {
    return corePatch(`/v3/team/admin/users/${userId}`, patch);
}

export async function patchUserCompanyBinding(userId: string, companyId?: string | null): Promise<AdminUser | null> {
    return corePatch(`/v3/team/admin/users/${userId}/company-binding`, { default_company_id: companyId ?? null });
}

// ── Admin: User Roster (v3) ────────────────────────────────────────────────────

/**
 * A user in the company, as seen by an admin/owner (roster view).
 * Returned by GET /v3/admin/users.
 * Named AdminRosterUser to avoid conflict with the existing AdminUser (team management) type.
 */
export interface AdminRosterUser {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'manager' | 'member';
    /** Lifecycle status of this user's account. */
    status: 'active' | 'invited' | 'inactive';
    /** Departments this user is currently a member of. */
    department_memberships: Array<{ id: string; name: string }>;
}

/**
 * Fetch all users in the current company (admin view).
 * Returns null if the endpoint is unavailable.
 * Callers must degrade gracefully -- show an empty state, not a crash.
 */
export async function fetchUserRoster(): Promise<AdminRosterUser[] | null> {
    return coreGet('/v3/admin/users', { isOptional: true });
}

// ── Admin: Membership Management (v3) ─────────────────────────────────────────

/**
 * Update a user's department memberships.
 * Replaces the user's full department membership list with the provided array.
 *
 * Called by MembershipEditor when admin saves changes.
 * Returns null on failure -- callers must handle and show error state.
 */
export async function updateUserMemberships(
    userId: string,
    departmentIds: string[]
): Promise<{ success: boolean } | null> {
    return corePost(
        `/v3/admin/users/${userId}/memberships`,
        { department_ids: departmentIds },
        { isOptional: true }
    );
}

// ── Admin: Department Visibility (v3) ─────────────────────────────────────────

/**
 * Set the visibility classification for a department.
 * Values: 'public' | 'visible' | 'private' (spec Section 4).
 *
 * Called by DepartmentVisibilityEditor when admin changes a department's classification.
 * Returns null on failure.
 */
export async function updateDepartmentVisibility(
    departmentId: string,
    visibility: 'public' | 'visible' | 'private'
): Promise<{ success: boolean } | null> {
    return corePost(
        `/v3/admin/departments/${departmentId}/visibility`,
        { visibility },
        { isOptional: true }
    );
}
