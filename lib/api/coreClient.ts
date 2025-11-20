const CORE_BASE_URL = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL ?? "http://localhost:8081";
const CORE_JWT = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT;

// Debug: Log JWT status on load
console.log("🔑 CORE_JWT loaded:", !!CORE_JWT, CORE_JWT ? "(present)" : "(missing)");

export class CoreError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'CoreError';
    }
}

async function coreGet(path: string): Promise<any> {
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

import type { CoreDepartment, CoreSpace } from "@/lib/types/core";

export async function fetchDepartments(): Promise<CoreDepartment[]> {
    return coreGet('/v1/departments');
}

export async function fetchSpaces(departmentId?: string): Promise<CoreSpace[]> {
    const query = departmentId ? `?department_id=${departmentId}` : '';
    return coreGet(`/v1/spaces${query}`);
}
