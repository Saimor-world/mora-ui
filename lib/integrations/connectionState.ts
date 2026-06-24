import type { IntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';

export type IntegrationConnectionState = 'loading' | 'configured' | 'unconfigured' | 'error';

interface ResolveIntegrationConnectionStateArgs {
    configured?: boolean;
    hasOverview: boolean;
    isLoading: boolean;
    error?: string | null;
}

export function resolveIntegrationConnectionState({
    configured,
    hasOverview,
    isLoading,
    error,
}: ResolveIntegrationConnectionStateArgs): IntegrationConnectionState {
    if (configured === true) return 'configured';
    if (isLoading) return 'loading';
    if (error || !hasOverview) return 'error';
    return 'unconfigured';
}

export function resolveIntegrationConnectionStates(
    overview: IntegrationsOverview | null,
    isLoading: boolean,
    error?: string | null,
) {
    const shared = {
        hasOverview: overview !== null,
        isLoading,
        error,
    };

    const rssConfigured = Boolean(
        overview?.rss?.configured
        || (overview?.rss?.feeds?.length ?? 0) > 0
        || (overview?.rss?.count ?? 0) > 0,
    );

    return {
        mail: resolveIntegrationConnectionState({ ...shared, configured: overview?.mail?.configured }),
        calendar: resolveIntegrationConnectionState({ ...shared, configured: overview?.calendar?.configured }),
        cloud: resolveIntegrationConnectionState({ ...shared, configured: overview?.cloud_storage?.configured }),
        rss: resolveIntegrationConnectionState({ ...shared, configured: rssConfigured }),
    } as const;
}
