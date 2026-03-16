import { coreGet, corePost, CoreError, getCoreBaseUrl } from './coreClient';

export interface FilePreview {
    previewAvailable: boolean;
    content?: string;
    contentType?: string;
    reason?: string;
}

export interface CompanyFileRecord {
    id: string;
    company_id: string;
    filename: string;
    mime?: string | null;
    size: number;
    sha256: string;
    uploader_user_id?: string | null;
    created_at: string;
}

const AUTH_COOKIE = "mora_auth_token";
const SESSION_COOKIE = "mora_session";

function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

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

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return readCookie(AUTH_COOKIE)
        || (isLocalhost() ? localStorage.getItem('saimor_dev_token') : null)
        || process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT
        || process.env.NEXT_PUBLIC_API_TOKEN
        || null;
}

function hasSessionCookie(): boolean {
    return !!readCookie(SESSION_COOKIE);
}

export const getFilePreview = async (nodeId: string): Promise<FilePreview> => {
    return coreGet(`/v3/files/${nodeId}/preview`) as Promise<FilePreview>;
};

export const getDownloadUrl = (nodeId: string): string => {
    return `${getCoreBaseUrl()}/v3/files/${nodeId}`;
};

export const getCompanyFileUrl = (fileId: string): string => {
    return `${getCoreBaseUrl()}/v3/files/${fileId}`;
};

/** URL for files uploaded with visibility='public'. No auth required. */
export const getPublicFileUrl = (fileId: string): string => {
    return `${getCoreBaseUrl()}/v3/files/public/${fileId}`;
};

export const listCompanyFiles = async (companyId: string): Promise<CompanyFileRecord[]> => {
    const response = await coreGet(`/v3/files?company_id=${encodeURIComponent(companyId)}`, { isOptional: true });
    return Array.isArray(response) ? response : [];
};

export const uploadCompanyFile = async (
    file: File,
    companyId: string,
    visibility: 'public' | 'private' = 'private'
): Promise<CompanyFileRecord> => {
    const token = getAuthToken();
    const hasSession = hasSessionCookie();
    if (!token && !hasSession) throw new CoreError('Unauthorized', 401);

    // Guard against empty files before hitting the network — backend returns 400 for these.
    if (file.size === 0) {
        throw new CoreError('Empty files are not allowed', 400);
    }

    const formData = new FormData();
    // V10.6: Ensure field names match backend EXACTLY (file, company_id)
    formData.append('file', file);
    formData.append('company_id', companyId);
    formData.append('visibility', visibility);

    // CRITICAL: We do NOT set Content-Type header. 
    // Browser must set it with the correct boundary for multipart/form-data.
    const response = await fetch(`${getCoreBaseUrl()}/v3/files/upload`, {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'Accept': 'application/json'
        },
        body: formData,
        credentials: 'include'
    });

    if (!response.ok) {
        let message = `Upload Failed: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            console.error('[Upload Error Body]', errorBody);
            if (errorBody.detail) {
                if (Array.isArray(errorBody.detail)) {
                    message = errorBody.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
                } else {
                    message = typeof errorBody.detail === 'string' ? errorBody.detail : JSON.stringify(errorBody.detail);
                }
            }
        } catch (e) {
            console.error('[Upload Parse Error]', e);
        }
        throw new CoreError(message, response.status);
    }

    const json = await response.json();
    if (
        json &&
        typeof json === 'object' &&
        !Array.isArray(json) &&
        'data' in json &&
        'meta' in json &&
        json.meta?.api_version === 'v3'
    ) {
        return json.data as CompanyFileRecord;
    }
    return json as CompanyFileRecord;
};

export const downloadCompanyFile = async (fileId: string, filename: string): Promise<void> => {
    const token = getAuthToken();
    const hasSession = hasSessionCookie();
    if (!token && !hasSession) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${getCoreBaseUrl()}/v3/files/${fileId}`, {
        method: 'GET',
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : undefined,
        credentials: 'include'
    });

    if (!response.ok) {
        let message = `Download Failed: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            if (errorBody.detail) message = errorBody.detail;
        } catch { }
        throw new CoreError(message, response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const requestCreateNodeFromFile = async (
    fileId: string,
    options?: { autoExecute?: boolean; folderId?: string; batchId?: string }
): Promise<any> => {
    return corePost(`/v3/files/${fileId}/create-node`, {
        auto_execute: options?.autoExecute ?? true,
        folder_id: options?.folderId,
        batch_id: options?.batchId,
    });
};

export const confirmCreateNodeFromFile = async (
    fileId: string,
    confirmationToken: string,
    options?: { folderId?: string }
): Promise<any> => {
    return corePost(`/v3/files/${fileId}/confirm-node`, {
        confirmation_token: confirmationToken,
        folder_id: options?.folderId,
    });
};

export const rejectCreateNodeFromFile = async (fileId: string, confirmationToken: string): Promise<any> => {
    return corePost(`/v3/files/${fileId}/reject-node`, { confirmation_token: confirmationToken });
};

export interface FileNodeStatus {
    status: 'linked' | 'not_linked';
    node_id?: string;
    folder_id?: string;
    company_id?: string;
}

/** Query where a file's node ended up — use as fallback if create-node response lacks folder_id */
export const getFileNode = async (fileId: string): Promise<FileNodeStatus> => {
    return coreGet(`/v3/files/${fileId}/node`) as Promise<FileNodeStatus>;
};
