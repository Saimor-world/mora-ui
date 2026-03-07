import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from '@/lib/types/core';

type AccountRole = 'admin' | 'owner' | 'system_owner' | 'manager' | 'member' | 'demo';

/**
 * Core API base URL resolution.
 *
 * - Production usually sets NEXT_PUBLIC_SAIMOR_CORE_URL=https://api.saimor.world
 * - Dev usually proxies through Next.js rewrites at /api/core
 * - Some envs mistakenly include /v1; normalize that away to avoid /v1/v1.
 */
export function getCoreBaseUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || '').trim();
    let base = raw.length > 0 ? raw : '/api/core';
    base = base.replace(/\/+$/, '');
    if (base.toLowerCase().endsWith('/v1')) base = base.slice(0, -3);
    return base.length > 0 ? base : '/api/core';
}

const AUTH_COOKIE = "mora_auth_token";

function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

export class CoreError extends Error {
    status: number;
    details?: any;
    constructor(message: string, status: number, details?: any) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'CoreError';
    }
}

type CoreRequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    skipAuth?: boolean;
    isOptional?: boolean; // If true, 401 errors won't clear tokens/logout
    headers?: Record<string, string>;
};

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
    if (!value) return null;
    const [, raw] = value.split('=');
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() >= exp;
    } catch {
        return true; // If we can't parse, assume expired
    }
}

async function coreRequest(path: string, options: CoreRequestOptions = {}): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    let hasValidToken = false;

    if (!options.skipAuth) {
        const token = readCookie(AUTH_COOKIE);
        // Only use devToken if NO cookie is present - gives priority to fresh sessions
        const devToken = !token && isLocalhost() ? localStorage.getItem('saimor_dev_token') : null;
        const finalToken = token || devToken;

        if (finalToken) {
            // Check if token is expired BEFORE making request
            if (isTokenExpired(finalToken)) {
                // Token expired - clear it silently and return null
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('saimor_dev_token');
                    document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
                }
                return null;
            }
            headers['Authorization'] = `Bearer ${finalToken}`;
            hasValidToken = true;
        } else {
            // NO TOKEN = Skip API call entirely, return null silently
            // This prevents browser from logging 401 errors to console
            return null;
        }
    } else {
        hasValidToken = true; // skipAuth endpoints don't need token
    }

    let response: Response;
    try {
        const url = `${getCoreBaseUrl()}${path}`;
        response = await fetch(url, {
            method: options.method ?? 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: 'include',
        });
    } catch (err: any) {
        // Network error - return null silently
        return null;
    }

    // SILENT HANDLING: 401/403 = auth issue -> return null, caller uses fallback
    if (response.status === 401 || response.status === 403) {
        // Critical: If token was invalid AND not optional, clear it so next refresh doesn't retry bad token
        if (typeof window !== 'undefined' && !options.isOptional) {
            localStorage.removeItem('saimor_dev_token');
            document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        }
        return null;
    }

    if (!response.ok) {
        // For optional requests, silently return null on any error (including 500)
        if (options.isOptional) {
            return null;
        }

        let message = `Core API Error: ${response.status} ${response.statusText}`;
        let details: any = null;
        try {
            const errorBody = await response.json();
            details = errorBody?.detail ?? errorBody ?? null;
            if (errorBody.detail) {
                if (Array.isArray(errorBody.detail)) {
                    message = errorBody.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
                } else {
                    if (typeof errorBody.detail === 'string') {
                        message = errorBody.detail;
                    } else {
                        message = errorBody.detail.message || JSON.stringify(errorBody.detail);
                    }
                }
            }
        } catch {
            // ignore parse errors
        }
        throw new CoreError(message, response.status, details);
    }

    if (response.status === 204) {
        return null;
    }
    try {
        const json = await response.json();
        // Unwrap v3 envelope { data: <payload>, meta: { api_version: "v3", ... } }
        // Guard: both keys must exist AND meta.api_version must be exactly "v3"
        // so v1 payloads that happen to contain a "data" key are not accidentally unwrapped.
        if (
            json !== null &&
            typeof json === 'object' &&
            !Array.isArray(json) &&
            'data' in json &&
            'meta' in json &&
            typeof json.meta === 'object' &&
            json.meta?.api_version === 'v3'
        ) {
            return json.data;
        }
        return json;
    } catch {
        return null;
    }
}

