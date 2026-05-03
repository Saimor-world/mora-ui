'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { coreGet } from '@/lib/api/coreClient';
import { COMMUNICATION_SYNC_EVENT, getCommunicationSyncStorageKey } from '@/lib/integrations/communicationEvents';

export interface MailOverview {
    configured?: boolean;
    enabled?: boolean;
    provider?: string;
    email?: string;
    status?: string;
}

export interface CalendarOverview {
    configured?: boolean;
    provider?: string;
    email?: string;
    status?: string;
}

export interface RssFeedOverview {
    id?: string;
    url: string;
    title?: string;
    enabled?: boolean;
}

export interface RssOverview {
    configured?: boolean;
    enabled?: boolean;
    status?: string;
    feeds?: RssFeedOverview[];
    count?: number;
}

export interface CloudConnectorOverview {
    id: string;
    provider: string;
    label: string;
    enabled?: boolean;
    status?: string;
    auth_type?: string;
    base_url?: string | null;
    webdav_url?: string | null;
    account_hint?: string | null;
    root_path?: string | null;
    setup_required?: string | null;
}

export interface CloudStorageOverview {
    configured?: boolean;
    enabled?: boolean;
    status?: string;
    connectors?: CloudConnectorOverview[];
    count?: number;
    providers?: string[];
}

export interface AssistantProviderMeta {
    healthy?: boolean;
    available?: boolean;
    priority?: number;
    error?: string;
}

export interface AssistantOverview {
    status?: string;
    recommended_provider?: string | null;
    fallback_order?: string[];
    providers?: Record<string, AssistantProviderMeta>;
    routing_profile?: string | null;
    primary_preference?: string | null;
    healthy_provider_count?: number;
    configured_provider_count?: number;
    error?: string;
}

export interface IntegrationsOverview {
    mail?: MailOverview;
    calendar?: CalendarOverview;
    rss?: RssOverview;
    cloud_storage?: CloudStorageOverview;
    assistant?: AssistantOverview;
    runtime?: {
        local_truth?: {
            preferred_provider?: string;
            configured_model?: string;
            recommended_model?: string;
            ollama_api_url?: string;
            contract_version?: string;
            mode?: string;
            state?: string;
            action_endpoint_template?: string;
            jobs_endpoint?: string;
            supported_actions?: string[];
            startup_script?: string;
            startup_scripts?: {
                windows?: string;
                linux?: string;
            };
            startup_command?: string;
            startup_commands?: {
                windows?: string;
                linux?: string;
            };
            ui_start_command?: string;
            ui_start_commands?: {
                windows?: string;
                linux?: string;
            };
            core_start_command?: string;
            core_start_commands?: {
                windows?: string;
                linux?: string;
            };
            platform_notes?: {
                windows?: string;
                linux?: string;
            };
            services?: {
                ui?: {
                    kind?: string;
                    service_id?: string;
                    status?: string;
                    reachable?: boolean;
                    status_code?: number | null;
                    running?: boolean;
                    process_count?: number;
                    pids?: number[];
                    started_at?: string | null;
                    supported_actions?: string[];
                };
                core?: {
                    kind?: string;
                    service_id?: string;
                    status?: string;
                    reachable?: boolean;
                    status_code?: number | null;
                    running?: boolean;
                    process_count?: number;
                    pids?: number[];
                    started_at?: string | null;
                    supported_actions?: string[];
                };
                assistant?: {
                    kind?: string;
                    service_id?: string;
                    status?: string;
                    reachable?: boolean;
                    status_code?: number | null;
                    available?: boolean;
                    configured_model?: string;
                    error?: string;
                    supported_actions?: string[];
                };
            };
            routing_profile?: string;
            available?: boolean;
            ui_candidates?: string[];
            core_candidates?: string[];
        };
        cloud_mirror?: {
            recommended_provider?: string | null;
            routing_profile?: string | null;
            gemini_model?: string;
            anthropic_model?: string;
            openai_model?: string;
        };
        surfaces?: {
            local_truth?: string;
            demo_mirror?: string;
            owner_console?: string;
            operations_console?: string;
            connect_surface?: string;
        };
    };
    capabilities?: {
        real_email_enabled?: boolean;
        mail_local_mode?: boolean;
        calendar_oauth_enabled?: boolean;
        rss_enabled?: boolean;
        cloud_storage_enabled?: boolean;
        owner_manageable?: boolean;
        assistant_available?: boolean;
    };
    setup?: {
        mail?: {
            mode?: string;
            requires_owner?: boolean;
            required_fields?: string[];
            optional_fields?: string[];
            provider_options?: string[];
            detail?: string;
        };
        calendar?: {
            mode?: string;
            requires_owner?: boolean;
            configured?: boolean;
            required_env?: string[];
            missing_env?: string[];
            redirect_url?: string;
            provider?: string;
            source?: string;
        };
        rss?: {
            mode?: string;
            requires_owner?: boolean;
            required_fields?: string[];
            detail?: string;
        };
        cloud_storage?: {
            mode?: string;
            requires_owner?: boolean;
            required_fields?: string[];
            providers?: Record<string, unknown>;
            detail?: string;
        };
    };
}

