// lib/api/contentClient.ts
// User content functions extracted from coreClient.ts.
// Covers: folder context, entity context, personal space/home note, user content surface, sharing.

import type { CoreFolder, CoreNode, NodeVisibility } from '@/lib/types/core';
import { coreGet, corePost, corePut } from './http';

// ─── Folder context (breadcrumb path) ────────────────────────────────────────

export interface FolderContextSegment {
    id: string;
    name: string;
}

export interface FolderContextPath {
    company: FolderContextSegment | null;
    department: FolderContextSegment | null;
    space: FolderContextSegment | null;
    breadcrumbs: FolderContextSegment[];
}

export interface FolderContext {
    scope: string;
    folder: FolderContextSegment;
    path: FolderContextPath;
    counts: { nodes: number; subfolders: number };
}

export async function fetchFolderContext(folderId: string): Promise<FolderContext | null> {
    if (!folderId) return null;
    return coreGet(`/v3/folders/${folderId}/context`, { isOptional: true });
}

// GET /v3/{entity_id}/context — generic entity resolver (core SHA 001f61c)
// Returns {resolved:false} for unknown ids (no 404), so safe to call speculatively.
export interface EntityContext {
    resolved: boolean;
    reason?: string;
    context_lookup?: {
        resolved: boolean;
        reason?: string;
    };
    entity_type?: 'folder' | 'space' | 'department' | 'company' | string;
    entity_id?: string;
    path?: FolderContextPath;
    name?: string;
}

export async function getEntityContext(entityId: string): Promise<EntityContext | null> {
    if (!entityId) return null;
    return coreGet(`/v3/${entityId}/context`, { isOptional: true });
}

// ── Personal Space (v3) ────────────────────────────────────────────────────────

export interface PersonalSpace {
    id: string;
    name: string;
    owner_id: string;
    created_at?: string;
}

export async function fetchPersonalSpace(): Promise<PersonalSpace | null> {
    return coreGet('/v3/users/me/personal-space', { isOptional: true });
}

export interface PersonalHomeNote {
    content: string;
    noteId?: string;
    updated_at?: string;
}

interface PersonalHomeNoteApiPayload {
    space?: PersonalSpace | null;
    folder?: { id: string; name?: string } | null;
    note?: {
        id: string;
        title?: string;
        name?: string;
        content?: string;
        updated_at?: string;
    } | null;
}

function normalizePersonalHomeNote(payload: PersonalHomeNoteApiPayload | null): PersonalHomeNote | null {
    if (!payload) return null;
    const note = payload.note;
    if (!note) {
        return { content: '' };
    }
    const content = typeof note.content === 'string' ? note.content : '';
    return {
        content,
        noteId: note.id,
        updated_at: note.updated_at,
    };
}

export async function fetchPersonalHomeNote(): Promise<PersonalHomeNote | null> {
    const payload = await coreGet('/v3/users/me/personal-home-note', { isOptional: true }) as PersonalHomeNoteApiPayload | null;
    return normalizePersonalHomeNote(payload);
}

export async function savePersonalHomeNote(content: string): Promise<PersonalHomeNote | null> {
    const payload = await corePut('/v3/users/me/personal-home-note', { content }, { isOptional: true }) as PersonalHomeNoteApiPayload | null;
    return normalizePersonalHomeNote(payload);
}

// ── My Content (v3) ───────────────────────────────────────────────────────────

/**
 * The full user content surface returned by GET /v3/users/me/content (Core: 5616cc6+).
 *
 * Server-owned user content — not locally stitched, not fabricated.
 * `author_id` / `owner_id` / `visibility` on nodes are honest server truth,
 * primarily reliable on personal-scoped content. This is NOT a global node ACL system.
 *
 * All fields are optional: the server returns what it can honestly derive today.
 * Callers must handle missing sections gracefully.
 */
