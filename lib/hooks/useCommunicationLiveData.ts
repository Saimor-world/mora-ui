"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { coreGet } from "@/lib/api/coreClient";

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

            const mailItems = Array.isArray(mailData)
                ? mailData
                : Array.isArray(mailData?.items)
                    ? mailData.items
                    : [];

            const calendarItems = Array.isArray(calendarData)
                ? calendarData
                : Array.isArray(calendarData?.items)
                    ? calendarData.items
                    : [];

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
