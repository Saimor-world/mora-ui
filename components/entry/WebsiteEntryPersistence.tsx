'use client';

import { useEffect } from 'react';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { saveWebsiteEntryContext } from '@/lib/websiteEntryStorage';

export function WebsiteEntryPersistence({ context }: { context: WebsiteEntryContext | null }) {
    useEffect(() => {
        if (!context) return;
        saveWebsiteEntryContext(context);
    }, [context]);

    return null;
}
