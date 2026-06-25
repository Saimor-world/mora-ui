'use client';

import React, { useCallback, useMemo } from 'react';
import { ExternalLink, Plug, RefreshCw, Rss, Settings } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { FeedItemCard } from '@/components/feeds/FeedItemCard';
import { usePaneStore } from '@/lib/store/paneStore';
import { useRssFeed } from '@/lib/queries/useRssFeed';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';
import { feedCadenceHint, formatLastUpdatedLabel } from '@/lib/rss/feedDates';
import type { AppProps } from '@/lib/apps/types';
import { GLASS_SHEET_PRESENTATION_FEED } from '@/lib/os/glassSheet';

export default function FeedsApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);
    const { overview } = useCommunicationSurface();
    const { data: items = [], isLoading, isFetching, refetch, error, dataUpdatedAt } = useRssFeed(30, Boolean(pane));

    const rssConfigured = Boolean(
        overview?.rss?.configured
        || (overview?.rss?.feeds?.length ?? 0) > 0
        || (overview?.rss?.count ?? 0) > 0,
    );

    const openIntegrations = useCallback(() => {
        openPane({
            id: 'integrations-main',
            type: 'integrations',
            title: 'Integrationen',
            size: { width: 860, height: 680 },
            data: { focus: 'rss' },
        });
    }, [openPane]);

    const handleRefresh = useCallback(async () => {
        broadcastCommunicationSync('rss-refresh');
        await refetch();
    }, [refetch]);

    if (!pane) return null;

    const lastUpdated = useMemo(() => {
        if (!dataUpdatedAt) return null;
        return formatLastUpdatedLabel(new Date(dataUpdatedAt).toISOString());
    }, [dataUpdatedAt]);

    const cadenceHint = useMemo(() => feedCadenceHint(items[0]?.sourceTitle), [items]);

    return (
        <GlassPanel
            paneId={paneId}
            title={(
                <div className="flex items-center gap-2">
                    <Rss size={16} className="text-emerald-200/70" />
                    <span>Dein Feed</span>
                </div>
            )}
            width={pane?.size.width ?? 920}
            height={pane?.size.height ?? 640}
            draggable
            resizable
            showCloseButton
            showMinimizeButton
            showMaximizeButton
            isActive={isActive}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            initialX={pane?.position.x}
            initialY={pane?.position.y}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            zIndex={pane.zIndex}
            {...GLASS_SHEET_PRESENTATION_FEED}
        >
            <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="max-w-xl space-y-1">
                        <p className="text-sm leading-relaxed text-white/48">
                            Deine verbundenen Quellen — neueste Einträge zuerst, Bilder zum Vergrößern anklicken.
                        </p>
                        {lastUpdated && (
                            <p className="text-[11px] text-white/34">{lastUpdated}</p>
                        )}
                        {items.length > 0 && (
                            <p className="text-[11px] text-white/30">{cadenceHint}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void handleRefresh()}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/62 transition-colors hover:bg-white/[0.08] hover:text-white/88 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                            Aktualisieren
                        </button>
                        <button
                            type="button"
                            onClick={openIntegrations}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/18 bg-emerald-500/[0.08] px-3 py-2 text-[12px] text-emerald-100/85 transition-colors hover:bg-emerald-500/[0.14]"
                        >
                            <Settings size={14} />
                            Quellen
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {isLoading ? (
                        <div className="flex h-40 items-center justify-center text-sm text-white/40">
                            Feed wird geladen…
                        </div>
                    ) : !rssConfigured ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-300/20 bg-emerald-500/[0.04] px-6 py-12 text-center">
                            <Plug size={22} className="text-emerald-200/55" />
                            <div>
                                <div className="text-sm font-medium text-white/78">Noch keine Feed-Quellen</div>
                                <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-white/42">
                                    Verbinde RSS- oder Atom-Feeds unter Quellen — hier erscheinen dann die neuesten Einträge mit Vorschaubildern.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openIntegrations}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/22 bg-emerald-500/12 px-4 py-2 text-sm text-emerald-100 transition-colors hover:bg-emerald-500/18"
                            >
                                RSS verbinden
                            </button>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                            <Rss size={22} className="text-white/30" />
                            <div className="text-sm text-white/62">Quellen verbunden, aber noch keine Einträge.</div>
                            <p className="max-w-sm text-[13px] text-white/38">
                                {error ? 'Abruf fehlgeschlagen — prüfe die Feed-URLs in den Quellen.' : 'Die Feeds liefern gerade nichts Neues.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {items.map((item) => (
                                <FeedItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-white/35">
                        <span>{items.length} Einträge · neueste zuerst</span>
                        <span className="inline-flex items-center gap-1">
                            <ExternalLink size={11} />
                            Bild klicken = Vergrößern · Titel = Link
                        </span>
                    </div>
                )}
            </div>
        </GlassPanel>
    );
}
