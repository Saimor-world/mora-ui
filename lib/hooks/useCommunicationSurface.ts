'use client';

import { useMemo } from 'react';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import { useLocalTruthBridge } from '@/lib/hooks/useLocalTruthBridge';

const DEFAULT_LOCAL_UI = 'http://127.0.0.1:3000/home';
const DEFAULT_CONNECT_SURFACE = 'about:saimor-connect';

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

        const mailStatusLabel = overview?.mail?.configured
            ? (overview.mail.email || 'Mail verbunden')
            : overview?.capabilities?.mail_local_mode
                ? 'Lokaler Mail-Modus'
                : 'Mail verbinden';

        const calendarStatusLabel = overview?.calendar?.configured
            ? (overview.calendar.email || 'Kalender verbunden')
            : overview?.capabilities?.calendar_oauth_enabled
                ? 'Kalender verbinden'
                : 'Kalender vorbereiten';

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
            mailConfigured: Boolean(overview?.mail?.configured),
            calendarConfigured: Boolean(overview?.calendar?.configured),
            mailLocalMode: Boolean(overview?.capabilities?.mail_local_mode || overview?.mail?.status === 'local'),
            calendarOauthEnabled: Boolean(overview?.capabilities?.calendar_oauth_enabled),
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