export async function coreGet(path: string, options: Omit<CoreRequestOptions, 'method' | 'body'> = {}): Promise<any> {
    return coreRequest(path, { ...options, method: 'GET' });
}

export async function corePost(path: string, body: any, options: Omit<CoreRequestOptions, 'method'> = {}): Promise<any> {
    return coreRequest(path, { ...options, method: 'POST', body });
}

export async function corePatch(path: string, body: any): Promise<any> {
    return coreRequest(path, { method: 'PATCH', body });
}

export async function corePut(path: string, body: any): Promise<any> {
    return coreRequest(path, { method: 'PUT', body });
}

export async function coreDelete(path: string): Promise<void> {
    await coreRequest(path, { method: 'DELETE' });
}

function normalizeList<T>(value: any, keys: string[] = []): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
        for (const key of keys) {
            const candidate = (value as Record<string, any>)[key];
            if (Array.isArray(candidate)) return candidate as T[];
        }
        const items = (value as Record<string, any>).items;
        if (Array.isArray(items)) return items as T[];
        const data = (value as Record<string, any>).data;
        if (Array.isArray(data)) return data as T[];
    }
    return [];
}

export interface CompanyUpdatePayload {
    name?: string;
    description?: string | null;
    logo_url?: string | null;
    is_demo?: boolean;
}

export async function updateCompany(companyId: string, payload: CompanyUpdatePayload): Promise<CoreCompany> {
    return corePatch(`/v3/companies/${companyId}`, payload);
}


// ========== AUTH FUNCTIONS ==========

export interface AuthPayload {
    email: string;
    password: string;
    role?: AccountRole;
    tenant_id?: string;
}

export interface AuthSession {
    user_id: string;
    email?: string;
    role: AccountRole;
    tenant_id: string;
    token: string;
}

export async function authRegister(payload: AuthPayload): Promise<AuthSession> {
    return corePost('/v1/auth/register', payload, { skipAuth: true });
}

export async function authLogin(payload: AuthPayload): Promise<AuthSession> {
    try {
        return await corePost('/v1/auth/login', payload, { skipAuth: true });
    } catch (err: any) {
        // REAL SYSTEM: No dev-token bypass.
        // If login fails, throw error to UI.
        throw err;
    }
}

export interface UserProfile {
    user_id: string;
    email?: string;
    full_name?: string;
    role: AccountRole;
    tenant_id: string;
    scope?: string;
    demo_mode?: boolean;
}

export async function fetchUserProfile(): Promise<UserProfile> {
    return coreGet('/v3/auth/session');
}

// ========== DEMO FLOW ==========

export interface DemoInstanceState {
    tenant_id: string;
    has_data?: boolean;
    seed_type?: string;
    departments?: any[];
    files?: any[];
    spaces?: any[];
    folders?: any[];
    members?: any[];
}

export async function forceResetDemo(): Promise<any> {
    return corePost('/v1/demo/force-reset', {});
}

export async function fetchDemoInstance(): Promise<DemoInstanceState> {
    return coreGet('/v1/demo/current-instance');
}

export async function connectDemoSource(source = 'simple_coffee_group'): Promise<any> {
    return corePost('/v1/demo/connect-data-source', { source });
}

// ========== SYSTEM FUNCTIONS ==========

export interface SystemStats {
    status: string;
    timestamp: string;
    metrics: {
        cpu: number;
        memory_usage: number;
        memory_available_mb: number;
        os: string;
        uptime_seconds: number;
    };
    intelligence: {
        mora_load: number;
        active_analysts: number;
        cognition_rate: string;
    };
}

export async function fetchSystemStats(): Promise<SystemStats | null> {
    // v3: envelope unwrap handled transparently in coreRequest()
    return coreGet('/v3/system/stats', { isOptional: true });
}

// ========== DEPARTMENT STATS (for Planet Hover) ==========

export interface DepartmentStats {
    department_id: string;
    department_name: string;
    spaces: number;
    folders: number;
    nodes: number;
    docs: number;
    by_type: Record<string, number>;
    health: number;
}

/**
 * Fetch stats for all departments in a company (batch)
 * Used by UniverseView for Planet hover data
 */
