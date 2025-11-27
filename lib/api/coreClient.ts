import { getDevToken } from './devToken';
import type { CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from '@/lib/types/core';


const CORE_BASE_URL = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ?? "http://localhost:8081";

// Token is now managed by devToken service
// No need for environment variable or fallback generation

console.log("🔑 Core Client initialized - using dev token service");

export class CoreError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'CoreError';
    }
}

export async function coreGet(path: string): Promise<any> {
    const token = await getDevToken();
    if (!token) {
        console.error("Môra Core: Failed to get dev token");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            let message = `Core API Error: ${res.status} ${res.statusText}`;
            try {
                const errorBody = await res.json();
                if (errorBody.detail) {
                    message = errorBody.detail;
                }
            } catch (e) {
                // ignore json parse error
            }
            throw new CoreError(message, res.status);
        }

        return await res.json();
    } catch (error: any) {
        if (error instanceof CoreError) {
            throw error;
        }
        throw new CoreError(error.message || "Unknown Network Error", 0);
    }
}

export async function corePost(path: string, body: any): Promise<any> {
    const token = await getDevToken();
    if (!token) {
        console.error("Môra Core: Failed to get dev token");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            let message = `Core API Error: ${res.status} ${res.statusText}`;
            try {
                const errorBody = await res.json();
                if (errorBody.detail) {
                    message = typeof errorBody.detail === 'string'
                        ? errorBody.detail
                        : JSON.stringify(errorBody.detail);
                }
            } catch (e) {
                // ignore json parse error
            }
            throw new CoreError(message, res.status);
        }

        return await res.json();
    } catch (error: any) {
        if (error instanceof CoreError) {
            throw error;
        }
        throw new CoreError(error.message || "Unknown Network Error", 0);
    }
}

export async function corePatch(path: string, body: any): Promise<any> {
    const token = await getDevToken();
    if (!token) {
        console.error("Môra Core: Failed to get dev token");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            let message = `Core API Error: ${res.status} ${res.statusText}`;
            try {
                const errorBody = await res.json();
                if (errorBody.detail) {
                    message = typeof errorBody.detail === 'string'
                        ? errorBody.detail
                        : JSON.stringify(errorBody.detail);
                }
            } catch (e) {
                // ignore json parse error
            }
            throw new CoreError(message, res.status);
        }

        return await res.json();
    } catch (error: any) {
        if (error instanceof CoreError) {
            throw error;
        }
        throw new CoreError(error.message || "Unknown Network Error", 0);
    }
}

export async function coreDelete(path: string): Promise<void> {
    const token = await getDevToken();
    if (!token) {
        console.error("Môra Core: Failed to get dev token");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            let message = `Core API Error: ${res.status} ${res.statusText}`;
            try {
                const errorBody = await res.json();
                if (errorBody.detail) {
                    message = typeof errorBody.detail === 'string'
                        ? errorBody.detail
                        : JSON.stringify(errorBody.detail);
                }
            } catch (e) {
                // ignore json parse error
            }
            throw new CoreError(message, res.status);
        }
    } catch (error: any) {
        if (error instanceof CoreError) {
            throw error;
        }
        throw new CoreError(error.message || "Unknown Network Error", 0);
    }
}

// ========== FETCH FUNCTIONS ==========


export async function fetchDepartments(): Promise<CoreDepartment[]> {
    return coreGet('/v1/departments');
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

export async function fetchNodeDetails(nodeId: string): Promise<CoreNode> {
    return coreGet(`/v1/nodes/${nodeId}`);
}

export async function fetchNodeRelations(nodeId: string): Promise<any[]> {
    return coreGet(`/v1/nodes/${nodeId}/relations`);
}

export async function fetchTree(): Promise<CoreTreeNode[]> {
    const response = await coreGet(`/v1/tree`) as { departments: CoreTreeNode[] };
    return response.departments || [];
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
