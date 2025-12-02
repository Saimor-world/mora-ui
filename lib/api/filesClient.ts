import { coreGet } from './coreClient';

export interface FilePreview {
    previewAvailable: boolean;
    content?: string;
    contentType?: string;
    reason?: string;
}

export const getFilePreview = async (nodeId: string): Promise<FilePreview> => {
    return coreGet(`/v1/files/${nodeId}/preview`) as Promise<FilePreview>;
};

export const getDownloadUrl = (nodeId: string): string => {
    const NEXT_PUBLIC_SAIMOR_CORE_URL = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8081';
    return `${NEXT_PUBLIC_SAIMOR_CORE_URL}/v1/files/${nodeId}/download`;
};