export interface BrowserBridgeState {
    supported: boolean;
    permission: NotificationPermission | 'unsupported';
}

export function useIntegrationsOverview(autoLoad: boolean = true, enableSync: boolean = true) {
    const [overview, setOverview] = useState<IntegrationsOverview | null>(null);
    const [isLoading, setIsLoading] = useState(autoLoad);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const inFlightRef = useRef<Promise<void> | null>(null);
    const lastBackgroundRefreshRef = useRef<number>(0);
    const lastVisibilitySyncRef = useRef<number>(0);
    const [browserBridge, setBrowserBridge] = useState<BrowserBridgeState>({
        supported: false,
        permission: 'unsupported',
    });

    const refreshBrowserBridge = useCallback(() => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined') {
            setBrowserBridge({ supported: false, permission: 'unsupported' });
            return;
        }
        setBrowserBridge({
            supported: true,
            permission: Notification.permission,
        });
    }, []);

    const loadOverview = useCallback(async (options?: { background?: boolean }) => {
        const background = Boolean(options?.background);
        const now = Date.now();

        if (background && hasLoadedRef.current && now - lastBackgroundRefreshRef.current < 1200) {
            return;
        }

        if (inFlightRef.current) {
            return inFlightRef.current;
        }

        const shouldShowLoading = !background || !hasLoadedRef.current;
        if (shouldShowLoading) setIsLoading(true);
        if (!background) setError(null);

        const request = (async () => {
            try {
                const data = await coreGet('/v3/integrations/overview', { isOptional: true });
                setOverview(data || null);
                hasLoadedRef.current = true;
                if (background) {
                    lastBackgroundRefreshRef.current = now;
                }
            } catch (err: any) {
                if (!background) {
                    setError(err?.message || 'Integrationen konnten nicht geladen werden.');
                }
            } finally {
                inFlightRef.current = null;
                if (shouldShowLoading) setIsLoading(false);
            }
        })();

        inFlightRef.current = request;
        await request;
    }, []);

    useEffect(() => {
        if (!autoLoad) return;
        void loadOverview();
    }, [autoLoad, loadOverview]);

    useEffect(() => {
        refreshBrowserBridge();
    }, [refreshBrowserBridge]);

    useEffect(() => {
        if (!enableSync) return;
        if (typeof window === 'undefined') return;

        const handleSync = () => {
            void loadOverview({ background: true });
            refreshBrowserBridge();
        };

        const handleVisibility = () => {
            if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastVisibilitySyncRef.current < 15000) return;
            lastVisibilitySyncRef.current = now;
            void loadOverview({ background: true });
            refreshBrowserBridge();
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === getCommunicationSyncStorageKey()) {
                void loadOverview({ background: true });
            }
        };

        window.addEventListener(COMMUNICATION_SYNC_EVENT, handleSync as EventListener);
        window.addEventListener('storage', handleStorage);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener(COMMUNICATION_SYNC_EVENT, handleSync as EventListener);
            window.removeEventListener('storage', handleStorage);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [enableSync, loadOverview, refreshBrowserBridge]);

    return {
        overview,
        isLoading,
        error,
        browserBridge,
        loadOverview,
        refreshBrowserBridge,
    };
}
