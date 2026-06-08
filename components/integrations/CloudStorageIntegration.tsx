'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, KeyRound, Loader2, PlugZap, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { coreDelete, coreGet, corePost } from '@/lib/api/coreClient';
import { getCloudOAuthReturnTo, openCloudOAuthPopup, openDirectCloudConnectPopup } from '@/lib/integrations/calendarOAuth';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';
import { toast } from 'sonner';

type CloudConnector = {
    id: string;
    provider: string;
    label: string;
    enabled?: boolean;
    status?: string;
    auth_type?: string;
    base_url?: string | null;
    account_hint?: string | null;
    root_path?: string | null;
    setup_required?: string | null;
};

type CloudOverview = {
    configured?: boolean;
    enabled?: boolean;
    status?: string;
    connectors?: CloudConnector[];
    count?: number;
    providers?: string[];
};

type CloudProviderConfig = {
    provider: string;
    configured?: boolean;
    source?: string;
    client_id_preview?: string | null;
    redirect_url?: string | null;
    scopes?: string[];
    missing_fields?: string[];
};

const PROVIDER_LABELS: Record<string, string> = {
    nextcloud: 'Nextcloud',
    extcloud: 'Extcloud',
    sharepoint: 'SharePoint',
    google_drive: 'Google Drive',
};
type CloudProvider = 'nextcloud' | 'extcloud' | 'sharepoint' | 'google_drive';
const DIRECT_WEBDAV_PROVIDERS = new Set<CloudProvider>(['nextcloud', 'extcloud']);
const DEFAULT_CLOUD_REDIRECT_URL = 'http://127.0.0.1:8081/v3/integrations/cloud/callback';

const statusLabel = (status?: string) => {
    switch (status) {
        case 'configured':
            return 'Verbunden';
        case 'provider_config_required':
            return 'OAuth fehlt';
        case 'not_configured':
            return 'Nicht eingerichtet';
        default:
            return status || 'Unbekannt';
    }
};

