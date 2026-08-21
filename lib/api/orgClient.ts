// lib/api/orgClient.ts
// Organizational hierarchy functions extracted from coreClient.ts.
// Covers: companies, departments, spaces, folders, nodes, tree.

import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from '@/lib/types/core';
import { coreGet, corePost, corePatch, corePut, coreDelete, normalizeList, CoreError, getCoreBaseUrl, readCookie, isLocalhost, AUTH_COOKIE, isForwardableCoreToken } from './http';
import { UNASSIGNED_DEPARTMENT_ID, UNASSIGNED_DEPARTMENT_NAME } from '@/lib/constants/tree';

// ========== COMPANY FUNCTIONS ==========

export interface CompanyUpdatePayload {
    name?: string;
    description?: string | null;
    logo_url?: string | null;
    is_demo?: boolean;
}

export async function updateCompany(companyId: string, payload: CompanyUpdatePayload): Promise<CoreCompany> {
    return corePatch(`/v3/companies/${companyId}`, payload);
}

export async function fetchCompanies(includeDemo = false): Promise<CoreCompany[]> {
    try {
        const query = includeDemo ? '?include_demo=true' : '';
        const result = await coreGet(`/v3/companies${query}`);
        if (!result && hasLocalDemoFallbackSession()) return [localDemoFallbackCompany()];
        return normalizeList<CoreCompany>(result, ['companies']);
    } catch (error: any) {
        // Silent fallback for auth errors - return empty array
        if (error instanceof CoreError && (error.status === 401 || error.status === 403)) {
            return [];
        }
        if (hasLocalDemoFallbackSession()) return [localDemoFallbackCompany()];
        throw error;
    }
}

export interface GuidedDemoResult {
    tenant_id: string;
    company_id: string;
    content_pack: string;
    has_data: boolean;
}

export async function ensureGuidedDemoCompany(pack = 'mittelstand'): Promise<GuidedDemoResult> {
    return corePost('/v3/companies/guided-demo', { pack });
}

function hasLocalDemoFallbackSession() {
    return isLocalhost() && readCookie('mora_session') === 'local_demo_fallback';
}

function localDemoFallbackCompany(): CoreCompany {
    const websiteEntryName = localWebsiteEntryCompanyName();
    const name = websiteEntryName || 'Local Preview Workspace';
    const isWebsiteEntryFallback = Boolean(websiteEntryName);
    return {
        id: isWebsiteEntryFallback ? 'company-website-entry-local' : 'company-local-demo',
        tenant_id: isWebsiteEntryFallback ? 'tenant-preview-local' : 'tenant-demo',
        owner_id: 'local-demo-user',
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'local-preview-workspace',
        description: isWebsiteEntryFallback
            ? 'Aus dem Website-Check erzeugter lokaler HQ-Workspace.'
            : 'Lokaler Demo-Fallback, wenn Mora Core nicht erreichbar ist.',
        logo_url: null,
        settings: null,
        is_demo: !isWebsiteEntryFallback,
    };
}

function localWebsiteEntryCompanyName() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem('saimor_website_entry_context');
        const parsed = raw ? JSON.parse(raw) : null;
        return typeof parsed?.companyName === 'string' && parsed.companyName.trim()
            ? parsed.companyName.trim()
            : null;
    } catch {
        return null;
    }
}

export async function getCompany(id: string): Promise<CoreCompany> {
    return coreGet(`/v3/companies/${id}`);
}

export interface CreateCompanyPayload {
    name: string;
    description?: string;
    slug?: string;
    is_owner_company?: boolean; // Creates with demo departments/spaces/folders/nodes
}

export async function createCompany(payload: CreateCompanyPayload): Promise<CoreCompany> {
    return corePost('/v3/companies', payload);
}

// ========== COMPANY HEALTH (OWNER VIEW - METRICS ONLY) ==========

export interface CompanyHealth {
    company_id: string;
    name: string;
    slug: string;
    health_score: number; // 0.0 - 1.0
    last_activity: string | null;
    node_count: number;
    folder_count: number;
    space_count: number;
    department_count: number;
    active_users: number;
}

export interface CompaniesHealthResponse {
    companies: CompanyHealth[];
    total: number;
}

/**
 * Fetch health metrics for all companies (OWNER VIEW ONLY)
 * Returns ONLY metrics, NO content/data access!
 * Privacy: Owner cannot see inside client workspaces.
 */
export async function fetchCompaniesHealth(): Promise<CompaniesHealthResponse> {
    try {
        return await coreGet('/v3/companies/health');
    } catch (error: any) {
        if (error instanceof CoreError && (error.status === 401 || error.status === 403)) {
            return { companies: [], total: 0 };
        }
        console.error('Failed to fetch companies health:', error);
        throw error;
    }
}