export interface UserContentResponse {
    /** The user's personal space anchor. */
    space?: PersonalSpace | null;
    /** Folders owned by or shared with the user in their personal space. */
    folders?: CoreFolder[];
    /** Documents and other structured work items owned by the user. */
    documents?: CoreNode[];
    /** Legacy alias kept for older callers. */
    nodes?: CoreNode[];
    /** Visible user items in product truth order. */
    items?: Array<{
        id: string;
        kind: 'document' | 'file';
        label: string;
        timestamp?: string | null;
        visibility?: NodeVisibility;
        node_id?: string | null;
        file_id?: string | null;
    }>;
    /** Uploaded files owned by the user. */
    files?: Array<{
        id: string;
        name: string;
        size?: number | null;
        mime_type?: string | null;
        created_at?: string | null;
        owner_id?: string | null;
        visibility?: NodeVisibility;
        linked_status?: 'document' | 'standalone';
        linked_node_id?: string | null;
        linked_folder_id?: string | null;
        source_available?: boolean;
        source_status?: 'ready' | 'missing' | string | null;
    }>;
    /** Personal cloud storage connectors bound to this user's private area. */
    cloud_storage?: {
        configured?: boolean;
        enabled?: boolean;
        status?: string;
        count?: number;
        providers?: string[];
        connectors?: Array<{
            id: string;
            provider: string;
            label: string;
            enabled?: boolean;
            status?: string;
            auth_type?: string;
            base_url?: string | null;
            webdav_url?: string | null;
            account_hint?: string | null;
            root_path?: string | null;
            setup_required?: string | null;
        }>;
    };
    /** Summary counts for quick display. */
    counts?: {
        folders?: number;
        documents?: number;
        nodes?: number;
        items?: number;
        files?: number;
        standalone_files?: number;
        linked_source_files?: number;
        total?: number;
    };
    /** Ownership metadata for this content surface. */
    ownership?: {
        user_id: string;
        [key: string]: unknown;
    };
}

/**
 * Items returned by cloud connector live listings.
 */
export interface CloudFileItem {
    id: string;
    name: string;
    kind: 'file' | 'folder' | string;
    path?: string | null;
    mime_type?: string | null;
    size?: number | null;
    modified_at?: string | null;
    web_url?: string | null;
    provider: string;
    connector_id: string;
    parent_id?: string | null;
}

export interface CloudFileListResponse {
    connector_id: string;
    provider: string;
    account_hint?: string | null;
    current_path?: string | null;
    parent_path?: string | null;
    items: CloudFileItem[];
    count: number;
    next_page_token?: string | null;
    status?: string;
}

/**
 * Fetch the current user's personal content surface.
 * Returns the full structured response (space, folders, nodes, files, counts, ownership).
 * Returns null if the endpoint is unavailable — degrade gracefully.
 */
export async function fetchMyContent(): Promise<UserContentResponse | null> {
    return coreGet('/v3/users/me/content', { isOptional: true });
}

/**
 * Fetch live items from a cloud connector (Google Drive, SharePoint, Nextcloud).
 * items are read-only and listed live from the provider.
 */
export async function fetchCloudConnectorItems(
    connectorId: string,
    limit: number = 20,
    path?: string | null,
): Promise<CloudFileListResponse | null> {
    if (!connectorId) return null;
    const params = new URLSearchParams({ limit: String(limit) });
    const normalizedPath = (path || '').trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
    if (normalizedPath) params.set('path', normalizedPath);
    return coreGet(`/v3/integrations/cloud/${connectorId}/items?${params.toString()}`, { isOptional: true });
}

// ── Sharing ───────────────────────────────────────────────────────────────────

/**
 * Response from POST /v3/files/{id}/share or POST /v3/nodes/{id}/share.
 * Matches the live contract (Core: 77f4fda).
 */
export interface ShareResult {
    file_id: string;
    company_id: string;
    owner_user_id: string;
    /** NodeVisibility level of the shared item. */
    visibility: string;
    /** Scope qualifier for the visibility rule. */
    visibility_scope?: string | null;
    /** Relative public path, e.g. /s/abc123 */
    public_path: string;
    /** Absolute public URL — present this to the user. */
    public_url: string;
    /** Share status — e.g. 'active'. */
    status: string;
}

/**
 * Generate a public share link for a node.
 *
 * Honest scope (Core: 77f4fda):
 * - File-backed nodes: delegates to the linked file share contract → returns ShareResult
 * - Non-file-backed nodes: server returns 409 → isOptional maps to null here
 *   Callers must surface this as an explicit limitation, not a generic error.
 */
export async function shareNode(nodeId: string): Promise<ShareResult | null> {
    return corePost(`/v3/nodes/${nodeId}/share`, {}, { isOptional: true });
}

/**
 * Generate a public share link for an uploaded file.
 * Files are always shareable — this is the primary public-link path.
 * Returns null on failure.
 */
export async function shareFile(fileId: string): Promise<ShareResult | null> {
    return corePost(`/v3/files/${fileId}/share`, {}, { isOptional: true });
}
