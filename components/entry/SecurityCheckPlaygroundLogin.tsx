'use client';

import { useEffect, useRef } from 'react';
import { corePost } from '@/lib/api/coreClient';
import { useNavStore } from '@/lib/store/navStore';
import { saveWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

interface Props {
    context: WebsiteEntryContext;
    onReady: () => void;
    onError: () => void;
}

/**
 * Silently authenticates the visitor as a playground guest.
 * Uses /v3/playground/guest-session (shared playground tenant — real data, live OS).
 * Saves websiteEntryContext to localStorage, sets activeMode = 'visitor'.
 * Calls onReady on success, onError on failure.
 * Renders nothing — invisible auth layer that runs in background while visitor reads.
 */
export function SecurityCheckPlaygroundLogin({ context, onReady, onError }: Props) {
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        async function run() {
            try {
                let visitorId = typeof window !== 'undefined'
                    ? localStorage.getItem('saimor_visitor_id')
                    : null;
                if (!visitorId) {
                    visitorId = `visitor_${Math.random().toString(36).slice(2, 10)}`;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('saimor_visitor_id', visitorId);
                    }
                }

                const sessionSuffix = Math.random().toString(36).slice(2, 8);
                const domain = context.domain ?? 'demo';
                const email  = `visitor-${sessionSuffix}@${domain}`;

                // Creates/joins shared playground tenant, sets mora_public_token cookie
                await corePost('/v3/playground/guest-session', {
                    email,
                    name: context.companyName,
                    visitor_id: visitorId,
                });

                // Persist scan context so HomeSurface can read it on /home
                saveWebsiteEntryContext(context, { openOnHome: true });

                // Mark this session as visitor (identity from scan context — no API company)
                useNavStore.getState().setActiveMode('visitor');

                onReady();
            } catch {
                onError();
            }
        }

        void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
