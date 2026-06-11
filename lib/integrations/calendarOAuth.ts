'use client';

export const CALENDAR_OAUTH_MESSAGE = 'saimor:calendar-oauth';
export const CLOUD_OAUTH_MESSAGE = 'saimor:cloud-oauth';
export const GOOGLE_CONNECT_MESSAGE = 'saimor:google-connect';
const DEFAULT_POPUP_NAME = 'saimor-calendar-connect';
const DEFAULT_CLOUD_POPUP_NAME = 'saimor-cloud-connect';
const DEFAULT_CLOUD_DIRECT_POPUP_NAME = 'saimor-cloud-direct-connect';
const DEFAULT_GOOGLE_CONNECT_POPUP_NAME = 'saimor-google-connect';

export const getCalendarOAuthReturnTo = () => {
    if (typeof window === 'undefined') return '/oauth/calendar/callback';
    return `${window.location.origin}/oauth/calendar/callback`;
};

export type CalendarOAuthResult =
    | { ok: true; provider?: string; status?: string }
    | { ok: false; reason: 'blocked' | 'closed' | 'timeout' };

export type DirectCloudProvider = 'nextcloud' | 'extcloud';

export const getCloudOAuthReturnTo = () => {
    if (typeof window === 'undefined') return '/oauth/cloud/callback';
    return `${window.location.origin}/oauth/cloud/callback`;
};

async function openOAuthPopup(
    authUrl: string,
    popupName: string,
    messageType: string
): Promise<CalendarOAuthResult> {
    if (typeof window === 'undefined') {
        return { ok: false, reason: 'blocked' };
    }

    const width = 620;
    const height = 760;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
        authUrl,
        popupName,
        `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
        return { ok: false, reason: 'blocked' };
    }

    popup.focus();

    return new Promise<CalendarOAuthResult>((resolve) => {
        let settled = false;

        const cleanup = () => {
            window.removeEventListener('message', handleMessage);
            window.clearInterval(closePoll);
            window.clearTimeout(timeout);
        };

        const finish = (result: CalendarOAuthResult) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (!data || data.type !== messageType) return;
            finish({
                ok: true,
                provider: data.provider,
                status: data.status,
            });
        };

        const closePoll = window.setInterval(() => {
            if (popup.closed) {
                finish({ ok: false, reason: 'closed' });
            }
        }, 500);

        const timeout = window.setTimeout(() => {
            try {
                popup.close();
            } catch {
                // noop
            }
            finish({ ok: false, reason: 'timeout' });
        }, 180000);

        window.addEventListener('message', handleMessage);
    });
}

export async function openCalendarOAuthPopup(authUrl: string): Promise<CalendarOAuthResult> {
    return openOAuthPopup(authUrl, DEFAULT_POPUP_NAME, CALENDAR_OAUTH_MESSAGE);
}

export async function openCloudOAuthPopup(authUrl: string): Promise<CalendarOAuthResult> {
    return openOAuthPopup(authUrl, DEFAULT_CLOUD_POPUP_NAME, CLOUD_OAUTH_MESSAGE);
}

export const getGoogleConnectReturnTo = () => {
    if (typeof window === 'undefined') return '/oauth/google/callback';
    return `${window.location.origin}/oauth/google/callback`;
};

export async function openGoogleConnectPopup(authUrl: string): Promise<CalendarOAuthResult> {
    return openOAuthPopup(authUrl, DEFAULT_GOOGLE_CONNECT_POPUP_NAME, GOOGLE_CONNECT_MESSAGE);
}

export async function openDirectCloudConnectPopup(params: {
    provider: DirectCloudProvider;
    label?: string;
    baseUrl?: string;
    username?: string;
    rootPath?: string;
}): Promise<CalendarOAuthResult> {
    if (typeof window === 'undefined') {
        return { ok: false, reason: 'blocked' };
    }

    const url = new URL('/oauth/cloud/direct', window.location.origin);
    url.searchParams.set('provider', params.provider);
    if (params.label) url.searchParams.set('label', params.label);
    if (params.baseUrl) url.searchParams.set('base_url', params.baseUrl);
    if (params.username) url.searchParams.set('username', params.username);
    if (params.rootPath) url.searchParams.set('root_path', params.rootPath);

    return openOAuthPopup(url.toString(), DEFAULT_CLOUD_DIRECT_POPUP_NAME, CLOUD_OAUTH_MESSAGE);
}
