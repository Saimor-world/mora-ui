'use client';

import { useEffect, useRef } from 'react';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useNotificationStore } from '@/components/os/NotificationCenter';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMailPromptStore } from '@/lib/store/mailPromptStore';

const POLL_MS = 90_000;

function openMailPane(openPane: ReturnType<typeof usePaneStore.getState>['openPane']) {
    openPane({
        id: 'mail-main',
        type: 'mail',
        title: 'Mail',
        size: { width: 860, height: 640 },
        position: { x: 160, y: 120 },
    });
}

/**
 * MVP: detect new inbox mail via existing communication preview API and surface
 * a floating MÔRA toast + dock notification ("Soll ich die Mail lesen?").
 */
export function useMailArrivalPrompt(enabled = true) {
    const { overview } = useCommunicationSurface();
    const { mailPreview, refresh } = useCommunicationLiveData(false);
    const addNotification = useNotificationStore((s) => s.addNotification);
    const setMailPrompt = useMailPromptStore((s) => s.setPrompt);
    const openPane = usePaneStore((s) => s.openPane);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const initializedRef = useRef(false);

    const mailConfigured = Boolean(overview?.mail?.configured);

    useEffect(() => {
        if (!enabled || !mailConfigured) return;

        let cancelled = false;

        const poll = async () => {
            if (cancelled) return;
            await refresh();
        };

        void poll();
        const interval = window.setInterval(() => {
            void poll();
        }, POLL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [enabled, mailConfigured, refresh]);

    useEffect(() => {
        if (!enabled || !mailConfigured || mailPreview.length === 0) return;

        const latest = mailPreview[0];
        if (!latest?.id) return;

        if (!initializedRef.current) {
            mailPreview.forEach((item) => {
                if (item.id) seenIdsRef.current.add(item.id);
            });
            initializedRef.current = true;
            return;
        }

        const fresh = mailPreview.filter((item) => item.id && !seenIdsRef.current.has(item.id));
        if (fresh.length === 0) return;

        fresh.forEach((item) => {
            if (item.id) seenIdsRef.current.add(item.id);
        });

        const lead = fresh[0];
        const fromLabel = lead.from?.trim() || 'Unbekannt';
        const subjectLabel = lead.subject?.trim() || 'Neue Nachricht';

        setMailPrompt({
            id: lead.id,
            from: fromLabel,
            subject: subjectLabel,
        });

        addNotification({
            type: 'info',
            title: 'Neue E-Mail',
            message: `MÔRA: Neue Mail von ${fromLabel} — „${subjectLabel}". Soll ich die Mail lesen?`,
            source: 'mail',
            dismissable: true,
            autoDismiss: 0,
            actions: [
                {
                    label: 'Ja, öffnen',
                    variant: 'primary',
                    onClick: () => openMailPane(openPane),
                },
                {
                    label: 'Später',
                    variant: 'secondary',
                    onClick: () => undefined,
                },
            ],
        });
    }, [addNotification, enabled, mailConfigured, mailPreview, openPane, setMailPrompt]);
}