export function CloudStorageIntegration() {
    const [overview, setOverview] = useState<CloudOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [provider, setProvider] = useState<CloudProvider>('extcloud');
    const [label, setLabel] = useState('Saimor HQ Extcloud');
    const [baseUrl, setBaseUrl] = useState('');
    const [username, setUsername] = useState('');
    const [rootPath, setRootPath] = useState('/Saimor HQ');
    const [providerConfigs, setProviderConfigs] = useState<Record<string, CloudProviderConfig | null>>({});
    const [providerForm, setProviderForm] = useState<Record<string, { clientId: string; clientSecret: string; redirectUrl: string }>>({});
    const [isSavingProviderConfig, setIsSavingProviderConfig] = useState(false);
    const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
    const [isConnectingDirect, setIsConnectingDirect] = useState(false);
    const oauthConfigProvider = useMemo<CloudProvider>(
        () => (DIRECT_WEBDAV_PROVIDERS.has(provider) ? 'nextcloud' : provider),
        [provider]
    );

    const connectors = useMemo(() => overview?.connectors || [], [overview]);
    const selectedProviderConfig = providerConfigs[oauthConfigProvider] || null;
    const oauthProviderMissingConfig = selectedProviderConfig !== null && selectedProviderConfig.configured === false;
    const selectedProviderForm = useMemo(
        () => (
            providerForm[oauthConfigProvider] || {
                clientId: '',
                clientSecret: '',
                redirectUrl: DEFAULT_CLOUD_REDIRECT_URL,
            }
        ),
        [oauthConfigProvider, providerForm]
    );

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const payload = await coreGet('/v3/integrations/cloud', { isOptional: true });
            setOverview(payload || null);

            const entries = await Promise.all(
                (['nextcloud', 'sharepoint', 'google_drive'] as const).map(async (candidate) => {
                    const config = await coreGet(`/v3/integrations/cloud/provider-config/${candidate}`, { isOptional: true });
                    return [candidate, config || null] as const;
                })
            );

            setProviderConfigs(Object.fromEntries(entries));
            setProviderForm((current) => {
                const next = { ...current };
                for (const [candidate, config] of entries) {
                    if (!next[candidate]) {
                        next[candidate] = {
                            clientId: '',
                            clientSecret: '',
                            redirectUrl: config?.redirect_url || DEFAULT_CLOUD_REDIRECT_URL,
                        };
                    }
                }
                return next;
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const connectDirect = useCallback(async () => {
        if (provider !== 'nextcloud' && provider !== 'extcloud') return;
        if (!baseUrl.trim() || !username.trim()) {
            toast.error('URL und Nutzername sind erforderlich');
            return;
        }

        setIsConnectingDirect(true);
        try {
            const result = await openDirectCloudConnectPopup({
                provider,
                label,
                baseUrl,
                username,
                rootPath,
            });

            if (result.ok) {
                toast.success(`${PROVIDER_LABELS[provider]} verbunden`);
                await load();
                broadcastCommunicationSync('cloud-direct-connect');
                return;
            }

            if (result.reason === 'blocked') {
                toast.error('Popup blockiert. Bitte Verbindungsfenster erlauben.');
            } else if (result.reason === 'timeout') {
                toast.error('Verbindungsfenster hat zu lange gedauert');
            }
        } finally {
            setIsConnectingDirect(false);
        }
    }, [baseUrl, label, load, provider, rootPath, username]);

    const updateProviderForm = useCallback(
        (field: 'clientId' | 'clientSecret' | 'redirectUrl', value: string) => {
            setProviderForm((current) => ({
                ...current,
                [oauthConfigProvider]: {
                    ...selectedProviderForm,
                    [field]: value,
                },
            }));
        },
        [oauthConfigProvider, selectedProviderForm]
    );

    const saveProviderConfig = useCallback(async () => {
        setIsSavingProviderConfig(true);
        try {
            const payload = await corePost('/v3/integrations/cloud/provider-config', {
                provider: oauthConfigProvider,
                client_id: selectedProviderForm.clientId,
                client_secret: selectedProviderForm.clientSecret,
                redirect_url: selectedProviderForm.redirectUrl,
            });
            setProviderConfigs((current) => ({ ...current, [oauthConfigProvider]: payload }));
            setProviderForm((current) => ({
                ...current,
                [oauthConfigProvider]: {
                    clientId: '',
                    clientSecret: '',
                    redirectUrl: payload?.redirect_url || selectedProviderForm.redirectUrl,
                },
            }));
            toast.success(`${PROVIDER_LABELS[oauthConfigProvider]} OAuth-App gespeichert`);
            broadcastCommunicationSync('cloud-provider-config-save');
        } catch (error: any) {
            toast.error(error?.message || 'OAuth-App konnte nicht gespeichert werden');
        } finally {
            setIsSavingProviderConfig(false);
        }
    }, [oauthConfigProvider, selectedProviderForm]);

    const connectOAuth = useCallback(async () => {
        if (DIRECT_WEBDAV_PROVIDERS.has(provider) && !baseUrl.trim()) {
            toast.error('Für Nextcloud OAuth ist die Cloud-URL erforderlich');
            return;
        }
        setIsConnectingOAuth(true);
        try {
            const payload = await corePost('/v3/integrations/cloud/connect', {
                provider: oauthConfigProvider,
                return_to: getCloudOAuthReturnTo(),
                base_url: DIRECT_WEBDAV_PROVIDERS.has(provider) ? baseUrl.trim() : undefined,
                label: DIRECT_WEBDAV_PROVIDERS.has(provider) ? label.trim() : undefined,
                root_path: DIRECT_WEBDAV_PROVIDERS.has(provider) ? rootPath.trim() : undefined,
            });
            const authUrl = typeof payload?.auth_url === 'string' ? payload.auth_url : '';
            if (!/^https?:\/\//i.test(authUrl)) {
                toast.error(payload?.detail || payload?.setup_required || 'OAuth-URL fehlt oder ist ungültig');
                return;
            }
            const result = await openCloudOAuthPopup(authUrl);
            if (result.ok) {
                toast.success(`${PROVIDER_LABELS[provider]} verbunden`);
                await load();
                broadcastCommunicationSync('cloud-oauth-connect');
            } else if (result.reason === 'blocked') {
                toast.error('OAuth-Popup wurde blockiert');
            } else if (result.reason === 'timeout') {
                toast.error('OAuth-Verbindung hat zu lange gedauert');
            } else {
                await load();
            }
        } catch (error: any) {
            toast.error(error?.message || 'OAuth-Verbindung konnte nicht gestartet werden');
        } finally {
            setIsConnectingOAuth(false);
        }
    }, [baseUrl, label, load, oauthConfigProvider, provider, rootPath]);

    const testConnector = useCallback(async (connector: CloudConnector) => {
        setTestingId(connector.id);
        try {
            const result = await corePost(`/v3/integrations/cloud/${connector.id}/test`, {});
            if (result?.success) {
                toast.success(result.message || 'Cloud-Verbindung erreichbar');
            } else {
                toast.error(result?.message || 'Cloud-Verbindung nicht erreichbar');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Cloud-Test fehlgeschlagen');
        } finally {
            setTestingId(null);
        }
    }, []);

    const deleteConnector = useCallback(
        async (connector: CloudConnector) => {
            try {
                await coreDelete(`/v3/integrations/cloud/${connector.id}`);
                await load();
                toast.success('Cloud-Verbindung entfernt');
                broadcastCommunicationSync('cloud-delete');
            } catch (error: any) {
                toast.error(error?.message || 'Cloud-Verbindung konnte nicht entfernt werden');
            }
        },
        [load]
    );

    const currentProviderHint = DIRECT_WEBDAV_PROVIDERS.has(provider)
        ? 'Empfohlen: OAuth im externen Provider-Fenster. Fallback: WebDAV/App-Passwort im separaten Connect-Popup.'
        : 'Real pro Nutzer: Der Owner konfiguriert einmal die OAuth-App, danach verbindet jeder Nutzer sein eigenes Konto per Consent.';

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200">
                        <Cloud size={18} />
                    </div>
                    <div>
                        <h5 className="text-sm font-medium text-white">Persönliche Cloud im privaten Ordner</h5>
                        <p className="mt-1 text-xs leading-relaxed text-white/58">
                            Diese Verbindungen gehören nur deinem Nutzerkonto. Sie werden nicht tenant-global gesetzt und erscheinen im privaten Bereich als eigene Datenquelle.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {(['extcloud', 'nextcloud', 'sharepoint', 'google_drive'] as const).map((candidate) => (
                    <button
                        key={candidate}
                        type="button"
                        onClick={() => {
                            setProvider(candidate);
                            setLabel(
                                DIRECT_WEBDAV_PROVIDERS.has(candidate)
                                    ? candidate === 'extcloud'
                                        ? 'Saimor HQ Extcloud'
                                        : 'Meine Nextcloud'
                                    : PROVIDER_LABELS[candidate]
                            );
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                            provider === candidate
                                ? 'border-emerald-300/35 bg-emerald-500/12 text-white'
                                : 'border-white/10 bg-white/[0.03] text-white/58 hover:bg-white/[0.06]'
                        }`}
                    >
                        <div className="text-sm font-medium">{PROVIDER_LABELS[candidate]}</div>
                        <div className="mt-1 text-[11px] text-white/42">
                            {DIRECT_WEBDAV_PROVIDERS.has(candidate) ? 'WebDAV/App-Passwort' : 'OAuth erforderlich'}
                        </div>
                    </button>
                ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Connector</p>
                    <h5 className="mt-1 text-sm font-medium text-white">{PROVIDER_LABELS[provider]} verbinden</h5>
                    <p className="mt-1 text-xs leading-relaxed text-white/48">{currentProviderHint}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1.5 text-xs text-white/55">
                        <span>Label</span>
                        <input
                            value={label}
                            onChange={(event) => setLabel(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                            placeholder="Meine Cloud"
                        />
                    </label>

                    {DIRECT_WEBDAV_PROVIDERS.has(provider) ? (
                        <>
                            <label className="space-y-1.5 text-xs text-white/55">
                                <span>{PROVIDER_LABELS[provider]} URL</span>
                                <input
                                    value={baseUrl}
                                    onChange={(event) => setBaseUrl(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                                    placeholder="https://cloud.example.com"
                                />
                            </label>
                            <label className="space-y-1.5 text-xs text-white/55">
                                <span>Nutzername</span>
                                <input
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                                    placeholder="dein-nextcloud-user"
                                />
                            </label>
                            <label className="space-y-1.5 text-xs text-white/55 md:col-span-2">
                                <span>Startordner im privaten Bereich</span>
                                <input
                                    value={rootPath}
                                    onChange={(event) => setRootPath(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                                    placeholder="/Saimor HQ"
                                />
                                <span className="block text-[11px] leading-relaxed text-white/35">
                                    Leer oder &quot;/&quot; zeigt die Cloud-Wurzel. &quot;/Saimor HQ&quot; listet direkt diesen Cloud-Ordner im privaten Bereich.
                                </span>
                            </label>
                        </>
                    ) : (
                        <div className="md:col-span-2">
                            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-500/[0.04] p-3">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck size={16} className={selectedProviderConfig?.configured ? 'mt-0.5 text-emerald-200' : 'mt-0.5 text-amber-200'} />
                                    <div>
                                        <div className="text-xs font-medium text-white">
                                            {selectedProviderConfig?.configured ? 'Tenant-OAuth-App bereit' : 'Tenant-OAuth-App fehlt'}
                                        </div>
                                        <div className="mt-1 text-[11px] leading-relaxed text-white/45">
                                            {selectedProviderConfig
                                                ? `Redirect: ${selectedProviderConfig.redirect_url || 'nicht gesetzt'}`
                                                : 'Du bist vermutlich kein Owner oder die Provider-Konfiguration ist noch nicht abrufbar.'}
                                        </div>
                                        {selectedProviderConfig?.client_id_preview ? (
                                            <div className="mt-1 text-[11px] text-emerald-100/65">Client: {selectedProviderConfig.client_id_preview}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-4">
                    {selectedProviderConfig !== null ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <KeyRound size={14} className="text-emerald-200/70" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Owner Setup</p>
                                    <h6 className="text-sm font-medium text-white">{PROVIDER_LABELS[oauthConfigProvider]} OAuth-App</h6>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <label className="space-y-1.5 text-xs text-white/55">
                                    <span>Client ID</span>
                                    <input
                                        value={selectedProviderForm.clientId}
                                        onChange={(event) => updateProviderForm('clientId', event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                                        placeholder="OAuth Client ID"
                                    />
                                </label>
                                <label className="space-y-1.5 text-xs text-white/55">
                                    <span>Client Secret</span>
                                    <input
                                        type="password"
                                        value={selectedProviderForm.clientSecret}
                                        onChange={(event) => updateProviderForm('clientSecret', event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                                        placeholder="OAuth Secret"
                                    />
                                </label>
                                <label className="space-y-1.5 text-xs text-white/55 md:col-span-2">
                                    <span>Redirect URL</span>
                                    <input
                                        value={selectedProviderForm.redirectUrl}
                                        onChange={(event) => updateProviderForm('redirectUrl', event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-300/40"
                                        placeholder={DEFAULT_CLOUD_REDIRECT_URL}
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => void saveProviderConfig()}
                                disabled={isSavingProviderConfig}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50"
                            >
                                {isSavingProviderConfig ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                OAuth-App speichern
                            </button>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void connectOAuth()}
                            disabled={isConnectingOAuth || oauthProviderMissingConfig}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-500/14 px-4 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                            {isConnectingOAuth ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
                            {DIRECT_WEBDAV_PROVIDERS.has(provider)
                                ? `${PROVIDER_LABELS[provider]} Login-Fenster (OAuth)`
                                : `Eigenes ${PROVIDER_LABELS[provider]} verbinden`}
                        </button>

                        {DIRECT_WEBDAV_PROVIDERS.has(provider) ? (
                            <button
                                type="button"
                                onClick={() => void connectDirect()}
                                disabled={isConnectingDirect}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/75 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                            >
                                {isConnectingDirect ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
                                Fallback: App-Passwort-Popup
                            </button>
                        ) : null}
                    </div>

                    {DIRECT_WEBDAV_PROVIDERS.has(provider) ? (
                        <p className="text-[11px] text-white/42">
                            OAuth nutzt ein externes Provider-Fenster. Falls deine Instanz kein OAuth anbietet, nutze den App-Passwort-Fallback.
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Aktive Quellen</p>
                        <h5 className="mt-1 text-sm font-medium text-white">Persönliche Cloud-Connectoren</h5>
                    </div>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/50 transition-colors hover:text-white"
                        aria-label="Cloud-Status aktualisieren"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 py-4 text-xs text-white/42">
                        <Loader2 size={13} className="animate-spin" />
                        Lade Cloud-Verbindungen...
                    </div>
                ) : connectors.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-white/45">
                        Noch keine Cloud angebunden. Nextcloud kann direkt über WebDAV verbunden werden.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {connectors.map((connector) => (
                            <div key={connector.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={14} className={connector.status === 'configured' ? 'text-emerald-300' : 'text-amber-200'} />
                                            <div className="truncate text-sm font-medium text-white">{connector.label}</div>
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/45">
                                                {statusLabel(connector.status)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-white/38">
                                            {PROVIDER_LABELS[connector.provider] || connector.provider}
                                            {connector.account_hint ? ` | ${connector.account_hint}` : ''}
                                            {connector.root_path ? ` | ${connector.root_path}` : ''}
                                        </div>
                                        {connector.setup_required ? (
                                            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/70">{connector.setup_required}</p>
                                        ) : null}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void testConnector(connector)}
                                            disabled={testingId === connector.id}
                                            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/58 transition-colors hover:text-white disabled:opacity-50"
                                        >
                                            {testingId === connector.id ? 'Teste...' : 'Test'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteConnector(connector)}
                                            className="rounded-lg border border-red-400/10 bg-red-500/[0.04] p-1.5 text-red-100/55 transition-colors hover:text-red-100"
                                            aria-label="Cloud-Verbindung entfernen"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