export async function fetchDepartmentStats(companyId?: string): Promise<DepartmentStats[]> {
    try {
        const query = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
        // v3: envelope unwrap handled transparently in coreRequest()
        const result = await coreGet(`/v3/stats/departments${query}`, { isOptional: true });
        return normalizeList<DepartmentStats>(result, ['departments']);
    } catch (error) {
        console.warn('[coreClient] fetchDepartmentStats failed:', error);
        return [];
    }
}

/**
 * Fetch stats for a single department (for lazy loading)
 */
export async function fetchSingleDepartmentStats(departmentId: string): Promise<DepartmentStats | null> {
    try {
        // v3: envelope unwrap handled transparently in coreRequest()
        return await coreGet(`/v3/stats/department/${departmentId}`, { isOptional: true });
    } catch (error) {
        console.warn('[coreClient] fetchSingleDepartmentStats failed:', error);
        return null;
    }
}

// ========== COMPANY FUNCTIONS ==========

export async function fetchCompanies(includeDemo = false): Promise<CoreCompany[]> {
    try {
        const query = includeDemo ? '?include_demo=true' : '';
        const result = await coreGet(`/v3/companies${query}`);
        return normalizeList<CoreCompany>(result, ['companies']);
    } catch (error: any) {
        // Silent fallback for auth errors - return empty array
        if (error instanceof CoreError && (error.status === 401 || error.status === 403)) {
            return [];
        }
        throw error;
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
    const result = await coreGet(`/v1/nodes/${nodeId}/relations`, { isOptional: true });
    return normalizeList<any>(result, ['relations', 'nodes']);
}

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

export type TreeApiResponse = {
    departments?: any[];
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

    return normalizeList<any>(response.departments, ['departments']).map(mapDepartment);
}

export async function fetchTree(tenantId?: string, companyId?: string): Promise<CoreTreeNode[]> {
    let query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    if (companyId) {
        query += query ? `&company_id=${encodeURIComponent(companyId)}` : `?company_id=${encodeURIComponent(companyId)}`;
    }
    const response = await coreGet(`/v1/tree${query}`) as TreeApiResponse;
    return mapTreeResponseToNodes(response);
}

export async function fetchTreeData(tenantId?: string, companyId?: string): Promise<TreeApiResponse> {
    let query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    if (companyId) {
        query += query ? `&company_id=${encodeURIComponent(companyId)}` : `?company_id=${encodeURIComponent(companyId)}`;
    }
    return coreGet(`/v1/tree${query}`);
}

export async function fetchNodeChildren(nodeId: string, type: 'department' | 'space' | 'folder'): Promise<CoreTreeNode[]> {
    const children = await coreGet(`/v1/tree/${nodeId}/children?type=${type}`, { isOptional: true });
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
    return corePost('/v1/departments/create-simple', { name, slug });
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

    const token = readCookie(AUTH_COOKIE) ||
        (isLocalhost() ? localStorage.getItem('saimor_dev_token') : null) ||
        process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT ||
        process.env.NEXT_PUBLIC_API_TOKEN;

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

    const token = readCookie(AUTH_COOKIE) ||
        (isLocalhost() ? localStorage.getItem('saimor_dev_token') : null) ||
        process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT ||
        process.env.NEXT_PUBLIC_API_TOKEN;

    if (!token) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${getCoreBaseUrl()}/v1/companies/import`, {
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

    return response.json();
}

// ========== AWARENESS / CORE SIGNALS ==========

export async function recordAwarenessSignal(signalType: string, payload: any = {}): Promise<void> {
    try {
        // SECURITY: Always include tenant_id for proper signal isolation
        const tenantId = typeof window !== 'undefined'
            ? localStorage.getItem('saimor_tenant') || 'tenant-default'
            : 'tenant-default';

        await corePost('/v3/system/awareness', {
            signal_type: signalType,
            payload: {
                ...payload,
                tenant_id: tenantId
            },
            timestamp: new Date().toISOString()
        }, { isOptional: true });
    } catch (err) {
        // Silent fail for awareness signals - no logging to keep console clean
    }
}


// Intelligence / Resonance
export async function getSemanticallySimilarNodes(nodeId: string): Promise<CoreNode[]> {
    const result = await coreGet(`/v1/nodes/${nodeId}/similar?limit=3&threshold=0.6`, { isOptional: true });
    return normalizeList<CoreNode>(result, ['results', 'nodes', 'similar']);
}

// AI Actions
export interface AIAction {
    label: string;
    action_type: string; // 'summarize' | 'chat' | 'explain' | 'related' | 'open'
    payload: any;
    confidence: number;
}

export async function getNodeActions(nodeId: string): Promise<AIAction[]> {
    try {
        const response = await coreRequest('/ai/actions', {
            method: 'POST',
            body: { node_id: nodeId }
        });
        if (!response) return [];
        if (Array.isArray(response)) return response as AIAction[];
        return normalizeList<AIAction>(response.actions, ['actions', 'items']);
    } catch (e) {
        console.error("AI Actions fetch failed", e);
        return [];
    }
}

// ========== SEARCH ==========

export interface SearchResult {
    query: string;
    results: any[];
    total: number;
    search_type: string;
}

export async function searchGlobal(query: string, companyId?: string): Promise<SearchResult> {
    const q = encodeURIComponent(query);
    const c = companyId ? `&company_id=${encodeURIComponent(companyId)}` : '';
    const result = await corePost(`/v3/search/keyword?query=${q}${c}`, {}, { isOptional: true });
    if (result && typeof result === 'object') {
        return {
            query,
            results: normalizeList<any>(result, ['results', 'items', 'matches', 'data']),
            total: typeof (result as any).total === 'number'
                ? (result as any).total
                : normalizeList<any>(result, ['results', 'items', 'matches', 'data']).length,
            search_type: (result as any).search_type || 'keyword',
        };
    }
    return {
        query,
        results: [],
        total: 0,
        search_type: 'keyword',
    };
}

// ========== MEMORY / LEARNING BRAIN API ==========

function requireMemoryCompanyId(companyId?: string): string {
    if (!companyId) {
        throw new Error('Memory API requires company_id');
    }
    return companyId;
}

// POST /v3/memory/learn - Neues Insight lernen
export async function learnInsight(payload: {
    insight: string;
    category: string;
    auto_commit?: boolean;
    company_id: string;
}): Promise<{ status: string; message: string; committed?: boolean; risk?: string }> {
    // v3: envelope unwrap handled transparently in coreRequest()
    return corePost('/v3/memory/learn', payload);
}

// GET /v3/memory/search - Gedaechtnis durchsuchen
export async function searchMemory(query: string, limit: number = 10, companyId: string): Promise<any[]> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `&company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest().
    // Awaited explicitly so the || [] fallback applies to the resolved value, not the Promise.
    const result = await coreGet(`/v3/memory/search?q=${encodeURIComponent(query)}&limit=${limit}${companyQuery}`, { isOptional: true });
    return normalizeList<any>(result, ['results', 'items', 'memories', 'data']);
}

// GET /v3/memory/pending - Review Queue laden
export async function getMemoryPending(companyId: string): Promise<any[]> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest().
    // Awaited explicitly so the || [] fallback applies to the resolved value, not the Promise.
    const result = await coreGet(`/v3/memory/pending${companyQuery}`, { isOptional: true });
    return normalizeList<any>(result, ['pending', 'items', 'queue', 'data']);
}

