"use client";

import { useEffect, useState } from 'react';
import {
    loadWebsiteEntryContext,
    WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT,
    type StoredWebsiteEntryContext,
} from '@/lib/websiteEntryStorage';

export function useWebsiteEntryContext() {
    const [context, setContext] = useState<StoredWebsiteEntryContext | null>(null);

    useEffect(() => {
        const refresh = () => setContext(loadWebsiteEntryContext());
        refresh();

        window.addEventListener('storage', refresh);
        window.addEventListener(WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT, refresh);
        return () => {
            window.removeEventListener('storage', refresh);
            window.removeEventListener(WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT, refresh);
        };
    }, []);

    return context;
}
