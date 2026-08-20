"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { normalizeList } from "@/lib/api/http";
import { parseRssItem } from "@/lib/rss/parseRssItem";
import { sortFeedItemsByDateDesc } from "@/lib/rss/feedDates";
import { COMMUNICATION_SYNC_EVENT, getCommunicationSyncStorageKey } from "@/lib/integrations/communicationEvents";
import { useNavStore } from "@/lib/store/navStore";

/**
 * Wie viele Cloud-Eintraege in die Lagevorschau gehen.
 *
 * Zwei war zu wenig: MORA sagte „ich sehe zwei Sachen", und das klang
 * nach einer Auskunft ueber den Speicher, war aber eine Aussage ueber
 * diese Zeile. Zwanzig sind genug fuer einen Eindruck und wenig genug,
 * dass die Startseite nicht auf einen fremden Dienst wartet.
 *
 * Die vollstaendige Liste steht in „Meine Dateien" — dort ist der Ort,
 * an dem man sucht. Hier ist der Ort, an dem man sieht, dass es etwas
 * gibt.
 */
const CLOUD_VORSCHAU = 20;


export type MailPreviewItem = {
    id: string;
    subject: string;
    from: string;
    snippet?: string;
    date?: string;
};

export type CalendarPreviewItem = {
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
};

export type FeedPreviewItem = {
    id: string;
    sourceTitle: string;
    title: string;
    link?: string;
    published?: string;
    summary?: string;
    imageUrl?: string;
};

type CloudPreviewItem = {
    connectorId: string;
    connectorLabel: string;
    provider: string;
    itemId: string;
    itemName: string;
    itemKind: string;
    itemPath?: string;
};

type CommunicationLiveData = {
    mailPreview: MailPreviewItem[];
    calendarPreview: CalendarPreviewItem[];
    feedPreview: FeedPreviewItem[];
    cloudPreview: CloudPreviewItem[];
    isLoading: boolean;
    refresh: () => Promise<void>;
};

export function buildCommunicationContextMessage(
    mailPreview: MailPreviewItem[],
    calendarPreview: CalendarPreviewItem[],
    feedPreview: FeedPreviewItem[] = [],
    cloudPreview: CloudPreviewItem[] = []
): string | null {
    const mailLines = mailPreview
        .slice(0, 3)
        .map((item) => {
            const parts = [item.from, item.subject].filter(Boolean);
            const snippet = item.snippet?.trim();
            return snippet ? `- ${parts.join(" - ")} | ${snippet}` : `- ${parts.join(" - ")}`;
        });

    const calendarLines = calendarPreview
        .slice(0, 3)
        .map((item) => {
            const dateTime = [item.date, item.time].filter(Boolean).join(" ");
            const location = item.location?.trim() ? ` @ ${item.location.trim()}` : "";
            return `- ${dateTime || "Termin"} - ${item.title}${location}`;
        });

    const feedLines = feedPreview
        .slice(0, 5)
        .map((item) => {
            const summary = item.summary?.trim();
            return summary
                ? `- ${item.sourceTitle}: ${item.title} | ${summary}`
                : `- ${item.sourceTitle}: ${item.title}`;
        });

    const cloudLines = cloudPreview
        .slice(0, 6)
        .map((item) => `- ${item.connectorLabel} (${item.provider}): ${item.itemName}${item.itemPath ? ` | ${item.itemPath}` : ''}`);

    if (mailLines.length === 0 && calendarLines.length === 0 && feedLines.length === 0 && cloudLines.length === 0) {
        return null;
    }

    const sections: string[] = [
        "Lokaler Kommunikationskontext aus SAIMOR.",
        "Verwende ihn nur, wenn die Nutzerfrage Mail, Kalender, Feeds, Kommunikation oder aktuelle Signale betrifft. Erfinde nichts dazu.",
    ];

    if (mailLines.length > 0) {
        sections.push("Aktuelle Mail-Signale:");
        sections.push(...mailLines);
    }

    if (calendarLines.length > 0) {
        sections.push("Aktuelle Kalender-Signale:");
        sections.push(...calendarLines);
    }

    if (feedLines.length > 0) {
        sections.push("Aktuelle Feed-Signale:");
        sections.push(...feedLines);
    }

    if (cloudLines.length > 0) {
        sections.push("Aktuelle Cloud-Signale:");
        sections.push(...cloudLines);
    }

    return sections.join("\n");
}

