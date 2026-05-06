'use client';

import { useMemo } from 'react';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import { useLocalTruthBridge } from '@/lib/hooks/useLocalTruthBridge';

const DEFAULT_LOCAL_UI = 'http://127.0.0.1:3000/home';
const REMOTE_LOCAL_UI_PLACEHOLDER = 'about:saimor-local-bridge';
const DEFAULT_CONNECT_SURFACE = 'about:saimor-connect';
const LOCAL_GOOGLE_CALLBACK = 'http://127.0.0.1:8081/v3/integrations/calendar/callback';

const MAIL_SETUP_DETAIL = 'Setze im Core echte Mail-Zugangsdaten: EMAIL_IMAP_HOST / EMAIL_IMAP_USER / EMAIL_IMAP_PASSWORD sowie SMTP_HOST / SMTP_USER / SMTP_PASSWORD.';
const CALENDAR_OAUTH_DETAIL = `Setze Google Calendar OAuth tenantweit in SAIMOR oder als Core-Fallback: GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET / GOOGLE_CALENDAR_REDIRECT_URL=${LOCAL_GOOGLE_CALLBACK}.`;

const providerMailUrl = (provider?: string) => {
    switch ((provider || '').toLowerCase()) {
        case 'outlook':
        case 'office365':
            return 'https://outlook.office.com/mail/';
        case 'gmail':
        default:
            return 'https://mail.google.com/';
    }
};

const providerCalendarUrl = (provider?: string) => {
    switch ((provider || '').toLowerCase()) {
        case 'outlook':
        case 'office365':
            return 'https://outlook.office.com/calendar/';
        case 'gmail':
        default:
            return 'https://calendar.google.com/';
    }
};

