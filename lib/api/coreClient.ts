import jwt from 'jsonwebtoken';
import type { CoreDepartment, CoreSpace, CoreFolder, CoreNode, CoreTreeNode } from '@/lib/types/core';


const CORE_BASE_URL = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ?? "http://localhost:8081";
let CORE_JWT = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT;

// --- JWT Helper Functions ---

function generateFallbackToken(): string {
    console.warn("⚠️ Generating fallback UI-System Token (Development Mode)");
    // Create a dummy token. Note: This requires the backend to accept this secret or be in a mock mode.
    const payload = {
        sub: "ui-system-fallback",
        role: "system", // Updated to match backend 'system' role support
        tenant: "saimor",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    };
    return jwt.sign(payload, 'dev-secret');
}

function validateToken(token: string | undefined): boolean {
    if (!token) return false;
    try {
        const decoded = jwt.decode(token);
        if (!decoded || typeof decoded === 'string') return false;

        // Check expiration
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            console.warn("⚠️ Core JWT is expired");
            return false;
        }
        return true;
    } catch (e) {
        console.error("⚠️ Invalid Core JWT format", e);
        return false;
    }
}

// --- Initialization Logic ---

if (!CORE_JWT || !validateToken(CORE_JWT)) {
    if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Attempting to generate fallback token...");
        try {
            CORE_JWT = generateFallbackToken();
        } catch (e) {
            console.error("Failed to generate fallback token:", e);
        }
    } else {
        console.error("❌ Missing or Invalid Core JWT in Production");
    }
}

console.log("🔑 CORE_JWT status:", !!CORE_JWT ? "Active" : "Missing");

export class CoreError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'CoreError';
    }
}

export async function coreGet(path: string): Promise<any> {
    // Re-validate before request (optional, but good for long sessions)
    if (!CORE_JWT) {
        console.error("Môra Core: missing NEXT_PUBLIC_SAIMOR_CORE_JWT");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            headers: {
                'Authorization': `Bearer ${CORE_JWT}`,
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
    if (!CORE_JWT) {
        console.error("Môra Core: missing NEXT_PUBLIC_SAIMOR_CORE_JWT");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CORE_JWT}`,
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
    if (!CORE_JWT) {
        console.error("Môra Core: missing NEXT_PUBLIC_SAIMOR_CORE_JWT");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CORE_JWT}`,
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
    if (!CORE_JWT) {
        console.error("Môra Core: missing NEXT_PUBLIC_SAIMOR_CORE_JWT");
        throw new CoreError("Configuration Error: Missing Core JWT", 0);
    }

    try {
        const res = await fetch(`${CORE_BASE_URL}${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${CORE_JWT}`
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
