'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight, ExternalLink, Folder, Link, Loader2, Paperclip, FileText } from 'lucide-react';
import { fetchMyContent, shareFile, shareNode, type UserContentResponse } from '@/lib/api/coreClient';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';
import { usePaneStore } from '@/lib/store/paneStore';
import {
    getContentDisplayName,
    getNodeOpenActionLabel,
    getNodeSourceFileId,
    getSourceFileDisplayName,
    getSourceFileOpenActionLabel,
    getSourceFileSecondaryLabel,
    openNodeLike,
    openSourceFileForNode,
    openSourceFileLike,
} from '@/lib/utils/contentOpen';

type ShareState =
    | { status: 'idle' }
    | { status: 'sharing' }
    | { status: 'done'; url: string }
    | { status: 'unavailable' };

export const MeineDateienPane: React.FC = () => {
    const [content, setContent] = useState<UserContentResponse | 'error' | null>(null);
    const [loading, setLoading] = useState(true);
    const [shareStates, setShareStates] = useState<Record<string, ShareState>>({});
    const openPane = usePaneStore((state) => state.openPane);

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

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-white/30" data-testid="meine-dateien-loading">
                <Loader2 size={14} className="animate-spin" />
                Lade Inhalte...
            </div>
        );
    }

    if (content === null || content === 'error') {
        return (
            <div className="px-4 py-8 text-sm text-white/30">
                Meine Inhalte sind gerade nicht verfuegbar.
            </div>
        );
    }

    const folders = Array.isArray(content.folders) ? content.folders : [];
    const nodes = Array.isArray(content.nodes) ? content.nodes : [];
    const files = Array.isArray(content.files) ? content.files : [];
    const counts = content.counts && typeof content.counts === 'object' ? content.counts : undefined;
    const isEmpty = folders.length === 0 && nodes.length === 0 && files.length === 0;

    if (isEmpty) {
        return (
            <div className="px-4 py-8 text-sm text-white/30">
                Keine eigenen Inhalte gefunden. Erstelle Dokumente oder lade Dateien hoch.
            </div>
        );
    }

    return (
        <div className="flex flex-col py-2" data-testid="meine-dateien-content">
            {counts && (
                <div className="mb-1 border-b border-white/5 px-4 py-2">
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/20">
                        {counts.total != null && <span>{counts.total} Eintraege gesamt</span>}
                        {counts.folders != null && <span>{counts.folders} Ordner</span>}
                        {counts.nodes != null && <span>{counts.nodes} bearbeitbare Inhalte</span>}
                        {counts.files != null && <span>{counts.files} Quelldateien</span>}
                    </div>
                    <div className="mt-1 text-[10px] text-white/20">
                        Derselbe Content-Kern wie im Finder: Ordner strukturieren, Dokumente sind bearbeitbar, Quelldateien bleiben als Originale erhalten.
                    </div>
                </div>
            )}

            {content.space?.name && (
                <div className="px-4 pb-2 pt-1 text-[11px] text-white/30">
                    Privater Bereich: <span className="text-white/55">{content.space.name}</span>
                </div>
            )}

            {folders.length > 0 && (
                <section aria-label="Ordner">
                    <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/20">
                        Ordner
                    </div>
                    {folders.map((folder) => (
                        <button
                            key={folder.id}
                            type="button"
                            className="group flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/[0.03]"
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

            {nodes.length > 0 && (
                <section aria-label="Bearbeitbare Inhalte">
                    <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/20">
                        Bearbeitbare Inhalte
                    </div>
                    {nodes.map((node) => {
                        const label = getContentDisplayName(node);
                        const share = shareStates[node.id] ?? { status: 'idle' };
                        const sourceFileId = getNodeSourceFileId(node);
                        return (
                            <div
                                key={node.id}
                                className="group flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
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
                                                    onClick={() => void openSourceFileForNode(node)}
                                                    className="text-cyan-200/70 transition-colors hover:text-cyan-100"
                                                >
                                                    Originaldatei oeffnen
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <ShareResult state={share} />
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {files.length > 0 && (
                <section aria-label="Quelldateien und Anhaenge">
                    <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/20">
                        Quelldateien und Anhaenge
                    </div>
                    {files.map((file) => {
                        const share = shareStates[file.id] ?? { status: 'idle' };
                        const displayName = getSourceFileDisplayName(file);
                        return (
                            <div
                                key={file.id}
                                className="group flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
                                data-testid={`file-row-${file.id}`}
                            >
                                <Paperclip size={13} className="mt-0.5 shrink-0 text-white/25" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void openSourceFileLike(file, openPane)}
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
                                            onClick={() => void openSourceFileLike(file, openPane)}
                                            className="transition-colors hover:text-white/70"
                                        >
                                            {getSourceFileOpenActionLabel(file)}
                                        </button>
                                        {file.linked_node_id && (
                                            <>
                                                <span className="text-white/12">•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => void openSourceFileLike({ ...file, linked_node_id: null }, openPane)}
                                                    className="text-cyan-200/70 transition-colors hover:text-cyan-100"
                                                >
                                                    Originaldatei oeffnen
                                                </button>
                                            </>
                                        )}
                                        {typeof file.size === 'number' && (
                                            <>
                                                <span className="text-white/12">•</span>
                                                <span>{formatBytes(file.size)}</span>
                                            </>
                                        )}
                                    </div>
                                    <ShareResult state={share} />
                                </div>
                                <ExternalLink size={10} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-30" />
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
};

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
                Teilen fuer diesen Inhalt ist noch nicht verfuegbar
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