// ========== FETCH FUNCTIONS ==========

export async function fetchDepartments(companyId?: string): Promise<CoreDepartment[]> {
    const query = companyId ? `?company_id=${companyId}` : '';
    // v3: envelope unwrap handled transparently in coreRequest()
    const result = await coreGet(`/v3/departments${query}`, { isOptional: true });
    return normalizeList<CoreDepartment>(result, ['departments']);
}

export async function fetchSpaces(departmentId?: string): Promise<CoreSpace[]> {
    const query = departmentId ? `?department_id=${departmentId}` : '';
    const result = await coreGet(`/v3/spaces${query}`, { isOptional: true });
    return normalizeList<CoreSpace>(result, ['spaces']);
}

export async function fetchSpacesByCompany(companyId: string): Promise<CoreSpace[]> {
    const result = await coreGet(`/v3/spaces?company_id=${encodeURIComponent(companyId)}`, { isOptional: true });
    return normalizeList<CoreSpace>(result, ['spaces']);
}

export async function fetchFolders(spaceId: string): Promise<CoreFolder[]> {
    const result = await coreGet(`/v3/folders?space_id=${spaceId}`, { isOptional: true });
    return normalizeList<CoreFolder>(result, ['folders']);
}

export async function fetchFoldersByCompany(companyId: string): Promise<CoreFolder[]> {
    const result = await coreGet(`/v3/folders?company_id=${encodeURIComponent(companyId)}`, { isOptional: true });
    return normalizeList<CoreFolder>(result, ['folders']);
}

export async function fetchNodes(
    folderId: string,
    options?: { search?: string; type?: string; limit?: number; offset?: number }
): Promise<CoreNode[]> {
    let query = `?folder_id=${folderId}`;
    if (options?.search) query += `&search=${encodeURIComponent(options.search)}`;
    if (options?.type && options.type !== 'all') query += `&type=${encodeURIComponent(options.type)}`;
    if (options?.limit != null) query += `&limit=${options.limit}`;
    if (options?.offset != null) query += `&offset=${options.offset}`;
    const result = await coreGet(`/v3/nodes${query}`, { isOptional: true });
    return normalizeList<CoreNode>(result, ['nodes']);
}

export async function fetchNodesByCompany(
    companyId: string,
    options?: { limit?: number; offset?: number }
): Promise<CoreNode[]> {
    let query = `?company_id=${companyId}`;
    if (options?.limit != null) query += `&limit=${options.limit}`;
    if (options?.offset != null) query += `&offset=${options.offset}`;
    const result = await coreGet(`/v3/nodes${query}`, { isOptional: true });
    return normalizeList<CoreNode>(result, ['nodes']);
}

export async function fetchNodeDetails(nodeId: string): Promise<CoreNode> {
    return coreGet(`/v3/nodes/${nodeId}`);
}

export async function fetchNodeRelations(nodeId: string): Promise<any[]> {
    const result = await coreGet(`/v3/nodes/${nodeId}/relations`, { isOptional: true });
    return normalizeList<any>(result, ['relations', 'nodes']);
}

// P1: Real graph context (folder/space/department names + neighbours from stored relations)
export interface NodeGraphNeighbour { id: string; title?: string; type?: string; }
export interface NodeGraphContext {
    folder?: string | null;
    space?: string | null;
    department?: string | null;
    neighbours?: NodeGraphNeighbour[];
}
export async function fetchNodeGraphContext(nodeId: string): Promise<NodeGraphContext | null> {
    return coreGet(`/v3/nodes/${nodeId}/context`, { isOptional: true }) as Promise<NodeGraphContext | null>;
}

// ========== TREE ==========

export type TreeApiResponse = {
    departments?: any[];
    // Spaces ohne department_id - CORE liefert sie additiv, statt sie
    // stillschweigend zu verwerfen. Siehe core/api_schemas/tree.py.
    unassigned_spaces?: any[];
};

