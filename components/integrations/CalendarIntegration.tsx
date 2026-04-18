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

export const CalendarIntegration: React.FC = () => {
    const [status, setStatus] = useState<CalendarIntegrationStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const { overview } = useIntegrationsOverview();

    const loadStatus = async () => {
        try {
            const data = await coreGet('/v3/integrations/calendar');
            setStatus(data);
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
                    toast.error('Popup blockiert. Erlaube das Verbindungsfenster fuer SAIMOR.');
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

    if (status?.status === 'owner_only') {
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
                                ? 'Core zuerst konfigurieren'
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

