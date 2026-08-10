"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Rss, Plus, RefreshCw, Trash2, ExternalLink, Pencil, Check, X } from "lucide-react";
import { coreDelete, coreGet, corePost } from "@/lib/api/coreClient";
import { toast } from "sonner";
import { broadcastCommunicationSync } from "@/lib/integrations/communicationEvents";

interface RssFeed {
    id?: string;
    url: string;
    title?: string;
    enabled?: boolean;
}

interface RssItem {
    id: string;
    source_title?: string;
    title: string;
    link?: string;
    summary?: string;
}

export const RssIntegration: React.FC = () => {
    const [feeds, setFeeds] = useState<RssFeed[]>([]);
    const [items, setItems] = useState<RssItem[]>([]);
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [fetchErrors, setFetchErrors] = useState<Array<{ url: string; message: string }>>([]);
    const [editingUrl, setEditingUrl] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [status, feedItems] = await Promise.all([
                coreGet("/v3/integrations/rss", { isOptional: true }),
                coreGet("/v3/integrations/rss/items?limit=10&per_feed=5", { isOptional: true }),
            ]);
            setFeeds(Array.isArray(status?.feeds) ? status.feeds : []);
            setItems(Array.isArray(feedItems?.items) ? feedItems.items : []);
            setFetchErrors(Array.isArray(feedItems?.errors) ? feedItems.errors : []);
        } catch {
            // isOptional already handles this; belt-and-suspenders
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const saveFeed = useCallback(async () => {
        if (!url.trim()) return;
        setIsSaving(true);
        try {
            const result = await corePost("/v3/integrations/rss", {
                url: url.trim(),
                title: title.trim() || undefined,
                enabled: true,
            });
            if (!result) {
                toast.error("Feed konnte nicht gespeichert werden");
                return;
            }
            setUrl("");
            setTitle("");
            toast.success("Feed verbunden");
            broadcastCommunicationSync("rss-save");
            await load();
        } catch (err: any) {
            toast.error(err?.message || "Feed konnte nicht gespeichert werden");
        } finally {
            setIsSaving(false);
        }
    }, [load, title, url]);

    const removeFeed = useCallback(async (feedUrl: string) => {
        try {
            await coreDelete(`/v3/integrations/rss?url=${encodeURIComponent(feedUrl)}`);
            toast.success("Feed entfernt");
            broadcastCommunicationSync("rss-delete");
            await load();
        } catch (err: any) {
            toast.error(err?.message || "Feed konnte nicht entfernt werden");
        }
    }, [load]);

    const updateFeedTitle = useCallback(async (feedUrl: string, nextTitle: string) => {
        const trimmed = nextTitle.trim();
        if (!trimmed) {
            toast.error("Name darf nicht leer sein");
            return;
        }
        try {
            await corePost("/v3/integrations/rss", {
                url: feedUrl,
                title: trimmed,
                enabled: true,
            });
            toast.success("Quelle aktualisiert");
            broadcastCommunicationSync("rss-save");
            setEditingUrl(null);
            setEditingTitle("");
            await load();
        } catch (err: any) {
            toast.error(err?.message || "Quelle konnte nicht aktualisiert werden");
        }
    }, [load]);

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.03] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-500/10 text-emerald-200">
                        <Rss size={18} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-white/85">RSS und Atom</div>
                        <p className="mt-1 text-xs leading-relaxed text-white/45">
                            Verbinde echte News-, Blog-, Release- oder Monitoring-Feeds. Mora nutzt die Signale im Chat-Kontext, ohne Inhalte zu erfinden.
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_auto]">
                    <input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://example.com/feed.xml"
                        className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/35 focus:outline-none"
                    />
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Name optional"
                        className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/35 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => void saveFeed()}
                        disabled={!url.trim() || isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/12 px-4 py-2 text-sm text-emerald-100 transition-colors hover:bg-emerald-500/18 disabled:opacity-45"
                    >
                        {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        Hinzufügen
                    </button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Quellen</div>
                        <button
                            type="button"
                            aria-label="RSS-Quellen aktualisieren"
                            title="RSS-Quellen aktualisieren"
                            onClick={() => void load()}
                            className="text-white/35 transition-colors hover:text-white/70"
                        >
                            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    {feeds.length === 0 ? (
                        <p className="text-xs leading-relaxed text-white/42">
                            Noch keine Feed-Quelle verbunden. Füge zuerst einen RSS- oder Atom-Link hinzu.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {feeds.map((feed) => (
                                <div key={feed.url} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                        {editingUrl === feed.url ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={editingTitle}
                                                    onChange={(event) => setEditingTitle(event.target.value)}
                                                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-sm text-white focus:border-emerald-400/35 focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    aria-label={`Namen für ${feed.title || feed.url} speichern`}
                                                    onClick={() => void updateFeedTitle(feed.url, editingTitle)}
                                                    className="rounded-lg p-1.5 text-emerald-200/70 transition-colors hover:bg-emerald-500/10"
                                                    title="Speichern"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Bearbeitung für ${feed.title || feed.url} abbrechen`}
                                                    onClick={() => {
                                                        setEditingUrl(null);
                                                        setEditingTitle("");
                                                    }}
                                                    className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/5"
                                                    title="Abbrechen"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="truncate text-sm text-white/78">{feed.title || feed.url}</div>
                                                <div className="truncate text-[11px] text-white/35">{feed.url}</div>
                                            </>
                                        )}
                                    </div>
                                    {editingUrl !== feed.url && (
                                        <>
                                            <button
                                                type="button"
                                                aria-label={`Name von ${feed.title || feed.url} bearbeiten`}
                                                onClick={() => {
                                                    setEditingUrl(feed.url);
                                                    setEditingTitle(feed.title || "");
                                                }}
                                                className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/5 hover:text-white/70"
                                                title="Name bearbeiten"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Feed ${feed.title || feed.url} entfernen`}
                                                onClick={() => void removeFeed(feed.url)}
                                                className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-red-500/10 hover:text-red-200"
                                                title="Feed entfernen"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">Aktuelle Signale</div>
                        {fetchErrors.length > 0 && (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300/70">
                                {fetchErrors.length} Fehler
                            </span>
                        )}
                    </div>
                    {fetchErrors.length > 0 && items.length === 0 && (
                        <div className="mb-3 space-y-1.5">
                            {fetchErrors.slice(0, 2).map((err) => (
                                <div key={err.url} className="rounded-xl border border-red-500/15 bg-red-500/[0.05] px-3 py-2">
                                    <div className="truncate text-[10px] text-red-300/60">{new URL(err.url).hostname}</div>
                                    <div className="mt-0.5 text-[11px] text-red-200/50">{err.message.slice(0, 80)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {items.length === 0 && fetchErrors.length === 0 ? (
                        <p className="text-xs leading-relaxed text-white/42">
                            Nach dem Verbinden erscheinen hier die neuesten Einträge. Fehlerhafte Feeds werden isoliert, damit der Rest weiterläuft.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item) => (
                                <a
                                    key={item.id}
                                    href={item.link || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 transition-colors hover:border-emerald-300/20 hover:bg-emerald-300/[0.04]"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[11px] uppercase tracking-[0.16em] text-emerald-200/45">{item.source_title || "Feed"}</div>
                                            <div className="mt-1 line-clamp-2 text-sm text-white/78">{item.title}</div>
                                        </div>
                                        {item.link ? <ExternalLink size={13} className="mt-1 shrink-0 text-white/28" /> : null}
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
