import { getDevToken } from './devToken';

const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8000';

export interface Department {
    id: string;
    tenant_id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    order: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface Space {
    id: string;
    department_id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    order: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface TreeItem {
    id: string;
    name: string;
    kind: 'department' | 'space' | 'folder' | 'file';
    children?: TreeItem[];
}

export interface TreeResponse {
    root: TreeItem[];
}

async function fetchCore<T>(endpoint: string, token?: string): Promise<T> {
    // Auto-fetch dev token if not provided
    const authToken = token || await getDevToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const res = await fetch(`${CORE_API_URL}${endpoint}`, {
            headers,
            cache: 'no-store', // Ensure fresh data
        });

        if (!res.ok) {
            console.error(`Core API Error ${res.status}: ${res.statusText}`);
            throw new Error(`Core API Error: ${res.statusText}`);
        }

        return await res.json();
    } catch (error) {
        console.error('Fetch Core Error:', error);
        throw error;
    }
}

export async function getDepartments(token?: string): Promise<Department[]> {
    try {
        return await fetchCore<Department[]>('/v1/departments', token);
    } catch (e) {
        console.warn('Failed to fetch departments, returning empty list', e);
        return [];
    }
}

export async function getSpaces(params: { departmentId?: string } = {}, token?: string): Promise<Space[]> {
    const query = params.departmentId ? `?department_id=${params.departmentId}` : '';
    try {
        return await fetchCore<Space[]>(`/v1/spaces${query}`, token);
    } catch (e) {
        console.warn('Failed to fetch spaces, returning empty list', e);
        return [];
    }
}

export async function getTree(token?: string): Promise<TreeResponse> {
    try {
        return await fetchCore<TreeResponse>('/v1/tree', token);
    } catch (e) {
        console.warn('Failed to fetch tree, returning empty root', e);
        return { root: [] };
    }
}