// POST /v3/memory/approve/{id} - Review Item bestaetigen
export async function approveMemoryItem(id: string | number, companyId: string): Promise<{ success: boolean }> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return corePost(`/v3/memory/approve/${id}${companyQuery}`, {});
}

// POST /v3/memory/reject/{id} - Review Item ablehnen
export async function rejectMemoryItem(id: string | number, companyId: string): Promise<{ success: boolean }> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return corePost(`/v3/memory/reject/${id}${companyQuery}`, {});
}

// GET /v1/memory/metrics - Statistiken
export async function getMemoryMetrics(companyId: string): Promise<any> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return coreGet(`/v3/memory/metrics${companyQuery}`, { isOptional: true });
}

// GET /v3/memory/overview - Aggregated memory surface (MR19)
export interface MemoryOverviewMetrics {
    structured_facts: number;
    pending_reviews: number;
    episodic_total: number;
    episodic_memories?: Record<string, number>;
}

export interface MemoryOverview {
    metrics: MemoryOverviewMetrics;
}

export async function getMemoryOverview(companyId: string): Promise<MemoryOverview | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    const companyQuery = `?company_id=${encodeURIComponent(resolvedCompanyId)}`;
    // v3: envelope unwrap handled transparently in coreRequest()
    return coreGet(`/v3/memory/overview${companyQuery}`, { isOptional: true });
}

