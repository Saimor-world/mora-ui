import { coreGet, corePost, CoreError } from './coreClient';

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

const CORE_BASE_URL = "/api/core";
const AUTH_COOKIE = "mora_auth_token";

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
        || localStorage.getItem('saimor_dev_token')
        || process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT
        || process.env.NEXT_PUBLIC_API_TOKEN
        || null;
}

export const getFilePreview = async (nodeId: string): Promise<FilePreview> => {
    return coreGet(`/v1/files/${nodeId}/preview`) as Promise<FilePreview>;
};

export const getDownloadUrl = (nodeId: string): string => {
    const NEXT_PUBLIC_SAIMOR_CORE_URL = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8000';
    return `${NEXT_PUBLIC_SAIMOR_CORE_URL}/v1/files/${nodeId}/download`;
};

export const listCompanyFiles = async (companyId: string): Promise<CompanyFileRecord[]> => {
    const response = await coreGet(`/v1/files?company_id=${encodeURIComponent(companyId)}`, { isOptional: true });
    return Array.isArray(response) ? response : [];
};

export const uploadCompanyFile = async (file: File, companyId: string): Promise<CompanyFileRecord> => {
    const token = getAuthToken();
    if (!token) throw new CoreError('Unauthorized', 401);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);

    const response = await fetch(`${CORE_BASE_URL}/v1/files/upload`, {
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
};

export const downloadCompanyFile = async (fileId: string, filename: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) throw new CoreError('Unauthorized', 401);

    const response = await fetch(`${CORE_BASE_URL}/v1/files/${fileId}`, {
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

export const requestCreateNodeFromFile = async (fileId: string): Promise<any> => {
    return corePost(`/v1/files/${fileId}/create-node`, {});
};

export const confirmCreateNodeFromFile = async (fileId: string, confirmationToken: string): Promise<any> => {
    return corePost(`/v1/files/${fileId}/confirm-node`, { confirmation_token: confirmationToken });
};

export const rejectCreateNodeFromFile = async (fileId: string, confirmationToken: string): Promise<any> => {
    return corePost(`/v1/files/${fileId}/reject-node`, { confirmation_token: confirmationToken });
};
