'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet } from '@/lib/api/coreClient';
import {
    Activity,
    AlertTriangle,
    Clock,
    FileText,
    Folder,
    MessageCircle,
    ScanLine,
    SquareCheckBig,
    Users,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';

type ActivityType = 'document' | 'folder' | 'scan' | 'chat' | 'task' | 'team' | 'generic';

interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    description?: string;
    timestamp: string;
    actor?: string;
}

const TYPE_META: Record<ActivityType, { icon: LucideIcon; color: string; label: string }> = {
    document: { icon: FileText,       color: 'text-blue-300/70',    label: 'Dokument' },
    folder:   { icon: Folder,         color: 'text-emerald-300/70', label: 'Dateien' },
    scan:     { icon: ScanLine,       color: 'text-violet-300/70',  label: 'Erfassung' },
    chat:     { icon: MessageCircle,  color: 'text-amber-200/70',   label: 'MÔRA' },
    task:     { icon: SquareCheckBig, color: 'text-orange-300/70',  label: 'Arbeit' },
    team:     { icon: Users,          color: 'text-cyan-300/70',    label: 'Zusammenarbeit' },
    generic:  { icon: Activity,       color: 'text-white/40',       label: 'Hinweis' },
};

function relativeTime(isoString: string): string {
    const timestamp = new Date(isoString).getTime();
    if (!Number.isFinite(timestamp)) return '';
    const diff = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
}

function ActivityRow({ item }: { item: ActivityItem }) {
    const meta = TYPE_META[item.type] ?? TYPE_META.generic;
    const Icon = meta.icon;
    return (
        <div className="group flex gap-3">
            <div className="flex shrink-0 flex-col items-center">
                <div className={`mt-0.5 rounded-lg border border-white/[0.06] bg-white/[0.025] p-1.5 ${meta.color}`}>
                    <Icon size={11} />
                </div>
                <div className="mt-1 w-px flex-1 bg-white/[0.045]" />
            </div>
            <div className="min-w-0 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs leading-snug text-white/74">{item.title}</p>
                    <span className="text-[8px] uppercase tracking-[0.15em] text-white/20">{meta.label}</span>
                </div>
                {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/34">{item.description}</p>
                )}
                <div className="mt-1 flex items-center gap-1.5 text-[9px] text-white/22">
                    <Clock size={9} />
                    <span>{relativeTime(item.timestamp)}</span>
                    {item.actor && <><span>·</span><span className="truncate">{item.actor}</span></>}
                </div>
            </div>
        </div>
    );
}

export default function TimelineApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);

    const [items, setItems] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (quiet = false) => {
        if (quiet) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);
        try {
            const data = await coreGet('/v3/activities?limit=60', {
                isOptional: true,
                throwAuthErrors: true,
            });
            if (!Array.isArray(data)) {
                setAvailable(false);
                return;
            }
            setItems(data as ActivityItem[]);
            setAvailable(true);
        } catch (requestError) {
            console.warn('[TimelineApp] activity load failed', requestError);
            setAvailable(false);
            setError('Aktivität konnte gerade nicht aktualisiert werden. Der letzte bestätigte Stand bleibt sichtbar.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Aktivität"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(width, height) => updatePaneSize(paneId, width, height)}
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
            <div className="flex h-full min-h-0 flex-col text-white">
                <header className="border-b border-white/[0.05] px-4 pb-4 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/26">
                            <span className={`h-1.5 w-1.5 rounded-full ${available === true ? 'bg-emerald-300/65' : 'bg-white/20'}`} />
                            {available === true ? 'Aktuell' : available === false ? 'Nicht erreichbar' : 'Wird geladen'}
                        </div>
                        <button
                            type="button"
                            onClick={() => void load(true)}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.055] bg-white/[0.018] px-2.5 py-1.5 text-[9px] text-white/28 transition hover:text-white/58 disabled:opacity-40"
                        >
                            <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} /> Aktualisieren
                        </button>
                    </div>
                    <h2 className="mt-4 text-[22px] font-medium tracking-[-0.035em] text-white/82">Was sich verändert hat</h2>
                    <p className="mt-1 max-w-[620px] text-[10px] leading-relaxed text-white/30">
                        Arbeit, Dokumente und relevante MÔRA-Hinweise erscheinen hier automatisch in einem gemeinsamen Verlauf.
                    </p>
                </header>

                {error && (
                    <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-amber-100/55">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-white/30" />
                    </div>
                ) : available === false && items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                        <AlertTriangle size={24} className="text-amber-100/30" />
                        <p className="text-[12px] text-white/38">Aktivität ist gerade nicht verfügbar.</p>
                        <p className="max-w-[320px] text-[10px] leading-relaxed text-white/22">
                            Saimôr zeigt keinen leeren Verlauf an, solange der aktuelle Stand nicht sicher gelesen werden kann.
                        </p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                        <Activity size={26} className="text-white/14" />
                        <p className="text-[12px] text-white/36">Noch keine Aktivität.</p>
                        <p className="max-w-[300px] text-[10px] leading-relaxed text-white/20">
                            Sobald sich Arbeit, Dateien oder relevante Hinweise verändern, wird es hier sichtbar.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto px-4 pt-4">
                        {items.map((item) => <ActivityRow key={item.id} item={item} />)}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
}
