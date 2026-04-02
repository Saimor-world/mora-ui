// components/panes/MeineDateienPane.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Folder, FileText, Paperclip, ChevronRight, Link, Check, ExternalLink } from 'lucide-react';
import { fetchMyContent, shareNode, shareFile, type UserContentResponse } from '@/lib/api/coreClient';
import { usePaneStore } from '@/lib/store/paneStore';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';
import { downloadCompanyFile } from '@/lib/api/filesClient';

/**
 * MeineDateienPane — the current user's personal content surface.
 *
 * Three sections in order of navigational hierarchy:
 *   1. Folders  — compact, container-like, navigational role
 *   2. Dokumente — nodes (documents, notes, tasks) — primary content
 *   3. Dateien   — uploaded file objects — separate from nodes, not merged
 *
 * Share behaviour (honest-limited, Core: 77f4fda):
 * - Files: always shareable via POST /v3/files/{id}/share
 * - Nodes: only file-backed nodes are currently shareable (server returns null otherwise)
 *   The UI shows the limitation inline — no silent failure.
 *
 * Server truth: GET /v3/users/me/content
 * Degrades gracefully on null (endpoint unavailable).
 */

type ShareState =
    | { status: 'idle' }
    | { status: 'sharing' }
    | { status: 'done'; url: string }
    | { status: 'unavailable' };

