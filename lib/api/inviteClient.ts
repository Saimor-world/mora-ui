// lib/api/inviteClient.ts
import { coreGet, corePost } from './coreClient';

// -- Types --

/**
 * Invite details returned by GET /v3/invites/[token].
 * Membership assignment is live (at time of acceptance), not snapshotted.
 */
export interface InviteDetails {
    token: string;
    company_name: string;
    company_id: string;
    assigned_role: string;
    assigned_departments: Array<{ id: string; name: string }>;
    inviter_name?: string;
    expires_at?: string;
}

export interface AcceptInvitePayload {
    display_name: string;
    password: string;
}

export interface CreateInvitePayload {
    email: string;
    role: 'member' | 'manager' | 'admin';
    department_ids: string[];
}

export interface CreateInviteResult {
    token: string;
    invite_link: string;
}

// -- API calls --

/** Fetch invite details by token. Returns null if token is invalid or expired. */
export async function fetchInvite(token: string): Promise<InviteDetails | null> {
    return coreGet(`/v3/invites/${token}`, { isOptional: true });
}

/**
 * Accept an invite and create the user account.
 * Returns the new user_id on success, null on failure.
 */
export async function acceptInvite(
    token: string,
    payload: AcceptInvitePayload
): Promise<{ user_id: string } | null> {
    return corePost(`/v3/invites/${token}/accept`, payload, { isOptional: true });
}

/** Create a new invite. Called from admin/UsersPane. Returns invite link on success. */
export async function createInvite(
    payload: CreateInvitePayload
): Promise<CreateInviteResult | null> {
    return corePost('/v3/invites', payload, { isOptional: true });
}
