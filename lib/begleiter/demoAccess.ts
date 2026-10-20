import { isWebsiteEntryPreviewSession } from '@/lib/websiteEntryStorage';

/** Query flag that opts a Begleiter session into the canned demo inbox. */
export const BEGLEITER_DEMO_QUERY = 'demo';

export function isLocalBegleiterHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isPreviewCompanionSession(activeMode?: string | null): boolean {
    if (isWebsiteEntryPreviewSession()) return true;
    return activeMode === 'visitor' || activeMode === 'private_preview';
}

/**
 * Demo inbox is for captures, local review, and website-entry preview on the
 * phone Companion. It never changes Begleiter chrome — only whether canned
 * proposals appear instead of a paired device.
 */
export function isBegleiterDemoAllowed(
    searchParams: { get: (key: string) => string | null },
    env: {
        hostname: string;
        previewSession?: boolean;
        activeMode?: string | null;
    } = {
        hostname: typeof window !== 'undefined' ? window.location.hostname : '',
        previewSession: typeof window !== 'undefined' ? isWebsiteEntryPreviewSession() : false,
        activeMode: typeof window !== 'undefined' ? window.localStorage.getItem('saimor_active_mode') : null,
    },
): boolean {
    if (searchParams.get(BEGLEITER_DEMO_QUERY) !== '1') return false;
    if (isLocalBegleiterHost(env.hostname)) return true;
    if (env.previewSession) return true;
    return env.activeMode === 'visitor' || env.activeMode === 'private_preview';
}
