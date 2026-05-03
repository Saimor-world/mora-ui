import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

export const WEBSITE_ENTRY_CONTEXT_STORAGE_KEY = 'saimor_website_entry_context';
export const WEBSITE_ENTRY_LEADS_STORAGE_KEY = 'saimor_website_entry_leads';
export const WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT = 'saimor:website-entry-context-updated';

export type StoredWebsiteEntryContext = WebsiteEntryContext & { storedAt?: string };

export function saveWebsiteEntryContext(context: WebsiteEntryContext) {
    if (typeof window === 'undefined') return;
    try {
        const next = {
            ...context,
            storedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(
            WEBSITE_ENTRY_CONTEXT_STORAGE_KEY,
            JSON.stringify(next)
        );
        saveWebsiteEntryLead(next);
        window.dispatchEvent(new Event(WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT));
    } catch {
        // Storage can be unavailable in hardened browsers; the entry page still renders.
    }
}

export function loadWebsiteEntryContext(): StoredWebsiteEntryContext | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.companyName !== 'string' || typeof parsed.title !== 'string') return null;
        if (!Array.isArray(parsed.rooms) || !Array.isArray(parsed.documents) || !Array.isArray(parsed.tasks)) return null;
        return parsed as StoredWebsiteEntryContext;
    } catch {
        return null;
    }
}

export function clearWebsiteEntryContext() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY);
    } catch {
        // Best-effort cleanup only.
    }
}

export function loadWebsiteEntryLeads(): StoredWebsiteEntryContext[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(WEBSITE_ENTRY_LEADS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((item) => item && typeof item === 'object' && typeof item.companyName === 'string' && typeof item.title === 'string')
            .slice(0, 25) as StoredWebsiteEntryContext[];
    } catch {
        return [];
    }
}

function saveWebsiteEntryLead(context: StoredWebsiteEntryContext) {
    const existing = loadWebsiteEntryLeads();
    const withoutCurrent = existing.filter((item) => item.id !== context.id);
    const next = [context, ...withoutCurrent].slice(0, 25);
    window.localStorage.setItem(WEBSITE_ENTRY_LEADS_STORAGE_KEY, JSON.stringify(next));
}
