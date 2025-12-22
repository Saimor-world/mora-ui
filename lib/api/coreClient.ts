import type { CoreCompany, CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from '@/lib/types/core';

type AccountRole = 'admin' | 'owner' | 'manager' | 'member' | 'demo';

const CORE_BASE_URL = "/api/core";
const AUTH_COOKIE = "saimor_auth";

export class CoreError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'CoreError';
    }
}

type CoreRequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    skipAuth?: boolean;
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

async function coreRequest(path: string, options: CoreRequestOptions = {}): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    let hasValidToken = false;

    if (!options.skipAuth) {
        const token = readCookie(AUTH_COOKIE);
        const devToken = typeof window !== 'undefined' ? localStorage.getItem('saimor_dev_token') : null;
        const fallbackToken = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT || process.env.NEXT_PUBLIC_API_TOKEN;
        const finalToken = token || devToken || fallbackToken;

        if (finalToken) {
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
        const url = `${CORE_BASE_URL}${path}`;
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
        // Critical: If token was invalid, clear it so next refresh doesn't retry bad token
        if (typeof window !== 'undefined') {
            localStorage.removeItem('saimor_dev_token');
            document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        }
        return null;
    }

    if (!response.ok) {
        let message = `Core API Error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            if (errorBody.detail) {
                message = typeof errorBody.detail === 'string'
                    ? errorBody.detail
                    : JSON.stringify(errorBody.detail);
            }
        } catch {
            // ignore parse errors
        }
        throw new CoreError(message, response.status);
    }

    if (response.status === 204) {
        return null;
    }
    try {
        return await response.json();
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
    return coreRequest(path, { method: 'PATCH', body }); // Using PATCH as backend typically expects PATCH for partial updates
}

export async function coreDelete(path: string): Promise<void> {
    await coreRequest(path, { method: 'DELETE' });
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
        // Fallback for environments that don't yet expose /auth/login (e.g. old core build)
        if (err instanceof CoreError && (err.status === 404 || err.status === 0)) {
            const dev = await corePost('/v1/auth/dev-token', {}, { skipAuth: true });
            return {
                user_id: dev.user_id || 'dev_user',
                email: payload.email,
                role: (payload.role as AccountRole) || 'demo',
                tenant_id: dev.tenant_id || dev.tenant || 'tenant-default',
                token: dev.token,
            };
        }
        throw err;
    }
}

export interface UserProfile {
    user_id: string;
    email?: string;
    role: AccountRole;
    tenant_id: string;
    demo_mode?: boolean;
}

export async function fetchUserProfile(): Promise<UserProfile> {
    return coreGet('/v1/auth/me');
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

// ========== COMPANY FUNCTIONS ==========

export async function fetchCompanies(includeDemo = false): Promise<CoreCompany[]> {
    try {
        const query = includeDemo ? '?include_demo=true' : '';
        return await coreGet(`/v1/companies${query}`);
    } catch (error: any) {
        // Silent fallback for auth errors - return empty array
        if (error instanceof CoreError && (error.status === 401 || error.status === 403)) {
            return [];
        }
        throw error;
    }
}

export async function getCompany(id: string): Promise<CoreCompany> {
    return coreGet(`/v1/companies/${id}`);
}

export interface CreateCompanyPayload {
    name: string;
    description?: string;
    slug?: string;
    is_owner_company?: boolean; // Creates with demo departments/spaces/folders/nodes
}

export async function createCompany(payload: CreateCompanyPayload): Promise<CoreCompany> {
    return corePost('/v1/companies', payload);
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
        return await coreGet('/v1/companies/health');
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
    return coreGet(`/v1/departments${query}`);
}

export async function fetchSpaces(departmentId?: string): Promise<CoreSpace[]> {
    const query = departmentId ? `?department_id=${departmentId}` : '';
    return coreGet(`/v1/spaces${query}`);
}

export async function fetchFolders(spaceId: string): Promise<CoreFolder[]> {
    return coreGet(`/v1/folders?space_id=${spaceId}`);
}

export async function fetchNodes(folderId: string, options?: { search?: string, type?: string }): Promise<CoreNode[]> {
    let query = `?folder_id=${folderId}`;
    if (options?.search) query += `&search=${encodeURIComponent(options.search)}`;
    if (options?.type && options.type !== 'all') query += `&type=${encodeURIComponent(options.type)}`;
    return coreGet(`/v1/nodes${query}`);
}

export async function fetchNodesByCompany(companyId: string): Promise<CoreNode[]> {
    return coreGet(`/v1/nodes?company_id=${companyId}`);
}

export async function fetchNodeDetails(nodeId: string): Promise<CoreNode> {
    return coreGet(`/v1/nodes/${nodeId}`);
}

export async function fetchNodeRelations(nodeId: string): Promise<any[]> {
    return coreGet(`/v1/nodes/${nodeId}/relations`);
}

export type TreeApiResponse = {
    departments?: any[];
};

// Map backend tree response (departments + spaces + folders + nodes) into the UI-friendly CoreTreeNode shape
export function mapTreeResponseToNodes(response: TreeApiResponse): CoreTreeNode[] {
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

    return (response.departments || []).map(mapDepartment);
}

export async function fetchTree(tenantId?: string): Promise<CoreTreeNode[]> {
    const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    const response = await coreGet(`/v1/tree${query}`) as TreeApiResponse;
    return mapTreeResponseToNodes(response);
}

export async function fetchTreeData(tenantId?: string): Promise<TreeApiResponse> {
    const query = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
    return coreGet(`/v1/tree${query}`);
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
    return corePost('/v1/spaces', payload);
}

export interface CreateFolderPayload {
    space_id: string;
    name: string;
    color?: string;
    description?: string;
}

export async function createFolder(payload: CreateFolderPayload): Promise<CoreFolder> {
    return corePost('/v1/folders', payload);
}

export interface CreateNodePayload {
    folder_id: string;
    title: string;
    type: 'document' | 'task' | 'note' | 'link' | 'other';
    content?: string;
    url?: string;
}

export async function createNode(payload: CreateNodePayload): Promise<CoreNode> {
    return corePost('/v1/nodes', payload);
}

export interface UpdateNodePayload {
    title?: string;
    type?: 'document' | 'task' | 'note' | 'link' | 'other';
    content?: string;
    url?: string;
}

export async function updateNode(id: string, payload: UpdateNodePayload): Promise<CoreNode> {
    return corePatch(`/v1/nodes/${id}`, payload);
}

export async function deleteNode(id: string): Promise<void> {
    return coreDelete(`/v1/nodes/${id}`);
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
    return corePost('/v1/departments', { ...payload, slug });
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
    return corePatch(`/v1/departments/${id}`, payload);
}

export async function deleteDepartment(id: string): Promise<void> {
    return coreDelete(`/v1/departments/${id}`);
}

export interface UpdateSpacePayload {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
}

export async function updateSpace(id: string, payload: UpdateSpacePayload): Promise<CoreSpace> {
    return corePatch(`/v1/spaces/${id}`, payload);
}

export async function deleteSpace(id: string): Promise<void> {
    return coreDelete(`/v1/spaces/${id}`);
}

export interface UpdateFolderPayload {
    name?: string;
    description?: string;
    color?: string;
}

export async function updateFolder(id: string, payload: UpdateFolderPayload): Promise<CoreFolder> {
    return corePatch(`/v1/folders/${id}`, payload);
}

export async function deleteFolder(id: string): Promise<void> {
    return coreDelete(`/v1/folders/${id}`);
}

// ========== UPLOAD FUNCTION ==========

export async function uploadFile(file: File, folderId: string, title?: string): Promise<CoreNode> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', folderId);
    if (title) formData.append('title', title);

    const token = readCookie(AUTH_COOKIE) ||
        (typeof window !== 'undefined' ? localStorage.getItem('saimor_dev_token') : null) ||
        process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT ||
        process.env.NEXT_PUBLIC_API_TOKEN;

    if (!token) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${CORE_BASE_URL}/upload`, {
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