export function useCommunicationSurface(autoLoad: boolean = true) {
    const integrations = useIntegrationsOverview(autoLoad);
    const localTruthBridge = useLocalTruthBridge(integrations.overview);

    const summary = useMemo(() => {
        const overview = integrations.overview;
        const browserPermission = integrations.browserBridge.permission;
        const localTruthUrl =
            localTruthBridge.selectedUiUrl
            || (localTruthBridge.isLocalSurface ? overview?.runtime?.surfaces?.local_truth : null)
            || (localTruthBridge.isLocalSurface ? DEFAULT_LOCAL_UI : REMOTE_LOCAL_UI_PLACEHOLDER);
        const connectSurfaceUrl =
            overview?.runtime?.surfaces?.connect_surface
            || DEFAULT_CONNECT_SURFACE;

        const browserStatusLabel =
            browserPermission === 'granted'
                ? 'Browser bereit'
                : browserPermission === 'denied'
                    ? 'Browser blockiert'
                    : browserPermission === 'default'
                        ? 'Browser freigeben'
                        : 'Browser lokal';

        const ownerManageable = Boolean(overview?.capabilities?.owner_manageable);
        const mailConfigured = Boolean(overview?.mail?.configured);
        const calendarConfigured = Boolean(overview?.calendar?.configured);
        const mailLocalMode = Boolean(overview?.capabilities?.mail_local_mode || overview?.mail?.status === 'local');
        const calendarOauthEnabled = Boolean(overview?.capabilities?.calendar_oauth_enabled);
        const mailSetupDetail = typeof overview?.setup?.mail?.detail === 'string' ? overview.setup.mail.detail : null;
        const calendarMissingEnv = Array.isArray(overview?.setup?.calendar?.missing_env) ? overview.setup.calendar.missing_env : [];
        const calendarConfigSource = typeof overview?.setup?.calendar?.source === 'string' ? overview.setup.calendar.source : null;
        const calendarRedirectUrl = typeof overview?.setup?.calendar?.redirect_url === 'string'
            ? overview.setup.calendar.redirect_url
            : LOCAL_GOOGLE_CALLBACK;
        const calendarSetupDetail = calendarMissingEnv.length > 0
            ? `${calendarConfigSource === 'tenant' ? 'Im Tenant fehlen' : 'Im Core fehlen'}: ${calendarMissingEnv.join(' / ')}. Redirect: ${calendarRedirectUrl}.`
            : CALENDAR_OAUTH_DETAIL;

        const mailStatusLabel = mailConfigured
            ? (overview?.mail?.email || 'Mail verbunden')
            : mailLocalMode
                ? 'Lokaler Postfachmodus'
                : 'Mail nicht eingerichtet';

        const calendarStatusLabel = calendarConfigured
            ? (overview?.calendar?.email || 'Kalender verbunden')
            : !calendarOauthEnabled
                ? 'OAuth für Tenant fehlt'
                : 'Kalender nicht eingerichtet';

        const localTruthStatusLabel =
            localTruthBridge.state === 'ready'
                ? 'Local Truth bereit'
                : localTruthBridge.state === 'core_only'
                    ? 'Core lokal bereit'
                    : localTruthBridge.state === 'ui_only'
                        ? 'UI lokal bereit'
                        : localTruthBridge.state === 'checking'
                            ? 'Localhost pruefen'
                            : localTruthBridge.isLocalSurface ? 'Local Truth starten' : 'Desktop Bridge getrennt';

        const localTruthUiOpenable =
            localTruthBridge.state === 'ready'
            || localTruthBridge.state === 'ui_only';
        const localTruthReachable =
            localTruthUiOpenable
            || localTruthBridge.state === 'core_only';

        return {
            browserStatusLabel,
            mailStatusLabel,
            calendarStatusLabel,
            localTruthStatusLabel,
            mailStatusDetail:
                mailConfigured
                    ? 'Das verbundene Postfach wird direkt im OS gelesen und von Mora mitverwendet.'
                    : mailLocalMode
                        ? 'Der Server laeuft im lokalen Mailmodus. Externe IMAP-Synchronisation ist hier abgeschaltet.'
                        : (mailSetupDetail || MAIL_SETUP_DETAIL),
            calendarStatusDetail:
                calendarConfigured
                    ? 'Der verbundene Kalender wird im OS gelesen und für Home, Kalender und Mora genutzt.'
                    : !calendarOauthEnabled
                        ? (ownerManageable
                            ? calendarSetupDetail
                            : `Google-OAuth muss tenantweit zuerst von einem Eigentümer eingerichtet werden. Redirect: ${calendarRedirectUrl}.`)
                        : 'Starte jetzt den Google-OAuth-Flow, damit echte Kalenderdaten im OS erscheinen.',
            browserConnectable: integrations.browserBridge.supported,
            browserPermission,
            browserPermissionSummary:
                browserPermission === 'granted'
                    ? 'Benachrichtigungen freigegeben'
                    : browserPermission === 'denied'
                        ? 'Benachrichtigungen blockiert'
                        : browserPermission === 'default'
                            ? 'Benachrichtigungen noch nicht freigegeben'
                            : 'Browser-Freigaben hier nicht verfügbar',
            mailConfigured,
            calendarConfigured,
            mailLocalMode,
            calendarOauthEnabled,
            ownerManageable,
            localTruthReachable,
            localTruthUiOpenable,
            connectSurfaceUrl,
            localTruthUrl,
            providerMailUrl: providerMailUrl(overview?.mail?.provider),
            providerCalendarUrl: providerCalendarUrl(overview?.calendar?.provider),
        };
    }, [integrations.browserBridge.permission, integrations.browserBridge.supported, integrations.overview, localTruthBridge.selectedUiUrl, localTruthBridge.state]);

    return {
        ...integrations,
        localTruthBridge,
        summary,
    };
}

type CommunicationContextSummary = ReturnType<typeof useCommunicationSurface>['summary'];
type CommunicationContextOverview = ReturnType<typeof useCommunicationSurface>['overview'];

interface CommunicationPreviewItem {
    subject?: string;
    from?: string;
    snippet?: string;
    title?: string;
    date?: string;
    time?: string;
    location?: string;
}

interface FeedPreviewItem {
    sourceTitle?: string;
    source_title?: string;
    title?: string;
    summary?: string;
    published?: string;
}

interface CloudPreviewItem {
    connectorLabel?: string;
    provider?: string;
    itemName?: string;
    itemPath?: string;
}

