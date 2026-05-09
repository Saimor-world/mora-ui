'use client';

import { useEffect } from 'react';
import { CALENDAR_OAUTH_MESSAGE } from '@/lib/integrations/calendarOAuth';

interface CalendarOAuthCallbackClientProps {
    provider?: string;
    status?: string;
}

export function CalendarOAuthCallbackClient({
    provider,
    status,
}: CalendarOAuthCallbackClientProps) {
    useEffect(() => {
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                    {
                        type: CALENDAR_OAUTH_MESSAGE,
                        provider,
                        status,
                    },
                    window.location.origin
                );
            }
        } finally {
            window.setTimeout(() => {
                window.close();
            }, 250);
        }
    }, [provider, status]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#04110e] text-emerald-50">
            <div className="rounded-3xl border border-emerald-500/15 bg-black/30 px-8 py-6 text-center shadow-[0_0_80px_rgba(0,180,120,0.08)]">
                <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-400/70">
                    SAIMÔR OS
                </div>
                <h1 className="mt-3 text-xl font-medium">
                    Kalender wird verbunden
                </h1>
                <p className="mt-2 text-sm text-emerald-50/60">
                    Das Fenster schliesst sich automatisch.
                </p>
            </div>
        </main>
    );
}

export default CalendarOAuthCallbackClient;
