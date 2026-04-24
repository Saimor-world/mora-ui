'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight, Cloud, ExternalLink, FileText, Folder, Link, Loader2, Paperclip, PlugZap } from 'lucide-react';
import { fetchMyContent, shareFile, shareNode, fetchCloudConnectorItems, type CloudFileItem, type UserContentResponse } from '@/lib/api/contentClient';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { toast } from 'sonner';
import {
    getContentDisplayName,
    getNodeOpenActionLabel,
    getNodeSourceFileId,
    getSourceFileDisplayName,
    getSourceFileOpenActionLabel,
    getSourceFileSecondaryLabel,
    isSourceFileAvailable,
    openNodeLike,
    openSourceFileForNode,
    openSourceFileLike,
} from '@/lib/utils/contentOpen';
import type { AppProps } from '@/lib/apps/types';

type ShareState =
    | { status: 'idle' }
    | { status: 'sharing' }
    | { status: 'done'; url: string }
    | { status: 'unavailable' };

type VisibleItem = NonNullable<UserContentResponse['items']>[number];

function normalizePrivateAreaLabel(value?: string | null): string {
    const next = (value || '').trim();
    if (!next) return 'Privater Bereich';
    const normalized = next.toLowerCase();
    if (['my space', 'personal space', 'private space'].includes(normalized)) {
        return 'Privater Bereich';
    }
    return next;
}

function normalizeCloudPath(path?: string | null): string {
    const normalized = (path || '').trim().replaceAll('\\', '/');
    if (!normalized || normalized === '/') return '';
    return normalized.replace(/^\/+|\/+$/g, '');
}

function joinCloudPath(parentPath: string, childName: string): string {
    const parent = normalizeCloudPath(parentPath);
    const child = normalizeCloudPath(childName);
    if (!child) return parent;
    return parent ? `${parent}/${child}` : child;
}

function parentCloudPath(path: string): string {
    const normalized = normalizeCloudPath(path);
    if (!normalized || !normalized.includes('/')) return '';
    return normalized.slice(0, normalized.lastIndexOf('/'));
}