function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

export function useCommunicationLiveData(autoLoad: boolean = true): CommunicationLiveData {
    const activeCompanyId = useNavStore((state) => state.activeCompanyId);
    const [mailPreview, setMailPreview] = useState<MailPreviewItem[]>([]);
    const [calendarPreview, setCalendarPreview] = useState<CalendarPreviewItem[]>([]);
    const [feedPreview, setFeedPreview] = useState<FeedPreviewItem[]>([]);
    const [cloudPreview, setCloudPreview] = useState<CloudPreviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(autoLoad);
    const hasLoadedRef = useRef(false);
    const inFlightRef = useRef<Promise<void> | null>(null);
    const lastBackgroundRefreshRef = useRef<number>(0);
    const lastVisibilitySyncRef = useRef<number>(0);
    const scopeVersionRef = useRef(0);

    useEffect(() => {
        scopeVersionRef.current += 1;
        inFlightRef.current = null;
        hasLoadedRef.current = false;
        setMailPreview([]);
        setCalendarPreview([]);
        setFeedPreview([]);
        setCloudPreview([]);
        if (autoLoad) setIsLoading(true);
    }, [activeCompanyId, autoLoad]);

    const refreshData = useCallback(async (options?: { background?: boolean }) => {
        const background = Boolean(options?.background);
        const now = Date.now();
        const scopeVersion = scopeVersionRef.current;

        if (background && hasLoadedRef.current && now - lastBackgroundRefreshRef.current < 1200) {
            return;
        }

        if (inFlightRef.current) {
            return inFlightRef.current;
        }

        const shouldShowLoading = !background || !hasLoadedRef.current;
        if (shouldShowLoading) {
            setIsLoading(true);
        }

        const request = (async () => {
            try {
                const start = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 14);
                const companyQuery = activeCompanyId
                    ? `company_id=${encodeURIComponent(activeCompanyId)}`
                    : "";
                const scopedQuery = companyQuery ? `?${companyQuery}` : "";
                const scopedTail = companyQuery ? `&${companyQuery}` : "";

                const [mailData, calendarData, feedData, myContentData] = await Promise.all([
                    coreGet(`/v3/mail/messages${scopedQuery}`, { isOptional: true }),
                    coreGet(
                        `/v3/calendar/events?start_date=${toIsoDate(start)}&end_date=${toIsoDate(end)}${scopedTail}`,
                        { isOptional: true }
                    ),
                    coreGet(`/v3/integrations/rss/items?limit=5${scopedTail}`, { isOptional: true }),
                    coreGet("/v3/users/me/content", { isOptional: true }),
                ]);

                const mailItems = normalizeList<any>(mailData, ["messages", "emails", "mail", "data"]);
                const calendarItems = normalizeList<any>(calendarData, ["events", "appointments", "calendar", "data"]);
                const feedItems = normalizeList<any>(feedData, ["items", "feeds", "data"]);

                if (scopeVersion !== scopeVersionRef.current) return;

                setMailPreview(
                    mailItems.slice(0, 3).map((item: any) => ({
                        id: item.id || item.message_id || item.subject || crypto.randomUUID(),
                        subject: item.subject || "Nachricht",
                        from: item.from_addr || item.from || "Unbekannt",
                        snippet: item.snippet || item.body_preview || "",
                        date: item.date || item.received_at || item.created_at,
                    }))
                );

                setCalendarPreview(
                    calendarItems.slice(0, 3).map((item: any) => ({
                        id: item.id || item.title || crypto.randomUUID(),
                        title: item.title || "Termin",
                        date: item.date || item.start_date || item.start,
                        time: item.time || item.start_time,
                        location: item.location,
                    }))
                );

                setFeedPreview(
                    sortFeedItemsByDateDesc(
                        feedItems.slice(0, 5).map((item: any) => {
                            const parsed = parseRssItem(item);
                            return {
                                id: parsed.id,
                                sourceTitle: parsed.sourceTitle,
                                title: parsed.title,
                                link: parsed.link,
                                published: parsed.published,
                                summary: parsed.summary,
                                imageUrl: parsed.imageUrl,
                            };
                        })
                    )
                );

                const cloudConnectors = Array.isArray(myContentData?.cloud_storage?.connectors)
                    ? myContentData.cloud_storage.connectors
                    : [];
                const activeConnectors = cloudConnectors
                    .filter((connector: any) => connector?.enabled && connector?.status === "configured" && connector?.id)
                    .slice(0, 3);

                if (activeConnectors.length === 0) {
                    setCloudPreview([]);
                } else {
                    const connectorResults = await Promise.all(
                        activeConnectors.map(async (connector: any) => {
                            const itemsPayload = await coreGet(
                                // Vorher stand hier fest `limit=2`. MORA meldete
                                // daraufhin zwei Dateien, auch wenn im Speicher
                                // hunderte lagen — eine Vorschau, die als
                                // Auskunft gelesen wurde.
                                `/v3/integrations/cloud/${connector.id}/items?limit=${CLOUD_VORSCHAU}`,
                                { isOptional: true }
                            );
                            const items = Array.isArray(itemsPayload?.items) ? itemsPayload.items : [];
                            return items.map((item: any) => ({
                                connectorId: String(connector.id),
                                connectorLabel: String(connector.label || connector.provider || "Cloud"),
                                provider: String(connector.provider || "cloud"),
                                itemId: String(item.id || item.name || crypto.randomUUID()),
                                itemName: String(item.name || "Element"),
                                itemKind: String(item.kind || "file"),
                                itemPath: typeof item.path === "string" ? item.path : undefined,
                            })) as CloudPreviewItem[];
                        })
                    );
                    if (scopeVersion !== scopeVersionRef.current) return;
                    setCloudPreview(connectorResults.flat().slice(0, 6));
                }
                hasLoadedRef.current = true;
                if (background) {
                    lastBackgroundRefreshRef.current = now;
                }
            } finally {
                if (scopeVersion === scopeVersionRef.current) {
                    inFlightRef.current = null;
                    if (shouldShowLoading) setIsLoading(false);
                }
            }
        })();

        inFlightRef.current = request;
        await request;
    }, [activeCompanyId]);

    const refresh = useCallback(async () => {
        await refreshData();
    }, [refreshData]);

    useEffect(() => {
        if (!autoLoad) return;
        void refreshData();
    }, [autoLoad, refreshData]);

    useEffect(() => {
        if (!autoLoad || typeof window === "undefined") return;

        const sync = () => {
            void refreshData({ background: true });
        };

        const onVisibilityChange = () => {
            if (typeof document === "undefined" || document.visibilityState !== "visible") return;
            const now = Date.now();
        const scopeVersion = scopeVersionRef.current;
            if (now - lastVisibilitySyncRef.current < 15000) return;
            lastVisibilitySyncRef.current = now;
            void refreshData({ background: true });
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === getCommunicationSyncStorageKey()) {
                void refreshData({ background: true });
            }
        };

        window.addEventListener(COMMUNICATION_SYNC_EVENT, sync as EventListener);
        window.addEventListener("storage", onStorage);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener(COMMUNICATION_SYNC_EVENT, sync as EventListener);
            window.removeEventListener("storage", onStorage);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [autoLoad, refreshData]);

    return useMemo(
        () => ({
            mailPreview,
            calendarPreview,
            feedPreview,
            cloudPreview,
            isLoading,
            refresh,
        }),
        [calendarPreview, cloudPreview, feedPreview, isLoading, mailPreview, refresh]
    );
}
