'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet } from '@/lib/api/coreClient';
import {
    Activity, Clock, FileText, Folder, MessageCircle,
    ScanLine, SquareCheckBig, Users, Loader2, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = 'document' | 'folder' | 'scan' | 'chat' | 'task' | 'team' | 'generic';

interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    description?: string;
    timestamp: string;   // ISO string
    actor?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<ActivityType, { icon: LucideIcon; color: string; label: string }> = {
    document: { icon: FileText,       color: 'text-blue-400',    label: 'Dokument' },
    folder:   { icon: Folder,         color: 'text-emerald-400', label: 'Ordner' },
    scan:     { icon: ScanLine,       color: 'text-purple-400',  label: 'Scan' },
    chat:     { icon: MessageCircle,  color: 'text-mora-gold',   label: 'Gespräch' },
    task:     { icon: SquareCheckBig, color: 'text-orange-400',  label: 'Aufgabe' },
    team:     { icon: Users,          color: 'text-cyan-400',    label: 'Team' },
    generic:  { icon: Activity,       color: 'text-white/40',    label: 'Aktivität' },
};

function relativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
}

// ─── ActivityRow ──────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
    const meta = TYPE_META[item.type] ?? TYPE_META.generic;
    const Icon: LucideIcon = meta.icon;
    return (
        <div className="flex gap-3 group">
            {/* Timeline spine */}
            <div className="flex flex-col items-center shrink-0">
                <div className={`mt-0.5 p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] ${meta.color}`}>
                    <Icon size={11} />
                </div>
                <div className="mt-1 flex-1 w-px bg-white/[0.05]" />
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
                <p className="text-xs text-white/75 leading-snug truncate">{item.title}</p>
                {item.description && (
                    <p className="mt-0.5 text-[10px] text-white/35 leading-snug line-clamp-2">{item.description}</p>
                )}
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/25">
                    <Clock size={9} />
                    <span>{relativeTime(item.timestamp)}</span>
                    {item.actor && <><span>·</span><span className="truncate">{item.actor}</span></>}
                </div>
            </div>
        </div>
    );
}

// ─── TimelineApp ──────────────────────────────────────────────────────────────

export default function TimelineApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore(s => s.activePaneId === paneId);

    const [items, setItems] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setIsLoading(true);
        else setIsRefreshing(true);

        let cancelled = false;
        try {
            const data = await coreGet('/v3/activities', { isOptional: true });
            if (!cancelled && Array.isArray(data)) {
                setItems(data as ActivityItem[]);
            }
        } finally {
            if (!cancelled) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
        return () => { cancelled = true; };
    }, []);

    useEffect(() => { load(); }, [load]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Zeitverlauf"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
                <span className="text-[11px] text-white/30 uppercase tracking-wider">Letzte Aktivitäten</span>
                <button
                    onClick={() => load(true)}
                    disabled={isRefreshing}
                    className="p-1.5 rounded hover:bg-white/10 text-white/25 hover:text-white/60 transition-colors disabled:opacity-40"
                    title="Aktualisieren"
                >
                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex h-full items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white/30" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center gap-3 text-center px-8">
                    <Activity size={28} className="text-white/15" />
                    <p className="text-[13px] text-white/30">Noch keine Aktivitäten</p>
                    <p className="text-[11px] text-white/20 leading-relaxed max-w-[220px]">
                        Aktivitäten erscheinen hier, sobald du Dokumente bearbeitest, scannst oder mit dem Team zusammenarbeitest.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-4 pt-3">
                    {items.map(item => (
                        <ActivityRow key={item.id} item={item} />
                    ))}
                </div>
            )}
        </GlassPanel>
    );
}