export const MeineDateienPane: React.FC = () => {
    const [content, setContent] = useState<UserContentResponse | 'error' | null>(null);
    const [loading, setLoading] = useState(true);
    const [shareStates, setShareStates] = useState<Record<string, ShareState>>({});
    const openPane = usePaneStore(s => s.openPane);

    useEffect(() => {
        let cancelled = false;
        fetchMyContent()
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

    const setShare = (id: string, state: ShareState) =>
        setShareStates((prev) => ({ ...prev, [id]: state }));

    const handleShareNode = useCallback(async (nodeId: string) => {
        setShare(nodeId, { status: 'sharing' });
        const result = await shareNode(nodeId);
        if (result?.public_url) {
            setShare(nodeId, { status: 'done', url: result.public_url });
        } else {
            // Server returned null (409 for non-file-backed nodes) — surface honestly
            setShare(nodeId, { status: 'unavailable' });
        }
    }, []);

    const handleShareFile = useCallback(async (fileId: string) => {
        setShare(fileId, { status: 'sharing' });
        const result = await shareFile(fileId);
        if (result?.public_url) {
            setShare(fileId, { status: 'done', url: result.public_url });
        } else {
            setShare(fileId, { status: 'unavailable' });
        }
    }, []);

    const handleOpenFolder = useCallback((folderId: string, folderName: string) => {
        openPane({ id: `finder-${folderId}`, type: 'finder', title: folderName, size: { width: 700, height: 560 }, data: { folderId } });
    }, [openPane]);

    const handleOpenNode = useCallback((nodeId: string, title: string) => {
        openPane({ id: `doc-${nodeId}`, type: 'document', title, size: { width: 600, height: 700 }, data: { nodeId } });
    }, [openPane]);

    const handleOpenFile = useCallback((fileId: string, fileName: string) => {
        void downloadCompanyFile(fileId, fileName);
    }, []);

    const handleOpenLinkedNode = useCallback((nodeId: string, title: string) => {
        openPane({ id: `doc-${nodeId}`, type: 'document', title, size: { width: 960, height: 720 }, data: { nodeId } });
    }, [openPane]);

    if (loading) {
        return (
            <div
                className="flex items-center gap-2 text-white/30 text-sm py-8 px-4"
                data-testid="meine-dateien-loading"
            >
                <Loader2 size={14} className="animate-spin" />
                Lade Inhalte...
            </div>
        );
    }

    if (content === null || content === 'error') {
        return (
            <div className="text-sm text-white/30 py-8 px-4">
                Meine Inhalte nicht verfuegbar.
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
            <div className="text-sm text-white/30 py-8 px-4">
                Keine eigenen Inhalte gefunden. Erstelle Dokumente oder lade Dateien hoch.
            </div>
        );
    }

    return (
        <div className="flex flex-col py-2" data-testid="meine-dateien-content">
            {/* Counts header */}
            {counts && (
                <div className="border-b border-white/5 mb-1 px-4 py-2">
                    <div className="flex items-center gap-3 text-[10px] text-white/20">
                        {counts.total != null && <span>{counts.total} Eintraege gesamt</span>}
                        {counts.folders != null && <span>{counts.folders} Ordner</span>}
                        {counts.nodes != null && <span>{counts.nodes} bearbeitbare Inhalte</span>}
                        {counts.files != null && <span>{counts.files} Quelldateien</span>}
                    </div>
                    <div className="mt-1 text-[10px] text-white/20">
                        Bearbeitbare Inhalte kannst du direkt oeffnen. Quelldateien bleiben als Original erhalten und koennen mit Inhalten verknuepft sein.
                    </div>
                </div>
            )}

            {content.space?.name && (
                <div className="px-4 pb-2 pt-1 text-[11px] text-white/30">
                    Privater Bereich: <span className="text-white/55">{content.space.name}</span>
                </div>
            )}

            {/* Section 1: Folders — compact, navigational */}
            {folders.length > 0 && (
                <section aria-label="Ordner">
                    <div className="px-4 pt-3 pb-1 text-[10px] text-white/20 uppercase tracking-wider">
                        Ordner
                    </div>
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className="flex items-center gap-2 px-4 py-1.5 hover:bg-white/[0.02] cursor-pointer group"
                            data-testid={`folder-row-${folder.id}`}
                            onClick={() => handleOpenFolder(folder.id, folder.name)}
                        >
                            <Folder size={12} className="text-white/25 shrink-0" />
                            <span className="text-xs text-white/45 group-hover:text-white/60 transition-colors truncate flex-1">
                                {folder.name}
                            </span>
                            <ChevronRight size={10} className="text-white/15 group-hover:text-white/30 transition-colors" />
                        </div>
                    ))}
                </section>
            )}

            {/* Section 2: Nodes — primary content */}
            {nodes.length > 0 && (
                <section aria-label="Bearbeitbare Inhalte">
                    <div className="px-4 pt-3 pb-1 text-[10px] text-white/20 uppercase tracking-wider">
                        Bearbeitbare Inhalte
                    </div>
                    {nodes.map((node) => {
                        const label = node.title ?? node.name ?? 'Unbenannt';
                        const share = shareStates[node.id] ?? { status: 'idle' };
                        return (
                            <div
                                key={node.id}
                                className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                data-testid={`node-row-${node.id}`}
                                onClick={() => handleOpenNode(node.id, label)}
                            >
                                <FileText size={13} className="text-white/30 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors truncate">
                                            {label}
                                        </span>
                                        {node.visibility && (
                                            <VisibilityBadge visibility={node.visibility} size={11} />
                                        )}
                                        <ShareControl
                                            state={share}
                                            onShare={() => handleShareNode(node.id)}
                                        />
                                    </div>
                                    <ShareResult state={share} />
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {/* Section 3: Files — uploads, always shareable */}
            {files.length > 0 && (
                <section aria-label="Quelldateien und Anhaenge">
                    <div className="px-4 pt-3 pb-1 text-[10px] text-white/20 uppercase tracking-wider">
                        Quelldateien & Anhaenge
                    </div>
                    {files.map((file) => {
                        const share = shareStates[file.id] ?? { status: 'idle' };
                        const displayName = file.name || `Datei ${file.id.slice(0, 8)}`;
                        const isLinkedToDocument = Boolean(file.linked_node_id);
                        return (
                            <div
                                key={file.id}
                                className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                data-testid={`file-row-${file.id}`}
                                onClick={() => isLinkedToDocument && file.linked_node_id
                                    ? handleOpenLinkedNode(file.linked_node_id, displayName)
                                    : handleOpenFile(file.id, displayName)}
                            >
                                <Paperclip size={13} className="text-white/25 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors truncate">
                                            {displayName}
                                        </span>
                                        {isLinkedToDocument && (
                                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-200/80 shrink-0">
                                                Als Dokument oeffnen
                                            </span>
                                        )}
                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
                                                {typeof file.size === 'number' && (
                                                    <span className="text-[10px] text-white/20 shrink-0">
                                                        {formatBytes(file.size)}
                                                    </span>
                                        )}
                                        {file.visibility && (
                                            <VisibilityBadge visibility={file.visibility} size={11} />
                                        )}
                                        <ShareControl
                                            state={share}
                                            onShare={() => handleShareFile(file.id)}
                                        />
                                    </div>
                                    <div className="mt-1 text-[11px] text-white/30">
                                        {isLinkedToDocument
                                            ? 'Die Quelldatei bleibt erhalten und ist bereits mit einem Dokument verknuepft.'
                                            : 'Liegt bisher nur als Quelldatei vor. Klick laedt die Datei direkt herunter.'}
                                    </div>
                                    <ShareResult state={share} />
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
};

/** Share icon button — shown on hover, loading spinner while in-flight. */
const ShareControl: React.FC<{ state: ShareState; onShare: () => void }> = ({ state, onShare }) => {
    if (state.status === 'sharing') {
        return <Loader2 size={11} className="text-white/30 animate-spin shrink-0" />;
    }
    if (state.status === 'done') {
        return <Check size={11} className="text-emerald-400/70 shrink-0" aria-label="Link kopiert" />;
    }
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50"
            title="Oeffentlichen Link erstellen"
            aria-label="Teilen"
            data-testid="share-button"
        >
            <Link size={11} />
        </button>
    );
};

/** Inline URL display after sharing, or honest limitation message. */
const ShareResult: React.FC<{ state: ShareState }> = ({ state }) => {
    if (state.status === 'done') {
        return (
            <button
                className="text-[10px] text-emerald-400/60 hover:text-emerald-400/80 transition-colors mt-0.5 truncate block text-left"
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(state.url); }}
                title="Link kopieren"
                data-testid="share-url"
            >
                {state.url}
            </button>
        );
    }
    if (state.status === 'unavailable') {
        return (
            <span className="text-[10px] text-white/20 mt-0.5 block" data-testid="share-unavailable">
                Teilen fuer diesen Inhalt noch nicht verfuegbar
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
