'use client';

import { useCallback, useEffect, useState } from 'react';
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
    assistant?: AssistantOverview;
    runtime?: {
        local_truth?: {
            preferred_provider?: string;
            configured_model?: string;
            recommended_model?: string;
            ollama_api_url?: string;
            startup_script?: string;
            startup_command?: string;
            ui_start_command?: string;
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
    };
}

export interface BrowserBridgeState {
    supported: boolean;
    permission: NotificationPermission | 'unsupported';
}

export function useIntegrationsOverview(autoLoad: boolean = true) {
    const [overview, setOverview] = useState<IntegrationsOverview | null>(null);
    const [isLoading, setIsLoading] = useState(autoLoad);
    const [error, setError] = useState<string | null>(null);
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

    const loadOverview = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await coreGet('/v3/integrations/overview', { isOptional: true });
            setOverview(data || null);
        } catch (err: any) {
            setError(err?.message || 'Integrationen konnten nicht geladen werden.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!autoLoad) return;
        void loadOverview();
    }, [autoLoad, loadOverview]);

    useEffect(() => {
        refreshBrowserBridge();
    }, [refreshBrowserBridge]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleSync = () => {
            void loadOverview();
            refreshBrowserBridge();
        };

        const handleStorage = (event: StorageEvent) => {
            if (event.key === getCommunicationSyncStorageKey()) {
                void loadOverview();
            }
        };

        window.addEventListener(COMMUNICATION_SYNC_EVENT, handleSync as EventListener);
        window.addEventListener('storage', handleStorage);
        window.addEventListener('focus', handleSync);

        return () => {
            window.removeEventListener(COMMUNICATION_SYNC_EVENT, handleSync as EventListener);
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('focus', handleSync);
        };
    }, [loadOverview, refreshBrowserBridge]);

    return {
        overview,
        isLoading,
        error,
        browserBridge,
        loadOverview,
        refreshBrowserBridge,
    };
}
