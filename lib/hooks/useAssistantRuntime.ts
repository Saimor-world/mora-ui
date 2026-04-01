"use client";

import { useCallback, useEffect, useState } from 'react';
import { coreGet } from '@/lib/api/coreClient';

type ProviderMeta = {
    healthy?: boolean;
    configured?: boolean;
    kind?: string;
    model?: string | null;
};

type ProvidersPayload = {
    recommended?: string | null;
    runtime?: {
        recommended_provider?: string | null;
        recommended_kind?: string | null;
        recommended_model?: string | null;
        routing_profile?: string | null;
        healthy_provider_count?: number;
        configured_provider_count?: number;
        local_provider_ready?: boolean;
    };
    providers?: Record<string, ProviderMeta>;
    routing_profile_resolved?: string | null;
    primary_preference_resolved?: string | null;
};

export interface AssistantRuntimeSnapshot {
    status: 'ready' | 'degraded' | 'offline';
    source: 'local' | 'cloud' | 'unknown';
    provider: string | null;
    model: string | null;
    routingProfile: string | null;
    healthyProviderCount: number;
    configuredProviderCount: number;
    title: string;
    subtitle: string;
    badge: string;
}

const PROVIDER_LABELS: Record<string, string> = {
    ollama: 'Ollama',
    gemini: 'Gemini',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
};

const OFFLINE_SNAPSHOT: AssistantRuntimeSnapshot = {
    status: 'offline',
    source: 'unknown',
    provider: null,
    model: null,
    routingProfile: null,
    healthyProviderCount: 0,
    configuredProviderCount: 0,
    title: 'Kein AI-Pfad',
    subtitle: 'Keine gesunden Provider',
    badge: 'Offline',
};

let cachedSnapshot: AssistantRuntimeSnapshot | null = null;
let cachedAt = 0;
let inflightRequest: Promise<AssistantRuntimeSnapshot> | null = null;

const CACHE_TTL_MS = 30_000;

function providerLabel(provider: string | null | undefined) {
    if (!provider) return 'Unbekannt';
    return PROVIDER_LABELS[provider] || provider;
}

function normalizeAssistantRuntime(payload: ProvidersPayload | null | undefined): AssistantRuntimeSnapshot {
    if (!payload || typeof payload !== 'object') {
        return OFFLINE_SNAPSHOT;
    }

    const providers = payload.providers || {};
    const runtime = payload.runtime || {};
    const recommended = runtime.recommended_provider || payload.recommended || null;
    const recommendedMeta = recommended ? providers[recommended] || {} : {};
    const source = (runtime.recommended_kind || recommendedMeta.kind || (recommended === 'ollama' ? 'local' : recommended ? 'cloud' : 'unknown')) as AssistantRuntimeSnapshot['source'];
    const model = runtime.recommended_model || recommendedMeta.model || null;
    const healthyProviderCount =
        typeof runtime.healthy_provider_count === 'number'
            ? runtime.healthy_provider_count
            : Object.values(providers).filter((meta) => meta?.healthy).length;
    const configuredProviderCount =
        typeof runtime.configured_provider_count === 'number'
            ? runtime.configured_provider_count
            : Object.values(providers).filter((meta) => meta?.configured || meta?.healthy).length;
    const routingProfile = runtime.routing_profile || payload.routing_profile_resolved || null;

    if (!recommended && configuredProviderCount === 0) {
        return OFFLINE_SNAPSHOT;
    }

    const status: AssistantRuntimeSnapshot['status'] =
        healthyProviderCount > 0 ? 'ready' : configuredProviderCount > 0 ? 'degraded' : 'offline';

    const readableProvider = providerLabel(recommended);
    const title =
        status === 'offline'
            ? OFFLINE_SNAPSHOT.title
            : source === 'local'
                ? `Lokal · ${readableProvider}`
                : source === 'cloud'
                    ? `Cloud · ${readableProvider}`
                    : readableProvider;

    const subtitle =
        status === 'offline'
            ? OFFLINE_SNAPSHOT.subtitle
            : model
                ? model
                : routingProfile
                    ? `Profil ${routingProfile}`
                    : `${healthyProviderCount} Provider gesund`;

    return {
        status,
        source,
        provider: recommended,
        model,
        routingProfile,
        healthyProviderCount,
        configuredProviderCount,
        title,
        subtitle,
        badge: source === 'local' ? 'Lokal' : source === 'cloud' ? 'Cloud' : 'AI',
    };
}

async function fetchAssistantRuntime(force = false): Promise<AssistantRuntimeSnapshot> {
    const now = Date.now();
    if (!force && cachedSnapshot && now - cachedAt < CACHE_TTL_MS) {
        return cachedSnapshot;
    }

    if (!force && inflightRequest) {
        return inflightRequest;
    }

    inflightRequest = (async () => {
        try {
            const payload = await coreGet('/v3/chat/providers', { isOptional: true });
            const snapshot = normalizeAssistantRuntime(payload);
            cachedSnapshot = snapshot;
            cachedAt = Date.now();
            return snapshot;
        } catch {
            return cachedSnapshot || OFFLINE_SNAPSHOT;
        } finally {
            inflightRequest = null;
        }
    })();

    return inflightRequest;
}

export function useAssistantRuntime(pollMs: number = 60_000): AssistantRuntimeSnapshot {
    const [snapshot, setSnapshot] = useState<AssistantRuntimeSnapshot>(cachedSnapshot || OFFLINE_SNAPSHOT);

    const refresh = useCallback(async (force = false) => {
        const nextSnapshot = await fetchAssistantRuntime(force);
        setSnapshot(nextSnapshot);
    }, []);

    useEffect(() => {
        refresh(false);
        if (pollMs <= 0) return;

        const timer = window.setInterval(() => {
            refresh(true);
        }, pollMs);

        return () => window.clearInterval(timer);
    }, [pollMs, refresh]);

    return snapshot;
}

