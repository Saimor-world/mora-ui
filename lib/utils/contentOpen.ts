import type { PaneConfig } from '@/lib/store/paneStore';
import { downloadCompanyFile } from '@/lib/api/filesClient';

type OpenPaneFn = (pane: Omit<PaneConfig, 'position' | 'zIndex' | 'minimized'>) => void;

export interface OpenableNodeLike {
    id: string;
    type?: string | null;
    name?: string | null;
    title?: string | null;
    content?: string | null;
    url?: string | null;
    folder_id?: string | null;
    company_id?: string | null;
    metadata?: Record<string, any> | null;
}

interface OpenNodeOptions {
    paneId?: string;
    title?: string;
    folderId?: string;
    companyId?: string;
    navigationContext?: unknown;
}

export function getContentDisplayName(item: Pick<OpenableNodeLike, 'name' | 'title' | 'id'>): string {
    return item.name || item.title || `Eintrag ${item.id.slice(0, 8)}`;
}

export function getContentTypeLabel(type?: string | null): string {
    switch ((type || '').toLowerCase()) {
        case 'document':
            return 'Dokument';
        case 'note':
            return 'Notiz';
        case 'task':
            return 'Aufgabe';
        case 'link':
            return 'Link';
        case 'image':
            return 'Bild';
        case 'intel_report':
            return 'Bericht';
        default:
            return 'Inhalt';
    }
}

export function getNodeSourceFileId(item: Pick<OpenableNodeLike, 'metadata'>): string | null {
    const metadata = item.metadata;
    if (!metadata || typeof metadata !== 'object') return null;
    const fileId = metadata.file_id;
    return typeof fileId === 'string' && fileId.trim() ? fileId : null;
}

export function getNodeSourceFileName(item: Pick<OpenableNodeLike, 'metadata' | 'name' | 'title' | 'id'>): string {
    const metadata = item.metadata;
    const originalFilename = metadata && typeof metadata === 'object'
        ? metadata.original_filename
        : null;
    if (typeof originalFilename === 'string' && originalFilename.trim()) {
        return originalFilename;
    }
    return getContentDisplayName(item);
}

export function isExternalLinkNode(item: Pick<OpenableNodeLike, 'type' | 'url'>): boolean {
    return (item.type || '').toLowerCase() === 'link' && typeof item.url === 'string' && item.url.trim().length > 0;
}

export function openDocumentNode(
    item: OpenableNodeLike,
    openPane: OpenPaneFn,
    options?: OpenNodeOptions,
): void {
    const displayName = options?.title || getContentDisplayName(item);
    openPane({
        id: options?.paneId || `doc-${item.id}`,
        type: 'document',
        title: displayName,
        size: { width: 800, height: 600 },
        data: {
            nodeId: item.id,
            content: item.content,
            name: item.name || item.title || displayName,
            type: item.type,
            metadata: item.metadata,
            folderId: options?.folderId ?? item.folder_id ?? undefined,
            companyId: options?.companyId ?? item.company_id ?? undefined,
            ...(options?.navigationContext ? { navigationContext: options.navigationContext } : {}),
        },
    });
}

export function openNodeLike(
    item: OpenableNodeLike,
    openPane: OpenPaneFn,
    options?: OpenNodeOptions,
): { mode: 'document' | 'external-link' } {
    if (isExternalLinkNode(item)) {
        window.open(item.url!, '_blank', 'noopener,noreferrer');
        return { mode: 'external-link' };
    }

    openDocumentNode(item, openPane, options);
    return { mode: 'document' };
}

export async function openSourceFileForNode(item: Pick<OpenableNodeLike, 'metadata' | 'name' | 'title' | 'id'>): Promise<boolean> {
    const fileId = getNodeSourceFileId(item);
    if (!fileId) return false;
    await downloadCompanyFile(fileId, getNodeSourceFileName(item));
    return true;
}
