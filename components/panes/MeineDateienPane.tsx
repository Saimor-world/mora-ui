// components/panes/MeineDateienPane.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchMyContent } from '@/lib/api/coreClient';
import type { CoreNode } from '@/lib/types/core';
import { VisibilityBadge } from '@/components/content/VisibilityBadge';

/**
 * MeineDateienPane -- all content owned by the current user.
 *
 * Shows nodes across all visibility levels: private, department, company, public.
 * This is the user's personal content view inside the Universe.
 *
 * Spec: private content = Universe content with restricted visibility.
 * There is no separate personal space — the Universe is the workspace.
 *
 * Degrades gracefully if fetchMyContent returns null (endpoint not yet live).
 */
export const MeineDateienPane: React.FC = () => {
    const [nodes, setNodes] = useState<CoreNode[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyContent().then((result) => {
            setNodes(result);
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
                Lade Dateien...
            </div>
        );
    }

    if (nodes === null) {
        return (
            <div className="text-sm text-white/30 py-8 px-4">
                Meine Dateien nicht verfügbar — Endpunkt noch nicht bereit.
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className="text-sm text-white/30 py-8 px-4">
                Keine Dateien gefunden. Lade Dokumente hoch und wähle beim Upload wer sie sehen darf.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 py-2">
            {nodes.map((node) => {
                const label = node.title ?? node.name ?? '—';
                return (
                    <div
                        key={node.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                        <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors truncate flex-1">
                            {label}
                        </span>
                        {node.visibility && (
                            <VisibilityBadge visibility={node.visibility} size={11} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
