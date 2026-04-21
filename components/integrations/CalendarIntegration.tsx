'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Check, AlertCircle, RefreshCw, Link2 } from 'lucide-react';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { toast } from 'sonner';
import { getCalendarOAuthReturnTo, openCalendarOAuthPopup } from '@/lib/integrations/calendarOAuth';
import { broadcastCommunicationSync } from '@/lib/integrations/communicationEvents';
import { useIntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';

interface CalendarIntegrationStatus {
    configured: boolean;
    status: string;
    provider?: string;
    email?: string;
    calendar_id?: string;
}

interface CalendarProviderConfigStatus {
    configured: boolean;
    source: string;
    client_id_preview?: string;
    redirect_url?: string;
    required_fields?: string[];
    missing_fields?: string[];
}

export const CalendarIntegration: React.FC = () => {
    const [status, setStatus] = useState<CalendarIntegrationStatus | null>(null);
    const [providerConfig, setProviderConfig] = useState<CalendarProviderConfigStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [redirectInput, setRedirectInput] = useState('http://127.0.0.1:8081/v1/auth/google/callback');
    const { overview } = useIntegrationsOverview();

    const loadStatus = async () => {
        try {
            const data = await coreGet('/v3/integrations/calendar');
            setStatus(data);
            const providerData = await coreGet('/v3/integrations/calendar/provider-config', { isOptional: true });
            setProviderConfig(providerData || null);
            if (providerData?.redirect_url) setRedirectInput(providerData.redirect_url);
        } catch (e) {
            console.error('Failed to load calendar status:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, []);

    const calendarSetup = overview?.setup?.calendar;
    const missingEnv = Array.isArray(calendarSetup?.missing_env) ? calendarSetup.missing_env : [];
    const requiredEnv = Array.isArray(calendarSetup?.required_env) ? calendarSetup.required_env : [];
    const redirectUrl = typeof calendarSetup?.redirect_url === 'string'
        ? calendarSetup.redirect_url
        : 'http://127.0.0.1:8081/v1/auth/google/callback';
    const oauthReady = Boolean(overview?.capabilities?.calendar_oauth_enabled);
    const ownerManageable = Boolean(overview?.capabilities?.owner_manageable);

    const handleSaveProviderConfig = async () => {
        if (!clientId.trim() || !clientSecret.trim()) {
            toast.error('Client ID und Client Secret sind erforderlich');
            return;
        }
        setIsSavingConfig(true);
        try {
            await corePost('/v3/integrations/calendar/provider-config', {
                client_id: clientId.trim(),
                client_secret: clientSecret.trim(),
                redirect_url: redirectInput.trim() || redirectUrl,
            });
            toast.success('Google-OAuth-Konfiguration gespeichert');
            setClientSecret('');
            await loadStatus();
            broadcastCommunicationSync('calendar-provider-config-save');
        } catch (e: any) {
            toast.error(e?.message || 'Google-OAuth-Konfiguration konnte nicht gespeichert werden');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const res = await corePost('/v3/integrations/calendar/connect', {
                return_to: getCalendarOAuthReturnTo(),
            });
            if (res?.auth_url) {
                const result = await openCalendarOAuthPopup(res.auth_url);
                if (result.ok) {
                    toast.success('Kalender verbunden');
                    await loadStatus();
                    broadcastCommunicationSync('calendar-config-connect');
                } else if (result.reason === 'blocked') {
                    toast.error('Popup blockiert. Erlaube das Verbindungsfenster für SAIMOR.');
                } else if (result.reason !== 'closed') {
                    toast.error('Kalender-Verbindung wurde nicht abgeschlossen');
                }
            } else {
                toast.error('Verbindungs-URL nicht verfügbar');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Kalender-Verbindung fehlgeschlagen');
        } finally {
            setIsConnecting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse p-6 rounded-xl bg-white/5">
                <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                <div className="h-20 bg-white/5 rounded" />
            </div>
        );
    }

    if (false && status?.status === 'owner_only') {
        return (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 text-white/60">
                    <AlertCircle size={20} />
                    <span>Kalender-Integration ist nur für Eigentümer verfügbar.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Calendar className="text-emerald-400" size={20} />
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Google Calendar</h4>
                        <p className="text-xs text-white/40">Kalender verbinden</p>
                    </div>
                </div>
                {status?.configured && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check size={12} /> Verbunden
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                {(!status?.configured || !oauthReady) && (
                    <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/8 px-4 py-3 text-xs text-cyan-100/85">
                        <div className="font-medium text-cyan-100">Google-Kalender lokal verbinden</div>
                        <p className="mt-1 leading-relaxed text-cyan-100/75">
                            {oauthReady
                                ? 'Starte den OAuth-Flow direkt aus dem OS. Nach erfolgreichem Login erscheinen echte Events in Home, Kalender und Mora.'
                                : 'Der OAuth-Flow ist serverseitig noch nicht komplett konfiguriert. Setze zuerst die fehlenden Werte im Core.'}
                        </p>
                        <p className="mt-2 text-[11px] text-cyan-100/60">
                            Die Google-OAuth-App ist serverweit. Der verbundene Kalender und die Tokens werden danach pro Nutzer gespeichert.
                        </p>
                        {providerConfig?.source && (
                            <p className="mt-2 text-[11px] text-cyan-100/60">
                                Quelle: <span className="text-cyan-50">{providerConfig.source === 'tenant' ? 'Tenant-Konfiguration' : 'Core-Env'}</span>
                                {providerConfig.client_id_preview ? ` · ${providerConfig.client_id_preview}` : ''}
                            </p>
                        )}
                        <p className="mt-2 text-cyan-100/70">
                            Redirect: <span className="text-cyan-50">{redirectUrl}</span>
                        </p>
                        {(missingEnv.length > 0 || requiredEnv.length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {(missingEnv.length > 0 ? missingEnv : requiredEnv).map((field) => (
                                    <span key={field} className="rounded-full border border-cyan-400/20 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-cyan-100/75">
                                        {field}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!oauthReady && ownerManageable && (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                        <div>
                            <h5 className="text-sm font-medium text-white">Google OAuth für diesen Tenant</h5>
                            <p className="mt-1 text-xs leading-relaxed text-white/55">
                                Diese Konfiguration ist tenantweit. Nutzer verbinden danach ihren eigenen Kalender im OS und speichern ihre Tokens separat.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">Client ID</label>
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Google OAuth Client ID"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">Client Secret</label>
                            <input
                                type="password"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Google OAuth Client Secret"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-white/40">Redirect URL</label>
                            <input
                                type="text"
                                value={redirectInput}
                                onChange={(e) => setRedirectInput(e.target.value)}
                                placeholder="http://127.0.0.1:8081/v1/auth/google/callback"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-cyan-500/50 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSaveProviderConfig}
                            disabled={isSavingConfig || !clientId.trim() || !clientSecret.trim()}
                            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-3 py-2 text-xs text-cyan-100 transition-all hover:bg-cyan-500/30 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isSavingConfig ? 'animate-spin' : ''} />
                            {isSavingConfig ? 'Speichern...' : 'OAuth für Tenant speichern'}
                        </button>
                    </div>
                )}

                {!oauthReady && !ownerManageable && (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-white/60">
                        Die Google-OAuth-App für diesen Tenant muss zuerst von einem Eigentümer eingerichtet werden.
                        Sobald das erfolgt ist, kannst du deinen persoenlichen Kalender direkt hier im OS verbinden.
                    </div>
                )}

                {status?.email && (
                    <div className="text-xs text-white/55">
                        Konto: <span className="text-white/80">{status.email}</span>
                    </div>
                )}
                {status?.configured && !status?.email && (
                    <div className="text-xs text-white/40">
                        Anbieter: <span className="text-white/60">{status?.provider || 'Google'}</span>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting || !oauthReady}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                    >
                        <Link2 size={14} />
                        {isConnecting
                            ? 'Verbinden...'
                            : !oauthReady
                                ? ownerManageable
                                    ? 'OAuth für Tenant einrichten'
                                    : 'Eigentümer muss OAuth freischalten'
                                : status?.configured ? 'Neu verbinden' : 'Verbinden'
                        }
                    </button>
                    <button
                        onClick={loadStatus}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all"
                    >
                        <RefreshCw size={14} />
                        Aktualisieren
                    </button>
                </div>
            </div>
        </div>
    );
};

