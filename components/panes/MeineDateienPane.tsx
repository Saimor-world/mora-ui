// components/panes/MeineDateienPane.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Folder, FileText, Paperclip, ChevronRight } from 'lucide-react';
import { fetchMyContent, type UserContentResponse } from '@/lib/api/coreClient';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';

/**
 * MeineDateienPane — the current user's personal content surface.
 *
 * Renders three distinct sections, in order of navigational hierarchy:
 *   1. Folders  — compact, container-like, navigational role
 *   2. Dokumente — nodes (documents, notes, tasks) — primary content
 *   3. Dateien   — uploaded file objects — separate from nodes, not merged
 *
 * Object semantics are preserved: folders are not content cards.
 * Server truth: GET /v3/users/me/content (Core: 5616cc6+).
 * Degrades gracefully on null (endpoint unavailable).
 */
export const MeineDateienPane: React.FC = () => {
    const [content, setContent] = useState<UserContentResponse | null | 'error'>('loading' as any);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyContent().then((result) => {
            setContent(result === null ? 'error' as any : result);
            setLoading(false);
        });
    }, []);

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

    if (content === null || (content as any) === 'error') {
        return (
            <div className="text-sm text-white/30 py-8 px-4">
                Meine Inhalte nicht verfügbar.
            </div>
        );
    }

    const response = content as UserContentResponse;
    const folders = response.folders ?? [];
    const nodes = response.nodes ?? [];
    const files = response.files ?? [];
    const counts = response.counts;

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
            {/* Counts header — lightweight summary */}
            {counts && (
                <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-white/20 border-b border-white/5 mb-1">
                    {counts.folders != null && <span>{counts.folders} Ordner</span>}
                    {counts.nodes != null && <span>{counts.nodes} Dokumente</span>}
                    {counts.files != null && <span>{counts.files} Dateien</span>}
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
                <section aria-label="Dokumente">
                    <div className="px-4 pt-3 pb-1 text-[10px] text-white/20 uppercase tracking-wider">
                        Dokumente
                    </div>
                    {nodes.map((node) => {
                        const label = node.title ?? node.name ?? '—';
                        return (
                            <div
                                key={node.id}
                                className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                data-testid={`node-row-${node.id}`}
                            >
                                <FileText size={13} className="text-white/30 shrink-0" />
                                <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors truncate flex-1">
                                    {label}
                                </span>
                                {node.visibility && (
                                    <VisibilityBadge visibility={node.visibility} size={11} />
                                )}
                            </div>
                        );
                    })}
                </section>
            )}

            {/* Section 3: Files — uploads, separate object type */}
            {files.length > 0 && (
                <section aria-label="Dateien">
                    <div className="px-4 pt-3 pb-1 text-[10px] text-white/20 uppercase tracking-wider">
                        Dateien
                    </div>
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                            data-testid={`file-row-${file.id}`}
                        >
                            <Paperclip size={13} className="text-white/25 shrink-0" />
                            <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors truncate flex-1">
                                {file.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                {file.size != null && (
                                    <span className="text-[10px] text-white/20">
                                        {formatBytes(file.size)}
                                    </span>
                                )}
                                {file.visibility && (
                                    <VisibilityBadge visibility={file.visibility} size={11} />
                                )}
                            </div>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
