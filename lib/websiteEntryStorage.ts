import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

export const WEBSITE_ENTRY_CONTEXT_STORAGE_KEY = 'saimor_website_entry_context';
export const WEBSITE_ENTRY_LEADS_STORAGE_KEY = 'saimor_website_entry_leads';
export const WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT = 'saimor:website-entry-context-updated';
export const WEBSITE_ENTRY_SESSION_KIND_KEY = 'saimor_session_kind';
export const WEBSITE_ENTRY_PREVIEW_SESSION_KIND = 'website_entry_preview';

export type StoredWebsiteEntryContext = WebsiteEntryContext & {
    storedAt?: string;
    openOnHome?: boolean;
};

export function saveWebsiteEntryContext(context: WebsiteEntryContext, options?: { openOnHome?: boolean }) {
    if (typeof window === 'undefined') return;
    try {
        const next = {
            ...context,
            storedAt: new Date().toISOString(),
            openOnHome: Boolean(options?.openOnHome),
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

export function markWebsiteEntryContextForHomeOpen(context: WebsiteEntryContext) {
    saveWebsiteEntryContext(context, { openOnHome: true });
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

        // Auto-expire stale entry contexts older than 2 hours (120 minutes)
        const storedAt = parsed.storedAt ? new Date(parsed.storedAt).getTime() : 0;
        if (storedAt > 0 && Date.now() - storedAt >= 1000 * 60 * 60 * 2) {
            window.localStorage.removeItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY);
            return null;
        }

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

export function clearWebsiteEntryActiveContext() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY);
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
            const key = window.localStorage.key(i);
            if (key?.startsWith('saimor_website_entry_auto_opened_')) {
                window.localStorage.removeItem(key);
            }
        }
        window.dispatchEvent(new Event(WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT));
    } catch {
        // Best-effort cleanup only.
    }
}

export function markWebsiteEntryPreviewSession() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(WEBSITE_ENTRY_SESSION_KIND_KEY, WEBSITE_ENTRY_PREVIEW_SESSION_KIND);
    } catch {
        // Best-effort marker only. Core session remains the source of truth.
    }
}

export function clearWebsiteEntryPreviewSessionMarker() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(WEBSITE_ENTRY_SESSION_KIND_KEY);
    } catch {
        // Best-effort cleanup only.
    }
}

export function isWebsiteEntryPreviewSession() {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(WEBSITE_ENTRY_SESSION_KIND_KEY) === WEBSITE_ENTRY_PREVIEW_SESSION_KIND;
    } catch {
        return false;
    }
}

export function consumeWebsiteEntryHomeOpenFlag(context: StoredWebsiteEntryContext) {
    if (typeof window === 'undefined') return;
    try {
        const next = {
            ...context,
            openOnHome: false,
            storedAt: context.storedAt || new Date().toISOString(),
        };
        window.localStorage.setItem(
            WEBSITE_ENTRY_CONTEXT_STORAGE_KEY,
            JSON.stringify(next)
        );
        window.dispatchEvent(new Event(WEBSITE_ENTRY_CONTEXT_UPDATED_EVENT));
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
