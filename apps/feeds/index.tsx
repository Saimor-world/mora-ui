'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Plug, RefreshCw, Rss, Settings } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { FeedItemCard } from '@/components/feeds/FeedItemCard';
import { usePaneStore } from '@/lib/store/paneStore';
import { useRssFeed } from '@/lib/queries/useRssFeed';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';
import { feedCadenceHint, formatLastUpdatedLabel } from '@/lib/rss/feedDates';
import type { AppProps } from '@/lib/apps/types';
import { AppEmpty, uv2 } from '@/components/universe/app/AppStage';
import { Segmented } from '@/components/universe/app/Tiles';
import { useNavStore } from '@/lib/store/navStore';
import { GLASS_SHEET_PRESENTATION_FEED } from '@/lib/os/glassSheet';

export default function FeedsApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);
    const { overview } = useCommunicationSurface();
    const activeCompanyId = useNavStore((state) => state.activeCompanyId);
    const { data: items = [], isLoading, isFetching, refetch, error, dataUpdatedAt } = useRssFeed(30, Boolean(pane), activeCompanyId);

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

    const [source, setSource] = useState<string>('all');
    const sources = useMemo(() => { const m = new Map<string, number>(); items.forEach((it) => m.set(it.sourceTitle, (m.get(it.sourceTitle) ?? 0) + 1)); return [...m.entries()].slice(0, 6); }, [items]);
    const shown = source === 'all' ? items : items.filter((it) => it.sourceTitle === source);
    const handleRefresh = useCallback(async () => {
        broadcastCommunicationSync('rss-refresh');
        await refetch();
    }, [refetch]);

    const lastUpdated = useMemo(() => {
        if (!dataUpdatedAt) return null;
        return formatLastUpdatedLabel(new Date(dataUpdatedAt).toISOString());
    }, [dataUpdatedAt]);

    const cadenceHint = useMemo(() => feedCadenceHint(items[0]?.sourceTitle), [items]);

    if (!pane) return null;

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
            {uv2() ? (
            <div className="flex h-full min-h-0 flex-col" data-uv2-app="feeds">
                {rssConfigured && (
                    <div className="uv2-ftool" data-testid="feeds-v2-bar">
                        <Segmented value={source} onChange={setSource} label="Quelle" options={[
                            { id: 'all', label: `Alle ${items.length}`, icon: <Rss /> },
                            ...sources.map(([name, n]) => ({ id: name, label: `${name} ${n}` })),
                        ]} />
                        <span style={{ flex: 1 }} />
                        {lastUpdated ? <span className="uv2-notes__count">{lastUpdated}</span> : null}
                        <button type="button" className="uv2-pill" onClick={() => void handleRefresh()} disabled={isFetching} aria-label="Neu abrufen" title="Neu abrufen"><RefreshCw className={isFetching ? 'animate-spin' : ''} /></button>
                        <button type="button" className="uv2-pill" onClick={openIntegrations} aria-label="Quellen" title="Quellen"><Settings /></button>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {isLoading ? (
                        <p className="px-8 py-10 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgba(247,244,233,.5)]">Horizont wird gelesen …</p>
                    ) : !rssConfigured ? (
                        <div className="flex h-full items-center justify-center">
                            <AppEmpty glyph={<Rss size={22} strokeWidth={1.25} />} title="Dein Horizont, ausgewählt."
                                text="Verbinde die Quellen, denen du vertraust. MÔRA zeigt das Neueste und hebt hervor, was deine Bereiche berührt."
                                action={{ label: 'Quellen verbinden', onClick: openIntegrations }} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <AppEmpty glyph={<Rss size={22} strokeWidth={1.25} />} title={error ? 'Die Quellen antworten nicht.' : 'Gerade nichts Neues.'}
                                text={error ? 'Prüfe die Feed-Adressen unter Quellen.' : 'Deine Quellen sind verbunden. Neue Einträge erscheinen hier, sobald sie veröffentlicht werden.'}
                                action={{ label: 'Neu abrufen', onClick: () => void handleRefresh() }} />
                        </div>
                    ) : (
                        <div className="uv2-news" data-testid="feeds-v2-grid">
                            {shown.map((item, k) => (
                                <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="uv2-news__card" data-lead={k === 0 ? '' : undefined}>
                                    {item.imageUrl ? <span className="uv2-news__img" style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl)})` }} /> : <span className="uv2-news__img uv2-news__img--none"><Rss /></span>}
                                    <span className="uv2-news__src">{item.sourceTitle}{item.published ? ' · ' + new Date(item.published).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}</span>
                                    <span className="uv2-news__title">{item.title}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            ) : (
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
            )}
        </GlassPanel>
    );
}
