"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { normalizeList } from "@/lib/api/http";
import { COMMUNICATION_SYNC_EVENT, getCommunicationSyncStorageKey } from "@/lib/integrations/communicationEvents";

type MailPreviewItem = {
    id: string;
    subject: string;
    from: string;
    snippet?: string;
    date?: string;
};

type CalendarPreviewItem = {
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
};

type FeedPreviewItem = {
    id: string;
    sourceTitle: string;
    title: string;
    link?: string;
    published?: string;
    summary?: string;
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
    const [mailPreview, setMailPreview] = useState<MailPreviewItem[]>([]);
    const [calendarPreview, setCalendarPreview] = useState<CalendarPreviewItem[]>([]);
    const [feedPreview, setFeedPreview] = useState<FeedPreviewItem[]>([]);
    const [cloudPreview, setCloudPreview] = useState<CloudPreviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(autoLoad);
    const hasLoadedRef = useRef(false);
    const inFlightRef = useRef<Promise<void> | null>(null);
    const lastBackgroundRefreshRef = useRef<number>(0);
    const lastVisibilitySyncRef = useRef<number>(0);

    const refreshData = useCallback(async (options?: { background?: boolean }) => {
        const background = Boolean(options?.background);
        const now = Date.now();

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

                const [mailData, calendarData, feedData, myContentData] = await Promise.all([
                    coreGet("/v3/mail/messages", { isOptional: true }),
                    coreGet(
                        `/v3/calendar/events?start_date=${toIsoDate(start)}&end_date=${toIsoDate(end)}`,
                        { isOptional: true }
                    ),
                    coreGet("/v3/integrations/rss/items?limit=5", { isOptional: true }),
                    coreGet("/v3/users/me/content", { isOptional: true }),
                ]);

                const mailItems = normalizeList<any>(mailData, ["messages", "emails", "mail", "data"]);
                const calendarItems = normalizeList<any>(calendarData, ["events", "appointments", "calendar", "data"]);
                const feedItems = normalizeList<any>(feedData, ["items", "feeds", "data"]);

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
                    feedItems.slice(0, 5).map((item: any) => ({
                        id: item.id || item.link || item.title || crypto.randomUUID(),
                        sourceTitle: item.source_title || item.sourceTitle || "Feed",
                        title: item.title || "Feed-Eintrag",
                        link: item.link,
                        published: item.published,
                        summary: item.summary || item.snippet || "",
                    }))
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
                                `/v3/integrations/cloud/${connector.id}/items?limit=2`,
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
                    setCloudPreview(connectorResults.flat().slice(0, 6));
                }
                hasLoadedRef.current = true;
                if (background) {
                    lastBackgroundRefreshRef.current = now;
                }
            } finally {
                inFlightRef.current = null;
                if (shouldShowLoading) {
                    setIsLoading(false);
                }
            }
        })();

        inFlightRef.current = request;
        await request;
    }, []);

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
