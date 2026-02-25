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

export const getFilePreview = async (nodeId: string): Promise<FilePreview> => {
    return coreGet(`/v1/files/${nodeId}/preview`) as Promise<FilePreview>;
};

export const getDownloadUrl = (nodeId: string): string => {
    return `${getCoreBaseUrl()}/v1/files/${nodeId}/download`;
};

export const getCompanyFileUrl = (fileId: string): string => {
    return `${getCoreBaseUrl()}/v1/files/${fileId}`;
};

/** URL for files uploaded with visibility='public'. No auth required. */
export const getPublicFileUrl = (fileId: string): string => {
    return `${getCoreBaseUrl()}/v1/files/public/${fileId}`;
};

export const listCompanyFiles = async (companyId: string): Promise<CompanyFileRecord[]> => {
    const response = await coreGet(`/v1/files?company_id=${encodeURIComponent(companyId)}`, { isOptional: true });
    return Array.isArray(response) ? response : [];
};

export const uploadCompanyFile = async (
    file: File,
    companyId: string,
    visibility: 'public' | 'private' = 'private'
): Promise<CompanyFileRecord> => {
    const token = getAuthToken();
    if (!token) throw new CoreError('Unauthorized', 401);

    const formData = new FormData();
    // V10.6: Ensure field names match backend EXACTLY (file, company_id)
    formData.append('file', file);
    formData.append('company_id', companyId);
    formData.append('visibility', visibility);

    // CRITICAL: We do NOT set Content-Type header. 
    // Browser must set it with the correct boundary for multipart/form-data.
    const response = await fetch(`${getCoreBaseUrl()}/v1/files/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        },
        body: formData
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

    return response.json();
};

export const downloadCompanyFile = async (fileId: string, filename: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${getCoreBaseUrl()}/v1/files/${fileId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
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
    options?: { autoExecute?: boolean; folderId?: string }
): Promise<any> => {
    return corePost(`/v1/files/${fileId}/create-node`, {
        auto_execute: options?.autoExecute ?? true,
        folder_id: options?.folderId
    });
};

export const confirmCreateNodeFromFile = async (fileId: string, confirmationToken: string): Promise<any> => {
    return corePost(`/v1/files/${fileId}/confirm-node`, { confirmation_token: confirmationToken });
};

export const rejectCreateNodeFromFile = async (fileId: string, confirmationToken: string): Promise<any> => {
    return corePost(`/v1/files/${fileId}/reject-node`, { confirmation_token: confirmationToken });
};