export function buildCommunicationOperationalContextMessage(
    summary: CommunicationContextSummary,
    overview: CommunicationContextOverview,
    mailPreview: CommunicationPreviewItem[],
    calendarPreview: CommunicationPreviewItem[],
    feedPreview: FeedPreviewItem[] = [],
    cloudPreview: CloudPreviewItem[] = []
): string | null {
    const sections: string[] = [
        'Lokaler Kommunikationskontext aus SAIMOR.',
        'Nutze ihn nur für Mail, Kalender, Kommunikation, Priorisierung oder aktuelle Signale.',
    ];

    const hasMailData = mailPreview.length > 0;
    const hasCalendarData = calendarPreview.length > 0;
    const hasFeedData = feedPreview.length > 0;
    const hasCloudData = cloudPreview.length > 0;

    sections.push('Kommunikationsstatus:');
    sections.push(`- Mail: ${summary.mailStatusLabel}${summary.mailStatusDetail ? ` | ${summary.mailStatusDetail}` : ''}`);
    sections.push(`- Kalender: ${summary.calendarStatusLabel}${summary.calendarStatusDetail ? ` | ${summary.calendarStatusDetail}` : ''}`);
    sections.push(`- Feeds: ${overview?.rss?.configured ? `${overview.rss.count || 0} Quellen verbunden` : 'Noch keine RSS/Atom-Quellen verbunden'}`);
    sections.push(`- Cloud: ${overview?.cloud_storage?.configured ? `${overview.cloud_storage.count || 0} Quellen verbunden` : 'Noch keine persoenliche Cloud-Quelle verbunden'}`);
    sections.push(`- Browser: ${summary.browserStatusLabel}${summary.browserPermissionSummary ? ` | ${summary.browserPermissionSummary}` : ''}`);
    sections.push(`- Local Truth: ${summary.localTruthStatusLabel}`);

    if (hasMailData) {
        sections.push('Aktuelle Mail-Signale:');
        mailPreview.slice(0, 3).forEach((item) => {
            const parts = [item.from, item.subject].filter(Boolean);
            const snippet = item.snippet?.trim();
            sections.push(snippet ? `- ${parts.join(' | ')} | ${snippet}` : `- ${parts.join(' | ')}`);
        });
    } else if (!summary.mailConfigured) {
        sections.push('- Mail hat derzeit keine Live-Daten, weil die Verbindung noch nicht eingerichtet ist.');
    } else {
        sections.push('- Mail ist verbunden, aber es liegen aktuell keine frischen Nachrichten im Vorschauzeitraum vor.');
    }

    if (hasCalendarData) {
        sections.push('Aktuelle Kalender-Signale:');
        calendarPreview.slice(0, 3).forEach((item) => {
            const dateTime = [item.date, item.time].filter(Boolean).join(' ');
            const location = item.location?.trim() ? ` @ ${item.location.trim()}` : '';
            sections.push(`- ${dateTime || 'Termin'} | ${item.title || 'Termin'}${location}`);
        });
    } else if (!summary.calendarConfigured) {
        sections.push('- Kalender hat derzeit keine Live-Daten, weil OAuth oder die Verbindung noch nicht eingerichtet ist.');
    } else {
        sections.push('- Kalender ist verbunden, aber es liegen aktuell keine Termine im Vorschauzeitraum vor.');
    }

    if (hasFeedData) {
        sections.push('Aktuelle Feed-Signale:');
        feedPreview.slice(0, 5).forEach((item) => {
            const source = item.sourceTitle || item.source_title || 'Feed';
            const summaryText = item.summary?.trim();
            sections.push(summaryText ? `- ${source} | ${item.title || 'Feed-Eintrag'} | ${summaryText}` : `- ${source} | ${item.title || 'Feed-Eintrag'}`);
        });
    } else if (!overview?.rss?.configured) {
        sections.push('- Feeds haben derzeit keine Live-Daten, weil noch keine RSS/Atom-Quellen verbunden sind.');
    }

    if (hasCloudData) {
        sections.push('Aktuelle Cloud-Signale:');
        cloudPreview.slice(0, 6).forEach((item) => {
            const source = item.connectorLabel || item.provider || 'Cloud';
            const label = item.itemName || 'Element';
            sections.push(item.itemPath ? `- ${source} | ${label} | ${item.itemPath}` : `- ${source} | ${label}`);
        });
    } else if (!overview?.cloud_storage?.configured) {
        sections.push('- Cloud hat derzeit keine Live-Daten, weil noch keine persoenliche Cloud-Quelle verbunden ist.');
    }

    if (overview?.setup?.calendar?.missing_env?.length) {
        sections.push(`- Kalender-OAuth fehlt im Core noch bei: ${overview.setup.calendar.missing_env.join(', ')}.`);
    }

    if (!summary.ownerManageable && !summary.calendarOauthEnabled) {
        sections.push('- Die tenantweite Google-OAuth-App ist noch nicht eingerichtet; das muss ein Eigentümer zuerst freischalten.');
    }

    return sections.join('\n');
}
