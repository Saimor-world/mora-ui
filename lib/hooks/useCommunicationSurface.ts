'use client';

import { useMemo } from 'react';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import { useLocalTruthBridge } from '@/lib/hooks/useLocalTruthBridge';

const DEFAULT_LOCAL_UI = 'http://127.0.0.1:3000/home';
const DEFAULT_CONNECT_SURFACE = 'about:saimor-connect';
const LOCAL_GOOGLE_CALLBACK = 'http://127.0.0.1:8081/v1/auth/google/callback';

const MAIL_SETUP_DETAIL = 'Setze im Core echte Mail-Zugangsdaten: EMAIL_IMAP_HOST / EMAIL_IMAP_USER / EMAIL_IMAP_PASSWORD sowie SMTP_HOST / SMTP_USER / SMTP_PASSWORD.';
const CALENDAR_OAUTH_DETAIL = `Setze im Core GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET / GOOGLE_CALENDAR_REDIRECT_URL=${LOCAL_GOOGLE_CALLBACK}.`;

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
            || overview?.runtime?.surfaces?.local_truth
            || DEFAULT_LOCAL_UI;
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

        const mailStatusLabel = mailConfigured
            ? (overview?.mail?.email || 'Mail verbunden')
            : !ownerManageable
                ? 'Nur fuer Eigentuemer'
                : mailLocalMode
                    ? 'Lokaler Postfachmodus'
                    : 'Mail nicht eingerichtet';

        const calendarStatusLabel = calendarConfigured
            ? (overview?.calendar?.email || 'Kalender verbunden')
            : !ownerManageable
                ? 'Nur fuer Eigentuemer'
                : !calendarOauthEnabled
                    ? 'OAuth im Core fehlt'
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
                            : 'Local Truth starten';

        return {
            browserStatusLabel,
            mailStatusLabel,
            calendarStatusLabel,
            localTruthStatusLabel,
            mailStatusDetail:
                mailConfigured
                    ? 'Das verbundene Postfach wird direkt im OS gelesen und von Mora mitverwendet.'
                    : !ownerManageable
                        ? 'Dieses Konto kann Mail-Verbindungen nicht selbst verwalten.'
                        : mailLocalMode
                            ? 'Der Server laeuft im lokalen Mailmodus. Externe IMAP-Synchronisation ist hier abgeschaltet.'
                            : MAIL_SETUP_DETAIL,
            calendarStatusDetail:
                calendarConfigured
                    ? 'Der verbundene Kalender wird im OS gelesen und fuer Home, Kalender und Mora genutzt.'
                    : !ownerManageable
                        ? 'Dieses Konto kann Kalender-Verbindungen nicht selbst verwalten.'
                        : !calendarOauthEnabled
                            ? CALENDAR_OAUTH_DETAIL
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
                            : 'Browser-Freigaben hier nicht verfuegbar',
            mailConfigured,
            calendarConfigured,
            mailLocalMode,
            calendarOauthEnabled,
            ownerManageable,
            localTruthReachable: localTruthBridge.state === 'ready'
                || localTruthBridge.state === 'core_only'
                || localTruthBridge.state === 'ui_only',
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
