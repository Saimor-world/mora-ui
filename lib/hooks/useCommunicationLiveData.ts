"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type CommunicationLiveData = {
    mailPreview: MailPreviewItem[];
    calendarPreview: CalendarPreviewItem[];
    isLoading: boolean;
    refresh: () => Promise<void>;
};

export function buildCommunicationContextMessage(
    mailPreview: MailPreviewItem[],
    calendarPreview: CalendarPreviewItem[]
): string | null {
    const mailLines = mailPreview
        .slice(0, 3)
        .map((item) => {
            const parts = [item.from, item.subject].filter(Boolean);
            const snippet = item.snippet?.trim();
            return snippet ? `- ${parts.join(" — ")} | ${snippet}` : `- ${parts.join(" — ")}`;
        });

    const calendarLines = calendarPreview
        .slice(0, 3)
        .map((item) => {
            const dateTime = [item.date, item.time].filter(Boolean).join(" ");
            const location = item.location?.trim() ? ` @ ${item.location.trim()}` : "";
            return `- ${dateTime || "Termin"} — ${item.title}${location}`;
        });

    if (mailLines.length === 0 && calendarLines.length === 0) {
        return null;
    }

    const sections: string[] = [
        "Lokaler Kommunikationskontext aus SAIMOR.",
        "Verwende ihn nur, wenn die Nutzerfrage Mail, Kalender, Kommunikation oder aktuelle Signale betrifft. Erfinde nichts dazu.",
    ];

    if (mailLines.length > 0) {
        sections.push("Aktuelle Mail-Signale:");
        sections.push(...mailLines);
    }

    if (calendarLines.length > 0) {
        sections.push("Aktuelle Kalender-Signale:");
        sections.push(...calendarLines);
    }

    return sections.join("\n");
}

function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

export function useCommunicationLiveData(autoLoad: boolean = true): CommunicationLiveData {
    const [mailPreview, setMailPreview] = useState<MailPreviewItem[]>([]);
    const [calendarPreview, setCalendarPreview] = useState<CalendarPreviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(autoLoad);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 14);

            const [mailData, calendarData] = await Promise.all([
                coreGet("/v3/mail/messages", { isOptional: true }),
                coreGet(
                    `/v3/calendar/events?start_date=${toIsoDate(start)}&end_date=${toIsoDate(end)}`,
                    { isOptional: true }
                ),
            ]);

            const mailItems = normalizeList<any>(mailData, ["messages", "emails", "mail", "data"]);
            const calendarItems = normalizeList<any>(calendarData, ["events", "appointments", "calendar", "data"]);

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
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!autoLoad) return;
        void refresh();
    }, [autoLoad, refresh]);

    useEffect(() => {
        if (!autoLoad || typeof window === "undefined") return;

        const sync = () => {
            void refresh();
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === getCommunicationSyncStorageKey()) {
                void refresh();
            }
        };

        window.addEventListener(COMMUNICATION_SYNC_EVENT, sync as EventListener);
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", sync);

        return () => {
            window.removeEventListener(COMMUNICATION_SYNC_EVENT, sync as EventListener);
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", sync);
        };
    }, [autoLoad, refresh]);

    return useMemo(
        () => ({
            mailPreview,
            calendarPreview,
            isLoading,
            refresh,
        }),
        [calendarPreview, isLoading, mailPreview, refresh]
    );
}
