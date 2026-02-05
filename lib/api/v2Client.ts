/**
 * SAIMOR API v2 Client
 * ====================
 * Session-based authentication - no JWT handling needed!
 *
 * The session cookie is automatically handled by the browser.
 * No more token management, expiry checks, or silent fails.
 */

const V2_BASE_URL = "/api/v2";

export class V2Error extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "V2Error";
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: any;
    headers?: Record<string, string>;
}

/**
 * Core request function - no token handling needed!
 * Session cookie is automatically sent by browser.
 */
async function v2Request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    const url = `${V2_BASE_URL}${path}`;

    try {
        const response = await fetch(url, {
            method: options.method ?? "GET",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: "include", // Important: sends cookies
        });

        // Handle errors with clear messages
        if (!response.ok) {
            let message = `API Error: ${response.status}`;
            let code = "api_error";

            try {
                const errorBody = await response.json();
                if (errorBody.detail) {
                    message = typeof errorBody.detail === "string"
                        ? errorBody.detail
                        : errorBody.detail.message || JSON.stringify(errorBody.detail);
                    code = errorBody.detail.error || code;
                }
            } catch {
                // ignore parse errors
            }

            throw new V2Error(message, response.status, code);
        }

        if (response.status === 204) {
            return null as T;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof V2Error) {
            throw error;
        }
        // Network error
        throw new V2Error("Network error - check your connection", 0, "network_error");
    }
}

// =============================================================================
// AUTH
// =============================================================================

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    user_id: string;
    email: string;
    role: string;
    tenant_id: string;
    scope: string;
    message: string;
}

export interface UserMe {
    user_id: string;
    email: string;
    role: string;
    tenant_id: string;
    scope: string;
    is_system_owner: boolean;
    is_demo: boolean;
    auth_type: string;
}

/**
 * Login with email/password
 * Creates session cookie automatically
 */
export async function v2Login(email: string, password: string): Promise<LoginResponse> {
    return v2Request<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
    });
}

/**
 * Logout - clears session
 */
export async function v2Logout(): Promise<void> {
    await v2Request("/auth/logout", { method: "POST" });
}

/**
 * Get current user from session
 */
export async function v2GetMe(): Promise<UserMe> {
    return v2Request<UserMe>("/auth/me");
}

/**
 * Quick auth validation
 */
export async function v2ValidateAuth(): Promise<{
    valid: boolean;
    tenant_id: string;
    role: string;
    auth_type: string;
}> {
    try {
        return await v2Request("/auth/validate");
    } catch {
        return { valid: false, tenant_id: "", role: "", auth_type: "" };
    }
}

// =============================================================================
// DATA
// =============================================================================

export interface Company {
    id: string;
    name: string;
    slug: string;
    tenant_id: string;
    is_demo: boolean;
}

export interface Department {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    order: number;
    company_id: string;
    tenant_id: string;
}

export interface Space {
    id: string;
    name: string;
    description?: string;
    department_id: string;
}

export interface Stats {
    departments: number;
    spaces: number;
    nodes: number;
    tenant_id: string;
    company_id?: string;
}

/**
 * Get companies accessible to current user
 */
export async function v2GetCompanies(includeDemo = false): Promise<Company[]> {
    return v2Request<Company[]>(`/companies?include_demo=${includeDemo}`);
}

/**
 * Get departments (automatically scoped to user's tenant)
 */
export async function v2GetDepartments(companyId?: string): Promise<Department[]> {
    const query = companyId ? `?company_id=${companyId}` : "";
    return v2Request<Department[]>(`/departments${query}`);
}

/**
 * Get spaces for a department
 */
export async function v2GetSpaces(departmentId: string): Promise<Space[]> {
    return v2Request<Space[]>(`/spaces?department_id=${departmentId}`);
}

/**
 * Get full tree structure
 */
export async function v2GetTree(companyId?: string): Promise<any[]> {
    const query = companyId ? `?company_id=${companyId}` : "";
    return v2Request<any[]>(`/tree${query}`);
}

/**
 * Get quick stats
 */
export async function v2GetStats(companyId?: string): Promise<Stats> {
    const query = companyId ? `?company_id=${companyId}` : "";
    return v2Request<Stats>(`/stats${query}`);
}

// =============================================================================
// API KEYS (System Owners only)
// =============================================================================

export interface CreateApiKeyRequest {
    name: string;
    tenant_id?: string;
    scope?: string;
    expires_days?: number;
}

export interface CreateApiKeyResponse {
    key: string;
    name: string;
    tenant_id: string;
    scope: string;
    message: string;
}

/**
 * Create API key (system owners only)
 */
export async function v2CreateApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return v2Request<CreateApiKeyResponse>("/auth/api-keys", {
        method: "POST",
        body: request,
    });
}