// GET /v3/memory/debug/scope - Diagnostics endpoint (dev mode or ?diagnostics=1)
export interface MemoryDebugScope {
    scope: { type: string; tenant_id?: string; company_id?: string; user_id?: string };
    counts: {
        mem_episodic: number;
        mem_facts: number;
        mem_review_queue: number;
        memories: number;
    };
    sample_limit: number;
    hints: string[];
    errors: string[];
    samples?: any[];
    diagnostics?: {
        cached: boolean;
        query_time_ms: number;
    };
}

export async function getMemoryDebugScope(
    companyId: string,
    sampleLimit: number = 5
): Promise<MemoryDebugScope | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    return coreGet(
        `/v3/memory/debug/scope?company_id=${encodeURIComponent(resolvedCompanyId)}&sample_limit=${sampleLimit}`,
        { isOptional: true }
    );
}

// POST /v3/memory/debug/reconcile - Migrate legacy memories to v3 scope
export interface MemoryReconcileResult {
    applied: boolean;
    created: number;
    skipped: number;
    already_present: number;
    errors: string[];
    preview?: any[];
}

export async function reconcileMemory(
    companyId: string,
    apply: boolean = false
): Promise<MemoryReconcileResult | null> {
    const resolvedCompanyId = requireMemoryCompanyId(companyId);
    return corePost(
        `/v3/memory/debug/reconcile?apply=${apply}`,
        { company_id: resolvedCompanyId },
        { isOptional: true }
    );
}

// GET /v3/system/performance/caches — Cache telemetry (dev/diagnostics mode)
export interface CacheBucket {
    hits: number;
    misses: number;
    evictions?: number;
    invalidations?: number;
    entries: number;
    active_entries?: number;
}

export interface CachePerformance {
    learning_brain: {
        search: CacheBucket;
        metrics: CacheBucket;
    };
    folder_context: CacheBucket;
    entity_context?: CacheBucket;         // core 3161388
    default_company_scope?: CacheBucket;  // core 65fc157
    memory_debug_scope?: CacheBucket;     // core 41d8acb
    [key: string]: CacheBucket | { search: CacheBucket; metrics: CacheBucket } | undefined;
}

export async function getCachePerformance(): Promise<CachePerformance | null> {
    return coreGet('/v3/system/performance/caches', { isOptional: true });
}

// GET /v3/system/performance/critical-flows - Deploy/runtime guardrail summary
export interface CriticalFlowPerformance {
    window_seconds: number;
    generated_at: string;
    total_events: number;
    legacy_v1_critical_calls: {
        count: number;
        routes: Record<string, number>;
    };
    context_routes: {
        count: number;
        status_4xx: number;
        status_5xx: number;
        avg_ms: number;
        p95_ms: number;
    };
    v3_list_routes: {
        count: number;
        unbounded_count: number;
        unbounded_unscoped_count: number;
        unbounded_by_route: Record<string, number>;
    };
    gate: {
        pass: boolean;
        violations: string[];
    };
}

export async function getCriticalFlowPerformance(windowSeconds: number = 900): Promise<CriticalFlowPerformance | null> {
    const clamped = Math.max(60, Math.min(3600, Math.floor(windowSeconds)));
    return coreGet(`/v3/system/performance/critical-flows?window_seconds=${clamped}`, { isOptional: true });
}

export interface ApiVersionShare {
    count: number;
    share: number;
}

export interface ApiVersionPerformance {
    window_seconds: number;
    generated_at: string;
    total_events: number;
    versions: {
        v1: ApiVersionShare;
        v2: ApiVersionShare;
        v3: ApiVersionShare;
        other: ApiVersionShare;
    };
    legacy_routes_top: Array<{
        route: string;
        count: number;
    }>;
    critical_legacy_routes: {
        count: number;
        routes: Record<string, number>;
    };
    phaseout_gate: {
        pass: boolean;
        violations: string[];
    };
}

export async function getApiVersionPerformance(
    windowSeconds: number = 900,
    top: number = 10
): Promise<ApiVersionPerformance | null> {
    const clampedWindow = Math.max(60, Math.min(3600, Math.floor(windowSeconds)));
    const clampedTop = Math.max(1, Math.min(25, Math.floor(top)));
    return coreGet(
        `/v3/system/performance/api-versions?window_seconds=${clampedWindow}&top=${clampedTop}`,
        { isOptional: true }
    );
}
