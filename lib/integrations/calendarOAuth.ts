'use client';

export const CALENDAR_OAUTH_MESSAGE = 'saimor:calendar-oauth';
const DEFAULT_POPUP_NAME = 'saimor-calendar-connect';

export const getCalendarOAuthReturnTo = () => {
    if (typeof window === 'undefined') return '/oauth/calendar/callback';
    return `${window.location.origin}/oauth/calendar/callback`;
};

export type CalendarOAuthResult =
    | { ok: true; provider?: string; status?: string }
    | { ok: false; reason: 'blocked' | 'closed' | 'timeout' };

export async function openCalendarOAuthPopup(authUrl: string): Promise<CalendarOAuthResult> {
    if (typeof window === 'undefined') {
        return { ok: false, reason: 'blocked' };
    }

    const width = 620;
    const height = 760;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
        authUrl,
        DEFAULT_POPUP_NAME,
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
            if (!data || data.type !== CALENDAR_OAUTH_MESSAGE) return;
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