// Map backend tree response (departments + spaces + folders + nodes) into the UI-friendly CoreTreeNode shape
export function mapTreeResponseToNodes(response: TreeApiResponse): CoreTreeNode[] {
    if (!response) return [];

    const mapNode = (node: any): CoreTreeNode => ({
        id: node.id,
        type: 'node',
        name: node.title || node.name || 'Node',
        slug: node.slug,
        color: node.color,
        nodeType: node.type || 'other',
        children: [],
    });

    const mapFolder = (folder: any): CoreTreeNode => ({
        id: folder.id,
        type: 'folder',
        name: folder.name,
        slug: folder.slug,
        color: folder.color,
        children: [
            ...(folder.subfolders || []).map(mapFolder),
            ...(folder.nodes || []).map(mapNode),
        ],
    });

    const mapSpace = (space: any): CoreTreeNode => ({
        id: space.id,
        type: 'space',
        name: space.name,
        slug: space.slug,
        color: space.color,
        children: (space.folders || []).map(mapFolder),
    });

    const mapDepartment = (dept: any): CoreTreeNode => ({
        id: dept.id,
        type: 'department',
        name: dept.name,
        slug: dept.slug,
        color: dept.color,
        children: (dept.spaces || []).map(mapSpace),
    });

    const departments = normalizeList<any>(response.departments, ['departments']).map(mapDepartment);

    // Nicht als eigenes Feld daneben halten, sondern als department-foermigen
    // Eintrag anhaengen: alles, was den Baum liest - vor allem Universe -
    // filtert schon auf `type === 'department'` und muss diesen Fall dadurch
    // nicht gesondert kennen. Nur anhaengen, wenn es wirklich etwas gibt -
    // ein leerer Sammel-Eintrag waere ein Bereich, der nichts enthaelt.
    const unassignedSpaces = normalizeList<any>(response.unassigned_spaces, ['unassigned_spaces']);
    if (unassignedSpaces.length > 0) {
        departments.push({
            id: UNASSIGNED_DEPARTMENT_ID,
            type: 'department',
            name: UNASSIGNED_DEPARTMENT_NAME,
            slug: 'unassigned',
            color: null,
            children: unassignedSpaces.map(mapSpace),
        });
    }

    return departments;
}

// ========== WIRTSCHAFT ==========

/**
 * Echte Abonnements, provider-uebergreifend. GET /v3/workspace/billing
 * existiert bereits (core/api/v3/workspace.py) und liest tenant_subscriptions
 * direkt - kein neuer CORE-Endpunkt noetig, nur eine Konsumentin dafuer.
 * `isOptional: true`, weil eine leere Wirtschaft kein Fehlerzustand ist.
 */
export async function fetchWorkspaceSubscriptions(): Promise<import('@/lib/business/mrr').BillingSubscription[]> {
    const result = await coreGet('/v3/workspace/billing', { isOptional: true });
    return normalizeList<any>(result, ['subscriptions']);
}

export async function fetchTree(tenantId?: string, companyId?: string): Promise<CoreTreeNode[]> {
    let query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    if (companyId) {
        query += query ? `&company_id=${encodeURIComponent(companyId)}` : `?company_id=${encodeURIComponent(companyId)}`;
    }
    const response = await coreGet(`/v3/tree${query}`) as TreeApiResponse;
    return mapTreeResponseToNodes(response);
}

export async function fetchTreeData(tenantId?: string, companyId?: string): Promise<TreeApiResponse> {
    let query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    if (companyId) {
        query += query ? `&company_id=${encodeURIComponent(companyId)}` : `?company_id=${encodeURIComponent(companyId)}`;
    }
    return coreGet(`/v3/tree${query}`);
}

export async function fetchNodeChildren(nodeId: string, type: 'department' | 'space' | 'folder'): Promise<CoreTreeNode[]> {
    const children = await coreGet(`/v3/tree/${nodeId}/children?type=${type}`, { isOptional: true });
    const safeChildren = normalizeList<any>(children, ['children', 'items', 'nodes']);
    // Map raw response to CoreTreeNode if necessary, but the backend returns Tree* models which usually match.
    // However, we should ensure the type mapping is correct for the UI.

    // Helper to map backend shape to frontend CoreTreeNode
    return safeChildren.map((c: any) => {
        // Backend returns mixed types. We need to normalize.
        // If it looks like a folder (has 'space_id' or 'parent_folder_id' or 'folder-type')
        // For now, let's assume the backend TreeFolder model matches CoreTreeNode loosely.

        let nodeType = 'file';
        if (c.folders !== undefined && c.subfolders !== undefined) {
            // It's a Space (has folders) or Department (has spaces)?
            // Actually, TreeDepartment has 'spaces', TreeSpace has 'folders'
            if (c.spaces !== undefined) return { ...c, type: 'department', children: [] };
            if (c.folders !== undefined) return { ...c, type: 'space', children: [] };
            if (c.nodes !== undefined) return { ...c, type: 'folder', children: [] };
        }

        // If we are lazy loading, we receive:
        // Dept -> Spaces
        // Space -> Folders
        // Folder -> Subfolders + Nodes

        if (type === 'department') return { ...c, type: 'space', children: [] };
        if (type === 'space') return { ...c, type: 'folder', children: [] };

        // Folder returns mixed content
        if (c.type) return { ...c, nodeType: c.type }; // Node already has type field like 'document'

        // Fallback for subfolders which might not have explicit type field in all serializations
        return { ...c, type: 'folder', children: [] };
    });
}

