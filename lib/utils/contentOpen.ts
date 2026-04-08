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

export interface OpenableSourceFileLike {
    id: string;
    name?: string | null;
    size?: number | null;
    mime_type?: string | null;
    linked_status?: 'document' | 'standalone' | string | null;
    linked_node_id?: string | null;
    linked_folder_id?: string | null;
    source_available?: boolean;
    source_status?: 'ready' | 'missing' | string | null;
}

interface OpenNodeOptions {
    paneId?: string;
    title?: string;
    folderId?: string;
    companyId?: string;
    navigationContext?: unknown;
}

interface OpenSourceFileOptions {
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
        case 'file':
            return 'Datei';
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

export function hasLinkedSourceFile(item: Pick<OpenableNodeLike, 'metadata'>): boolean {
    return Boolean(getNodeSourceFileId(item));
}

export function isExternalLinkNode(item: Pick<OpenableNodeLike, 'type' | 'url'>): boolean {
    return (item.type || '').toLowerCase() === 'link' && typeof item.url === 'string' && item.url.trim().length > 0;
}

export function getContentSecondaryLabel(item: Pick<OpenableNodeLike, 'type' | 'url' | 'metadata'>): string | null {
    if (isExternalLinkNode(item)) {
        return 'Im Browser';
    }
    if (hasLinkedSourceFile(item)) {
        return 'Quelle vorhanden';
    }
    return null;
}

export function getNodeOpenActionLabel(item: Pick<OpenableNodeLike, 'type' | 'url'>): string {
    if ((item.type || '').toLowerCase() === 'file') {
        return 'Datei oeffnen';
    }
    if (isExternalLinkNode(item)) {
        return 'Im Browser oeffnen';
    }
    return 'Dokument oeffnen';
}

export function getSourceFileDisplayName(item: Pick<OpenableSourceFileLike, 'name' | 'id'>): string {
    return item.name || `Datei ${item.id.slice(0, 8)}`;
}

export function hasLinkedDocument(item: Pick<OpenableSourceFileLike, 'linked_node_id'>): boolean {
    return typeof item.linked_node_id === 'string' && item.linked_node_id.trim().length > 0;
}

export function getSourceFileSecondaryLabel(item: Pick<OpenableSourceFileLike, 'linked_status' | 'linked_node_id' | 'source_available' | 'source_status'>): string {
    if (!isSourceFileAvailable(item)) {
        return 'Nicht verfuegbar';
    }
    if (hasLinkedDocument(item)) {
        return 'Dokument vorhanden';
    }
    if ((item.linked_status || '').toLowerCase() === 'document') {
        return 'Dokument vorhanden';
    }
    return 'Datei';
}

export function isSourceFileAvailable(item: Pick<OpenableSourceFileLike, 'source_available' | 'source_status'>): boolean {
    if (item.source_available === false) return false;
    if ((item.source_status || '').toLowerCase() === 'missing') return false;
    return true;
}

export function getSourceFileOpenActionLabel(item: Pick<OpenableSourceFileLike, 'linked_node_id'>): string {
    return hasLinkedDocument(item) ? 'Dokument oeffnen' : 'Datei oeffnen';
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

export async function openSourceFileLike(
    item: OpenableSourceFileLike,
    openPane: OpenPaneFn,
    options?: OpenSourceFileOptions,
): Promise<{ mode: 'document' | 'download' }> {
    if (hasLinkedDocument(item)) {
        openPane({
            id: options?.paneId || `doc-${item.linked_node_id}`,
            type: 'document',
            title: options?.title || getSourceFileDisplayName(item),
            size: { width: 960, height: 720 },
            data: {
                nodeId: item.linked_node_id,
                name: options?.title || getSourceFileDisplayName(item),
                folderId: options?.folderId ?? item.linked_folder_id ?? undefined,
                companyId: options?.companyId,
                ...(options?.navigationContext ? { navigationContext: options.navigationContext } : {}),
            },
        });
        return { mode: 'document' };
    }

    if (!isSourceFileAvailable(item)) {
        throw new Error('Datei ist in dieser Instanz derzeit nicht verfuegbar.');
    }

    await downloadCompanyFile(item.id, getSourceFileDisplayName(item));
    return { mode: 'download' };
}