export default function MeineDateienApp({ paneId }: AppProps) {
    const [content, setContent] = useState<UserContentResponse | 'error' | null>(null);
    const [loading, setLoading] = useState(true);
    const [shareStates, setShareStates] = useState<Record<string, ShareState>>({});
    const [cloudItems, setCloudItems] = useState<Record<string, CloudFileItem[]>>({});
    const [cloudPaths, setCloudPaths] = useState<Record<string, string>>({});
    const [cloudErrors, setCloudErrors] = useState<Record<string, string>>({});
    const [cloudLoadingByConnector, setCloudLoadingByConnector] = useState<Record<string, boolean>>({});
    const { openPane, removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(state => state.activePaneId === paneId);

    useEffect(() => {
        let cancelled = false;

        void fetchMyContent()
            .then((result) => {
                if (cancelled) return;
                setContent(result === null || typeof result !== 'object' ? 'error' : result);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setContent('error');
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const loadCloudConnectorItems = useCallback(async (connectorId: string, path: string = '') => {
        const normalizedPath = normalizeCloudPath(path);
        setCloudLoadingByConnector((prev) => ({ ...prev, [connectorId]: true }));
        try {
            const payload = await fetchCloudConnectorItems(connectorId, 24, normalizedPath);
            if (!payload) throw new Error('Cloud connector unavailable');
            const resolvedPath = normalizeCloudPath(payload.current_path ?? normalizedPath);
            setCloudPaths((prev) => ({ ...prev, [connectorId]: resolvedPath }));
            setCloudItems((prev) => ({ ...prev, [connectorId]: Array.isArray(payload.items) ? payload.items : [] }));
            setCloudErrors((prev) => {
                if (!(connectorId in prev)) return prev;
                const next = { ...prev };
                delete next[connectorId];
                return next;
            });
        } catch {
            setCloudItems((prev) => ({ ...prev, [connectorId]: [] }));
            setCloudErrors((prev) => ({ ...prev, [connectorId]: 'Quelle gerade nicht erreichbar' }));
        } finally {
            setCloudLoadingByConnector((prev) => ({ ...prev, [connectorId]: false }));
        }
    }, []);

    useEffect(() => {
        if (!content || content === 'error') {
            setCloudItems({});
            setCloudPaths({});
            setCloudErrors({});
            setCloudLoadingByConnector({});
            return;
        }
        const configuredConnectors = Array.isArray(content.cloud_storage?.connectors)
            ? content.cloud_storage.connectors.filter((connector) => connector.enabled && connector.status === 'configured')
            : [];
        const visibleConnectors = configuredConnectors.slice(0, 4);
        if (visibleConnectors.length === 0) {
            setCloudItems({});
            setCloudPaths({});
            setCloudErrors({});
            setCloudLoadingByConnector({});
            return;
        }

        const visibleIds = new Set(visibleConnectors.map((connector) => connector.id));
        const keepVisible = <T extends Record<string, unknown>>(prev: T): T => {
            const next: Record<string, unknown> = {};
            Object.entries(prev).forEach(([key, value]) => {
                if (visibleIds.has(key)) next[key] = value;
            });
            return next as T;
        };

        setCloudItems((prev) => keepVisible(prev));
        setCloudPaths((prev) => {
            const kept = keepVisible(prev);
            visibleConnectors.forEach((connector) => {
                if (!kept[connector.id]) kept[connector.id] = '';
            });
            return kept;
        });
        setCloudErrors((prev) => keepVisible(prev));
        setCloudLoadingByConnector((prev) => keepVisible(prev));

        visibleConnectors.forEach((connector) => {
            void loadCloudConnectorItems(connector.id, '');
        });
    }, [content, loadCloudConnectorItems]);

    const setShare = useCallback((id: string, state: ShareState) => {
        setShareStates((prev) => ({ ...prev, [id]: state }));
    }, []);

    const handleShareNode = useCallback(async (nodeId: string) => {
        setShare(nodeId, { status: 'sharing' });
        const result = await shareNode(nodeId);
        if (result?.public_url) {
            setShare(nodeId, { status: 'done', url: result.public_url });
            return;
        }
        setShare(nodeId, { status: 'unavailable' });
    }, [setShare]);

    const handleShareFile = useCallback(async (fileId: string) => {
        setShare(fileId, { status: 'sharing' });
        const result = await shareFile(fileId);
        if (result?.public_url) {
            setShare(fileId, { status: 'done', url: result.public_url });
            return;
        }
        setShare(fileId, { status: 'unavailable' });
    }, [setShare]);

    const handleOpenFolder = useCallback((folderId: string, folderName: string) => {
        openPane({
            id: `finder-${folderId}`,
            type: 'finder',
            title: folderName,
            size: { width: 960, height: 720 },
            data: { folderId },
        });
    }, [openPane]);

    const handleOpenCloudFolder = useCallback(async (connectorId: string, targetPath: string) => {
        await loadCloudConnectorItems(connectorId, targetPath);
    }, [loadCloudConnectorItems]);

    if (!pane) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-white/30" data-testid="meine-dateien-loading">
                <Loader2 size={14} className="animate-spin" />
                Lade Inhalte...
            </div>
        );
    }

    const glassPanelProps = {
        title: 'Privater Bereich',
        paneId,
        width: pane.size.width,
        height: pane.size.height,
        initialX: pane.position.x,
        initialY: pane.position.y,
        onPositionChange: (x: number, y: number) => updatePanePosition(paneId, x, y),
        onResize: (w: number, h: number) => updatePaneSize(paneId, w, h),
        onClose: () => removePane(paneId),
        onMinimize: () => minimizePane(paneId),
        onFocus: () => focusPane(paneId),
        isActive,
        zIndex: pane.zIndex,
        showCloseButton: true,
        showMinimizeButton: true,
        draggable: true,
        resizable: true,
    } as const;

    if (content === null || content === 'error') {
        return (
            <GlassPanel {...glassPanelProps}>
                <div className="px-5 py-8 text-sm text-white/30">
                    Meine Inhalte sind gerade nicht verfügbar.
                </div>
            </GlassPanel>
        );
    }

    const folders = Array.isArray(content.folders) ? content.folders : [];
    const documents = Array.isArray(content.documents)
        ? content.documents
        : (Array.isArray(content.nodes) ? content.nodes : []);
    const files = Array.isArray(content.files) ? content.files.filter((file) => isSourceFileAvailable(file)) : [];
    const standaloneFiles = files.filter((file) => !file.linked_node_id);
    const documentById = new Map(documents.map((document) => [document.id, document]));
    const fileById = new Map(standaloneFiles.map((file) => [file.id, file]));
    const counts = content.counts && typeof content.counts === 'object' ? content.counts : undefined;
    const privateAreaLabel = normalizePrivateAreaLabel(content.space?.name);
    const cloudStorage = content.cloud_storage;
    const cloudConnectors = Array.isArray(cloudStorage?.connectors) ? cloudStorage.connectors : [];
    const visibleCloudConnectors = cloudConnectors
        .filter((connector) => connector.enabled && connector.status === 'configured')
        .slice(0, 4);
    const cloudLoading = Object.values(cloudLoadingByConnector).some(Boolean);
    const cloudItemCount = Object.values(cloudItems).reduce((sum, items) => sum + items.length, 0);
    const cloudErrorCount = Object.keys(cloudErrors).length;

    const visibleItems: VisibleItem[] = Array.isArray(content.items) && content.items.length > 0
        ? content.items
        : [
            ...documents.map((document) => ({
                id: document.id,
                kind: 'document' as const,
                label: getContentDisplayName(document),
                timestamp: document.updated_at || document.created_at || null,
                visibility: document.visibility,
                node_id: document.id,
                file_id: null,
            })),
            ...standaloneFiles.map((file) => ({
                id: file.id,
                kind: 'file' as const,
                label: getSourceFileDisplayName(file),
                timestamp: file.created_at || null,
                visibility: file.visibility,
                node_id: null,
                file_id: file.id,
            })),
        ];
    const visibleCounts = {
        folders: folders.length,
        documents: documents.length,
        files: standaloneFiles.length,
        total: folders.length + visibleItems.length,
    };

    const isEmpty = folders.length === 0 && visibleItems.length === 0;

    return (
        <GlassPanel {...glassPanelProps}>
            <div className="flex h-full flex-col" data-testid="meine-dateien-content">
                {counts && (
                    <div className="border-b border-white/5 px-5 py-3">
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/20">
                            <span>{visibleCounts.total} sichtbare Eintraege</span>
                            <span>{visibleCounts.folders} Ordner</span>
                            <span>{visibleCounts.documents} Inhalte</span>
                            {visibleCounts.files > 0 && <span>{visibleCounts.files} Dateien</span>}
                        </div>
                        <p className="mt-2 text-xs text-white/35">
                            Alles hier gehoert nur deinem Konto. Gemeinsame Inhalte und Teamstrukturen oeffnest du getrennt im Finder der aktiven Instanz.
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto py-2">
                    {content.space?.name && (
                        <div className="px-5 pb-2 pt-1 text-[11px] text-white/30">
                            Privater Bereich: <span className="text-white/55">{privateAreaLabel}</span>
                        </div>
                    )}

                    <section aria-label="Cloud-Anbindungen" className="px-4 pb-2 pt-2">
                        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-500/[0.035] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200">
                                        <Cloud size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/48">Private Cloud</div>
                                        <div className="mt-1 text-sm font-medium text-white/82">
                                            {cloudConnectors.length > 0
                                                ? `${cloudConnectors.length} persoenliche Quelle(n)`
                                                : 'Eigene Cloud anbinden'}
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-white/45">
                                            {cloudConnectors.length > 0
                                                ? cloudConnectors.map((connector) => connector.label).join(' · ')
                                                : 'Nextcloud direkt per WebDAV/App-Passwort. SharePoint und Google Drive per OAuth.'}
                                        </p>
                                        {cloudLoading && visibleCloudConnectors.length === 0 ? (
                                            <div className="mt-3 flex items-center gap-2 text-[11px] text-white/35">
                                                <Loader2 size={11} className="animate-spin" />
                                                Cloud-Inhalte werden live geladen...
                                            </div>
                                        ) : cloudItemCount > 0 || cloudErrorCount > 0 || visibleCloudConnectors.length > 0 ? (
                                            <div className="mt-3 space-y-1.5">
                                                {visibleCloudConnectors.map((connector) => {
                                                    const items = cloudItems[connector.id] || [];
                                                    const currentPath = normalizeCloudPath(cloudPaths[connector.id] || '');
                                                    const pathLabel = currentPath ? `/${currentPath}` : '/';
                                                    const isConnectorLoading = Boolean(cloudLoadingByConnector[connector.id]);
                                                    const error = cloudErrors[connector.id];
                                                    return (
                                                        <div key={connector.id} className="rounded-xl border border-white/8 bg-black/20 p-2.5">
                                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <span className="block truncate text-[11px] font-medium text-white/62">{connector.label}</span>
                                                                    <span className="block truncate text-[10px] text-emerald-100/55">{pathLabel}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void handleOpenCloudFolder(connector.id, '')}
                                                                        disabled={isConnectorLoading || !currentPath}
                                                                        className="rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:bg-white/[0.05] disabled:opacity-40"
                                                                    >
                                                                        Root
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void handleOpenCloudFolder(connector.id, parentCloudPath(currentPath))}
                                                                        disabled={isConnectorLoading || !currentPath}
                                                                        className="rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:bg-white/[0.05] disabled:opacity-40"
                                                                    >
                                                                        Hoch
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void handleOpenCloudFolder(connector.id, currentPath)}
                                                                        disabled={isConnectorLoading}
                                                                        className="rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:bg-white/[0.05] disabled:opacity-40"
                                                                    >
                                                                        Neu laden
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {isConnectorLoading ? (
                                                                <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-white/35">
                                                                    <Loader2 size={11} className="animate-spin" />
                                                                    Lade Ordnerinhalt...
                                                                </div>
                                                            ) : error ? (
                                                                <div className="rounded-lg border border-amber-300/10 bg-amber-500/[0.04] px-3 py-2 text-[11px] text-amber-100/62">
                                                                    {error}
                                                                </div>
                                                            ) : items.length === 0 ? (
                                                                <div className="px-2 py-1.5 text-[11px] text-white/35">
                                                                    Dieser Ordner ist leer.
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    {items.slice(0, 8).map((item) => {
                                                                        const isFolder = item.kind === 'folder';
                                                                        const canOpenFile = Boolean(item.web_url);
                                                                        const nextPath = normalizeCloudPath(item.path || joinCloudPath(currentPath, item.name));
                                                                        const canInteract = isFolder || canOpenFile;
                                                                        return (
                                                                            <button
                                                                                key={`${connector.id}-${item.id}`}
                                                                                type="button"
                                                                                disabled={!canInteract}
                                                                                onClick={() => {
                                                                                    if (isFolder) {
                                                                                        void handleOpenCloudFolder(connector.id, nextPath);
                                                                                        return;
                                                                                    }
                                                                                    if (item.web_url) {
                                                                                        window.open(item.web_url, '_blank', 'noopener,noreferrer');
                                                                                    }
                                                                                }}
                                                                                className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
                                                                            >
                                                                                {isFolder ? (
                                                                                    <Folder size={12} className="shrink-0 text-emerald-100/45" />
                                                                                ) : (
                                                                                    <FileText size={12} className="shrink-0 text-cyan-100/45" />
                                                                                )}
                                                                                <span className="min-w-0 flex-1 truncate text-[11px] text-white/55 group-hover:text-white/78">
                                                                                    {item.name}
                                                                                </span>
                                                                                {isFolder ? (
                                                                                    <ChevronRight size={10} className="shrink-0 text-white/20" />
                                                                                ) : canOpenFile ? (
                                                                                    <ExternalLink size={10} className="shrink-0 text-white/20" />
                                                                                ) : (
                                                                                    <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-white/18">intern</span>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : cloudConnectors.some((connector) => connector.status === 'configured') ? (
                                            <p className="mt-3 text-[11px] text-white/30">
                                                Keine Cloud-Dateien sichtbar oder Provider derzeit nicht erreichbar.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openPane({
                                        id: 'integrations-cloud',
                                        type: 'integrations',
                                        title: 'Integrationen',
                                        size: { width: 1040, height: 720 },
                                        position: { x: 180, y: 100 },
                                    })}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-300/18 bg-emerald-500/10 px-3 py-2 text-[11px] font-medium text-emerald-100 transition-colors hover:bg-emerald-500/16"
                                >
                                    <PlugZap size={13} />
                                    Verbinden
                                </button>
                            </div>
                        </div>
                    </section>

                    {folders.length > 0 && (
                        <section aria-label="Ordner">
                            <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/20">
                                Ordner
                            </div>
                            {folders.map((folder) => (
                                <button
                                    key={folder.id}
                                    type="button"
                                    className="group flex w-full items-center gap-2 px-5 py-2.5 text-left hover:bg-white/[0.03]"
                                    data-testid={`folder-row-${folder.id}`}
                                    onClick={() => handleOpenFolder(folder.id, folder.name)}
                                >
                                    <Folder size={12} className="shrink-0 text-white/25" />
                                    <span className="flex-1 truncate text-xs text-white/45 transition-colors group-hover:text-white/65">
                                        {folder.name}
                                    </span>
                                    <ChevronRight size={10} className="text-white/15 transition-colors group-hover:text-white/30" />
                                </button>
                            ))}
                        </section>
                    )}

                    {isEmpty && (
                        <div className="px-5 py-8 text-sm text-white/30">
                            Keine eigenen Inhalte gefunden. Lege einen Ordner an, lade eine Datei hoch oder verbinde deine Cloud.
                        </div>
                    )}

                    {visibleItems.length > 0 && (
                        <section aria-label="Inhalte">
                            <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/20">
                                Inhalte
                            </div>
                            {visibleItems.map((item) => {
                                if (item.kind === 'document' && item.node_id) {
                                    const node = documentById.get(item.node_id);
                                    if (!node) return null;

                                    const label = getContentDisplayName(node);
                                    const share = shareStates[node.id] ?? { status: 'idle' };
                                    const sourceFileId = getNodeSourceFileId(node);

                                    return (
                                        <div
                                            key={`document-${node.id}`}
                                            className="group flex items-start gap-2.5 px-5 py-2.5 transition-colors hover:bg-white/[0.03]"
                                            data-testid={`node-row-${node.id}`}
                                        >
                                            <FileText size={13} className="mt-0.5 shrink-0 text-white/30" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void openNodeLike(node, openPane)}
                                                        className="truncate text-left text-sm text-white/70 transition-colors group-hover:text-white/90"
                                                    >
                                                        {label}
                                                    </button>
                                                    {node.visibility && (
                                                        <VisibilityBadge visibility={node.visibility} size={11} />
                                                    )}
                                                    <ShareControl state={share} onShare={() => void handleShareNode(node.id)} />
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/30">
                                                    <span>{getNodeOpenActionLabel(node)}</span>
                                                    {sourceFileId && (
                                                        <>
                                                            <span className="text-white/12">•</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    void openSourceFileForNode(node).catch((error: any) => {
                                                                        toast.error(error?.message || 'Datei konnte nicht geöffnet werden.');
                                                                    });
                                                                }}
                                                                className="text-cyan-200/70 transition-colors hover:text-cyan-100"
                                                            >
                                                                Quelle öffnen
                                                            </button>
                                                        </>
                                                    )}
                                                    <ShareResult state={share} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (item.kind === 'file' && item.file_id) {
                                    const file = fileById.get(item.file_id);
                                    if (!file) return null;

                                    const share = shareStates[file.id] ?? { status: 'idle' };
                                    const displayName = getSourceFileDisplayName(file);

                                    return (
                                        <div
                                            key={`file-${file.id}`}
                                            className="group flex items-start gap-2.5 px-5 py-2.5 transition-colors hover:bg-white/[0.03]"
                                            data-testid={`file-row-${file.id}`}
                                        >
                                            <Paperclip size={13} className="mt-0.5 shrink-0 text-white/25" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void openSourceFileLike(file, openPane).catch((error: any) => {
                                                                toast.error(error?.message || 'Datei konnte nicht geöffnet werden.');
                                                            });
                                                        }}
                                                        className="truncate text-left text-sm text-white/60 transition-colors group-hover:text-white/82"
                                                    >
                                                        {displayName}
                                                    </button>
                                                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-200/80">
                                                        {getSourceFileSecondaryLabel(file)}
                                                    </span>
                                                    {file.visibility && (
                                                        <VisibilityBadge visibility={file.visibility} size={11} />
                                                    )}
                                                    <ShareControl state={share} onShare={() => void handleShareFile(file.id)} />
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/30">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void openSourceFileLike(file, openPane).catch((error: any) => {
                                                                toast.error(error?.message || 'Datei konnte nicht geöffnet werden.');
                                                            });
                                                        }}
                                                        className="transition-colors hover:text-white/70"
                                                    >
                                                        {getSourceFileOpenActionLabel(file)}
                                                    </button>
                                                    {typeof file.size === 'number' && (
                                                        <>
                                                            <span className="text-white/12">•</span>
                                                            <span>{formatBytes(file.size)}</span>
                                                        </>
                                                    )}
                                                    <ShareResult state={share} />
                                                </div>
                                            </div>
                                            <ExternalLink size={10} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-30" />
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </section>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ShareControl: React.FC<{ state: ShareState; onShare: () => void }> = ({ state, onShare }) => {
    if (state.status === 'sharing') {
        return <Loader2 size={11} className="shrink-0 animate-spin text-white/30" />;
    }
    if (state.status === 'done') {
        return <Check size={11} className="shrink-0 text-emerald-400/70" aria-label="Link kopiert" />;
    }
    return (
        <button
            type="button"
            onClick={onShare}
            className="text-white/20 opacity-0 transition-opacity hover:text-white/50 group-hover:opacity-100"
            title="Oeffentlichen Link erstellen"
            aria-label="Teilen"
            data-testid="share-button"
        >
            <Link size={11} />
        </button>
    );
};

const ShareResult: React.FC<{ state: ShareState }> = ({ state }) => {
    if (state.status === 'done') {
        return (
            <button
                type="button"
                className="mt-0.5 block truncate text-left text-[10px] text-emerald-400/60 transition-colors hover:text-emerald-400/80"
                onClick={() => void navigator.clipboard.writeText(state.url)}
                title="Link kopieren"
                data-testid="share-url"
            >
                {state.url}
            </button>
        );
    }
    if (state.status === 'unavailable') {
        return (
            <span className="mt-0.5 block text-[10px] text-white/20" data-testid="share-unavailable">
                Teilen für diesen Inhalt ist noch nicht verfügbar
            </span>
        );
    }
    return null;
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