// ========== CREATE FUNCTIONS ==========
// Backend now auto-generates IDs and slugs

export interface CreateSpacePayload {
    department_id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}

export async function createSpace(payload: CreateSpacePayload): Promise<CoreSpace> {
    return corePost('/v3/spaces', payload);
}

export interface CreateFolderPayload {
    space_id: string;
    name: string;
    color?: string;
    description?: string;
}

export async function createFolder(payload: CreateFolderPayload): Promise<CoreFolder> {
    return corePost('/v3/folders', payload);
}

export interface CreateNodePayload {
    folder_id?: string;
    company_id?: string; // NEW: support direct company creation
    title: string;
    type: 'document' | 'task' | 'note' | 'link' | 'other';
    content?: string;
    url?: string;
    metadata?: any;
}

export async function createNode(payload: CreateNodePayload): Promise<CoreNode> {
    return corePost('/v3/nodes', payload);
}

export interface UpdateNodePayload {
    title?: string;
    type?: 'document' | 'task' | 'note' | 'link' | 'other';
    content?: string;
    url?: string;
    folder_id?: string; // NEW: support move
    metadata?: any;
}

export async function updateNode(id: string, payload: UpdateNodePayload): Promise<CoreNode> {
    return corePatch(`/v3/nodes/${id}`, payload);
}

export async function deleteNode(id: string): Promise<void> {
    return coreDelete(`/v3/nodes/${id}`);
}

// Department helpers (Tag 10+)
export interface CreateDepartmentPayload {
    name: string;
    slug?: string;  // Auto-generated from name if not provided
    description?: string;
    color?: string;
    icon?: string;
    company_id?: string;
}

export const createDepartment = async (payload: CreateDepartmentPayload) => {
    // Auto-generate slug from name if not provided
    const slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return corePost('/v3/departments', { ...payload, slug });
};

export const createSimpleDepartment = async (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return corePost('/v3/departments/create-simple', { name, slug });
};

// ========== UPDATE & DELETE FUNCTIONS ==========

export interface UpdateDepartmentPayload {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
}

export async function updateDepartment(id: string, payload: UpdateDepartmentPayload): Promise<CoreDepartment> {
    return corePatch(`/v3/departments/${id}`, payload);
}

export async function deleteDepartment(id: string): Promise<void> {
    return coreDelete(`/v3/departments/${id}`);
}

export interface UpdateSpacePayload {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
}

export async function updateSpace(id: string, payload: UpdateSpacePayload): Promise<CoreSpace> {
    return corePatch(`/v3/spaces/${id}`, payload);
}

export async function deleteSpace(id: string): Promise<void> {
    return coreDelete(`/v3/spaces/${id}`);
}

export interface UpdateFolderPayload {
    name?: string;
    description?: string;
    color?: string;
}

export async function updateFolder(id: string, payload: UpdateFolderPayload): Promise<CoreFolder> {
    return corePatch(`/v3/folders/${id}`, payload);
}

export async function deleteFolder(id: string): Promise<void> {
    return coreDelete(`/v3/folders/${id}`);
}

// ========== UPLOAD FUNCTION ==========

export async function uploadFile(file: File, folderId: string, title?: string): Promise<CoreNode> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', folderId);
    if (title) formData.append('title', title);

    const token = [
        readCookie(AUTH_COOKIE),
        isLocalhost() ? localStorage.getItem('saimor_dev_token') : null,
        process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT,
        process.env.NEXT_PUBLIC_API_TOKEN,
    ].find(isForwardableCoreToken);

    if (!token) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${getCoreBaseUrl()}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        let message = `Upload Failed: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            if (errorBody.detail) message = errorBody.detail;
        } catch { }
        throw new CoreError(message, response.status);
    }

    return response.json();
}

export async function importCompanyStructure(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = [
        readCookie(AUTH_COOKIE),
        isLocalhost() ? localStorage.getItem('saimor_dev_token') : null,
        process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT,
        process.env.NEXT_PUBLIC_API_TOKEN,
    ].find(isForwardableCoreToken);

    if (!token) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${getCoreBaseUrl()}/v3/companies/import`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        let message = `Import Failed: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            if (errorBody.detail) message = errorBody.detail;
        } catch { }
        throw new CoreError(message, response.status);
    }

    const json = await response.json();
    if (json && !Array.isArray(json) && 'data' in json && 'meta' in json && json.meta?.api_version === 'v3') {
        return json.data;
    }
    return json;
}
