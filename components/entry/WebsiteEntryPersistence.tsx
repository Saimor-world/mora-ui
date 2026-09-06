'use client';

import { useEffect } from 'react';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { saveWebsiteEntryContext } from '@/lib/websiteEntryStorage';

const PRODUCT_TOUR_SESSION_KEY = 'saimor_product_tour_session';

export function WebsiteEntryPersistence({ context }: { context: WebsiteEntryContext | null }) {
    useEffect(() => {
        if (!context) return;

        saveWebsiteEntryContext(context);

        // A Security-Check entry already has its own guided first moment: the
        // dossier + Môra context. Do not stack the generic Home product tour on
        // top of that flow. This is intentionally session-scoped only; it does
        // not change the user's persisted tour preference and Settings can still
        // restart the tour explicitly later.
        try {
            window.sessionStorage.setItem(PRODUCT_TOUR_SESSION_KEY, '1');
        } catch {
            // Best effort only. Storage can be unavailable in hardened browsers.
        }
    }, [context]);

    return null;
}
