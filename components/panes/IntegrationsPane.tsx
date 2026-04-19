import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { EmailIntegration } from '@/components/integrations/EmailIntegration';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { AlertCircle, Bell, Bot, Calendar, Copy, Cpu, ExternalLink, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { useRuntimeSession } from '@/lib/auth/runtimeSession';
import { toast } from 'sonner';
import { getCalendarOAuthReturnTo, openCalendarOAuthPopup } from '@/lib/integrations/calendarOAuth';

interface MailOverview {
    configured?: boolean;
    enabled?: boolean;
    provider?: string;
    email?: string;
    status?: string;
}

interface CalendarOverview {
    configured?: boolean;
    provider?: string;
    email?: string;
    status?: string;
}

interface AssistantProviderMeta {
    healthy?: boolean;
    available?: boolean;
    priority?: number;
    error?: string;
}

interface AssistantOverview {
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

interface IntegrationsOverview {
    mail?: MailOverview;
    calendar?: CalendarOverview;
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
                    supported_actions?: string[];
                };
                core?: {
                    kind?: string;
                    service_id?: string;
                    status?: string;
                    reachable?: boolean;
                    status_code?: number | null;
                    supported_actions?: string[];
                };
                assistant?: {
                    kind?: string;
                    service_id?: string;
                    status?: string;
                    reachable?: boolean;
                    available?: boolean;
                    configured_model?: string;
                    supported_actions?: string[];
                };
            };
            routing_profile?: string;
            available?: boolean;
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
            detail?: string;
            required_fields?: string[];
            optional_fields?: string[];
            provider_options?: string[];
        };
        calendar?: {
            mode?: string;
            configured?: boolean;
            required_env?: string[];
            missing_env?: string[];
            redirect_url?: string;
            provider?: string;
        };
    };
}

type RuntimePlatform = 'windows' | 'linux';
type RuntimeJob = {
    job_id: string;
    service_id?: string;
    action?: string;
    status?: string;
    accepted_at?: string;
    started_at?: string | null;
    finished_at?: string | null;
    error?: string | null;
};

const DEFAULT_LOCAL_TRUTH_COMMANDS: Record<RuntimePlatform, string> = {
    windows: 'Set-Location C:\\saimor; .\\scripts\\Start-LocalTruth.ps1 -ForceRestart',
    linux: 'bash ./scripts/start-local-truth.sh --force-restart',
};

const statusTone = (status?: string) => {
    switch (status) {
        case 'available':
        case 'configured':
        case 'connected':
            return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
        case 'local':
        case 'degraded':
            return 'text-amber-200 bg-amber-500/10 border-amber-500/20';
        case 'owner_only':
        case 'forbidden_demo':
            return 'text-white/60 bg-white/5 border-white/10';
        case 'unavailable':
            return 'text-red-200 bg-red-500/10 border-red-500/20';
        default:
            return 'text-white/60 bg-white/5 border-white/10';
    }
};

const humanizeIntegrationStatus = (status?: string) => {
    switch (status) {
        case 'available':
            return 'Verfuegbar';
        case 'configured':
            return 'Konfiguriert';
        case 'connected':
            return 'Verbunden';
        case 'local':
            return 'Lokal';
        case 'not_configured':
            return 'Nicht eingerichtet';
        case 'degraded':
            return 'Eingeschraenkt';
        case 'owner_only':
            return 'Nur fuer Eigentuemer';
        case 'forbidden_demo':
            return 'Im Demo-Modus gesperrt';
        case 'unavailable':
            return 'Nicht verfuegbar';
        default:
            return 'Unbekannt';
    }
};

const humanizeRuntimeState = (state?: string) => {
    switch (state) {
        case 'ready':
            return 'Bereit';
        case 'degraded':
            return 'Eingeschraenkt';
        case 'partial':
            return 'Teilweise bereit';
        case 'offline':
            return 'Offline';
        default:
            return 'Unbekannt';
    }
};

const buildAssistantDescription = (assistant?: AssistantOverview) => {
    if (!assistant) return 'Provider-Status wird geladen.';
    if (assistant.status === 'available') {
        const provider = assistant.recommended_provider || assistant.primary_preference || 'automatisch';
        return `${assistant.healthy_provider_count || 0} gesunde Provider aktiv. Empfehlung: ${provider}.`;
    }
    if (assistant.status === 'configured') {
        return `${assistant.configured_provider_count || 0} Provider sind konfiguriert, aber aktuell nicht gesund.`;
    }
    if (assistant.status === 'degraded') {
        return 'Provider-Konfiguration vorhanden, aber derzeit eingeschraenkt.';
    }
    if (assistant.status === 'unavailable') {
        return 'Assistant-Provider konnten nicht gelesen werden.';
    }
    return 'Assistant-Status ist derzeit unklar.';
};

const buildMailDescription = (overview?: IntegrationsOverview) => {
    const mail = overview?.mail;
    const caps = overview?.capabilities;
    if (!mail) return 'Mail-Status wird geladen.';
    if (mail.status === 'forbidden_demo') {
        return 'Diese Verbindung kann nur im Eigentuemer-Kontext verwaltet werden.';
    }
    if (mail.status === 'local' || caps?.mail_local_mode) {
        return 'Lokaler Postfach-Modus aktiv. Keine externe IMAP-Synchronisation.';
    }
    if (mail.configured) {
        return mail.email ? `Verbunden mit ${mail.email}.` : 'Postfach ist eingerichtet.';
    }
    return overview?.setup?.mail?.detail || 'Noch keine Mail-Verbindung eingerichtet. Hinterlege Provider, E-Mail und App-Passwort im Integrationsbereich.';
};

const buildCalendarDescription = (overview?: IntegrationsOverview) => {
    const calendar = overview?.calendar;
    const caps = overview?.capabilities;
    if (!calendar) return 'Kalender-Status wird geladen.';
    if (!caps?.calendar_oauth_enabled) {
        const missing = overview?.setup?.calendar?.missing_env || [];
        const redirect = overview?.setup?.calendar?.redirect_url || 'http://127.0.0.1:8081/v1/auth/google/callback';
        const ownerManageable = Boolean(caps?.owner_manageable);
        return !ownerManageable
            ? `Google-OAuth muss tenantweit zuerst von einem Eigentuemer eingerichtet werden. Redirect: ${redirect}.`
            : missing.length > 0
            ? `Kalender-OAuth ist serverseitig noch nicht aktiviert. Es fehlen ${missing.join(' / ')}. Redirect: ${redirect}.`
            : `Kalender-OAuth ist serverseitig noch nicht aktiviert. Redirect: ${redirect}.`;
    }
    if (calendar.configured) {
        return calendar.email ? `Verbunden mit ${calendar.email}.` : 'Kalender ist eingerichtet.';
    }
    return 'Noch keine Kalender-Verbindung eingerichtet.';
};

const SummaryCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    status?: string;
    description: string;
    meta?: string | null;
    detail?: string | null;
}> = ({ icon, title, status, description, meta, detail }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-emerald-300">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-medium text-white">{title}</h4>
                    {meta && <p className="mt-0.5 text-xs text-white/40">{meta}</p>}
                </div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${statusTone(status)}`}>
                {humanizeIntegrationStatus(status)}
            </span>
        </div>
        <p className="text-xs leading-relaxed text-white/65">{description}</p>
        {detail ? <p className="mt-3 text-[11px] text-white/42">{detail}</p> : null}
    </div>
);

export const IntegrationsPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const pane = getPane(id);
    const surfaceProfile = useSurfaceProfile();

    const {
        overview,
        isLoading,
        error,
        browserBridge,
        loadOverview,
        refreshBrowserBridge,
        localTruthBridge,
        summary,
    } = useCommunicationSurface();
    const { mailPreview, calendarPreview } = useCommunicationLiveData();
    const runtimeSession = useRuntimeSession();
    const [isRequestingNotifications, setIsRequestingNotifications] = useState(false);
    const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
    const [runtimeActionKey, setRuntimeActionKey] = useState<string | null>(null);
    const [runtimeJobs, setRuntimeJobs] = useState<RuntimeJob[]>([]);

    const assistantProviders = useMemo(
        () => Object.entries(overview?.assistant?.providers || {}).sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99)),
        [overview]
    );
    const localTruthStartupCommands = useMemo(() => {
        const commands = overview?.runtime?.local_truth?.startup_commands;
        return {
            windows: commands?.windows || overview?.runtime?.local_truth?.startup_command || DEFAULT_LOCAL_TRUTH_COMMANDS.windows,
            linux: commands?.linux || DEFAULT_LOCAL_TRUTH_COMMANDS.linux,
        };
    }, [overview]);
    const runtimeServices = overview?.runtime?.local_truth?.services;
    const runtimeRole = runtimeSession.data?.user?.role;
    const canControlRuntime = runtimeRole === 'system_owner';
    const latestMail = mailPreview[0] ?? null;
    const nextEvent = calendarPreview[0] ?? null;

    const requestBrowserNotifications = useCallback(async () => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
        setIsRequestingNotifications(true);
        try {
            const permission = await Notification.requestPermission();
            refreshBrowserBridge();
            if (permission === 'granted') {
                toast.success('Browser-Benachrichtigungen aktiviert');
                new Notification('Mora ist jetzt mit deinem Browser verbunden', {
                    body: 'Hinweise, Mail- und Kalender-Signale koennen direkt im Browser auftauchen.',
                });
            } else {
                toast.info('Benachrichtigungen wurden nicht freigegeben');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Benachrichtigungen konnten nicht aktiviert werden');
        } finally {
            setIsRequestingNotifications(false);
        }
    }, [refreshBrowserBridge]);

    const sendBrowserTestNotification = useCallback(() => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
            toast.error('Browser-Benachrichtigungen sind noch nicht freigegeben');
            return;
        }
        new Notification('Mora Testsignal', {
            body: 'Dein Browser ist jetzt Teil der internen Instanz.',
        });
        toast.success('Testsignal gesendet');
    }, []);

    const openMailPane = useCallback(() => {
        openPane({
            id: 'mail-main',
            type: 'mail',
            title: 'Post',
            size: { width: 860, height: 640 },
            position: { x: 160, y: 120 },
        });
    }, [openPane]);

    const openCalendarPane = useCallback(() => {
        openPane({
            id: 'calendar-main',
            type: 'calendar',
            title: 'Kalender',
            size: { width: 840, height: 620 },
            position: { x: 180, y: 110 },
        });
    }, [openPane]);

    const openOwnerConsole = useCallback(() => {
        if (typeof window === 'undefined') return;
        const url = overview?.runtime?.surfaces?.owner_console || 'https://owner.saimor.world/login';
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [overview]);

    const openOperationsControl = useCallback(() => {
        if (typeof window === 'undefined') return;
        const url = overview?.runtime?.surfaces?.operations_console || 'https://www.saimor.world/systems/control';
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [overview]);

    const openLocalTruthSurface = useCallback(() => {
        if (typeof window === 'undefined') return;
        const url = summary.localTruthUrl;
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [summary.localTruthUrl]);

    const connectGoogleCalendar = useCallback(async () => {
        setIsConnectingCalendar(true);
        try {
            const res = await corePost('/v3/integrations/calendar/connect', {
                return_to: getCalendarOAuthReturnTo(),
            });
            const authUrl = res?.auth_url;
            if (!authUrl) {
                toast.error('Google-Kalender-Verbindung ist noch nicht sauber konfiguriert');
                return;
            }
            if (typeof window !== 'undefined') {
                const result = await openCalendarOAuthPopup(authUrl);
                if (result.ok) {
                    toast.success('Kalender verbunden');
                    await loadOverview();
                } else if (result.reason === 'blocked') {
                    toast.error('Popup blockiert. Erlaube das Verbindungsfenster fuer SAIMOR.');
                } else if (result.reason !== 'closed') {
                    toast.error('Kalender-Verbindung wurde nicht abgeschlossen');
                }
            }
        } catch (err: any) {
            toast.error(err?.message || 'Kalender-Verbindung konnte nicht gestartet werden');
        } finally {
            setIsConnectingCalendar(false);
        }
    }, [loadOverview]);

    const copyRuntimeCommand = useCallback(async (platform: RuntimePlatform) => {
        try {
            await navigator.clipboard.writeText(localTruthStartupCommands[platform]);
            toast.success(`Startbefehl fuer ${platform === 'windows' ? 'Windows' : 'Linux'} kopiert`);
        } catch {
            toast.error('Befehl konnte nicht kopiert werden');
        }
    }, [localTruthStartupCommands]);

    const loadRuntimeJobs = useCallback(async () => {
        if (!canControlRuntime) {
            setRuntimeJobs([]);
            return;
        }
        try {
            const payload = await coreGet(overview?.runtime?.local_truth?.jobs_endpoint || '/v3/system/runtime/jobs', { isOptional: true });
            const items = Array.isArray(payload?.items) ? payload.items : [];
            setRuntimeJobs(items.slice(0, 6));
        } catch {
            setRuntimeJobs([]);
        }
    }, [canControlRuntime, overview?.runtime?.local_truth?.jobs_endpoint]);

    const runRuntimeAction = useCallback(async (serviceId: 'local_truth' | 'ui' | 'core', action: 'start' | 'stop' | 'restart') => {
        const actionKey = `${serviceId}:${action}`;
        setRuntimeActionKey(actionKey);
        try {
            const result = await corePost(`/v3/system/runtime/actions/${serviceId}`, { action });
            if (!result?.accepted) {
                toast.error('Runtime-Aktion wurde nicht angenommen');
                return;
            }
            toast.success(`${serviceId} -> ${action} wurde eingereiht`);
            await loadOverview();
            await loadRuntimeJobs();
            if (typeof window !== 'undefined') {
                window.setTimeout(() => {
                    void loadOverview();
                    void localTruthBridge.refresh();
                    void loadRuntimeJobs();
                }, 1800);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Runtime-Aktion konnte nicht gestartet werden');
        } finally {
            setRuntimeActionKey(null);
        }
    }, [loadOverview, loadRuntimeJobs, localTruthBridge]);

    useEffect(() => {
        void loadRuntimeJobs();
    }, [loadRuntimeJobs]);

    useEffect(() => {
        if (!canControlRuntime || runtimeActionKey === null) return;
        const timer = window.setInterval(() => {
            void loadRuntimeJobs();
        }, 1500);
        return () => window.clearInterval(timer);
    }, [canControlRuntime, runtimeActionKey, loadRuntimeJobs]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Integrationen"
            paneId={id}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex h-full flex-col overflow-hidden">
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Integrationsuebersicht</p>
                            <h3 className="mt-2 text-lg font-medium text-white">Konten, Browser und Assistant-Provider</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                                Mail, Kalender, Browser-Freigaben und LLM-Provider werden hier als operative Kontoschicht zusammengezogen.
                                Diese Flaeche ist die echte Verbindungslogik der Instanz, nicht nur ein Mock-Panel.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${
                                    !surfaceProfile.isPublicDemoSurface
                                        ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                                        : surfaceProfile.isPublicDemoSurface
                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                                            : 'border-white/10 bg-white/[0.04] text-white/60'
                                }`}>
                                    {!surfaceProfile.isPublicDemoSurface ? 'Interne Instanz' : surfaceProfile.isPublicDemoSurface ? 'Demo-Spiegel' : 'Standardmodus'}
                                </span>
                                <span className="text-xs text-white/40">
                                    {!surfaceProfile.isPublicDemoSurface
                                        ? 'Hier werden echte lokale Regeln, Browser-Freigaben und Verbindungen aufgebaut.'
                                        : surfaceProfile.isPublicDemoSurface
                                            ? 'Die Demo zeigt dieselbe Oberflaeche, spiegelt aber nur den stabilen Stand.'
                                            : 'Diese Organisation nutzt den Standardmodus der Plattform.'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={loadOverview}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            Aktualisieren
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                {[0, 1, 2].map((index) => (
                                    <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                        <div className="mb-4 h-4 w-28 rounded bg-white/10" />
                                        <div className="h-10 rounded bg-white/5" />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                {[0, 1].map((index) => (
                                    <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                                        <div className="mb-4 h-5 w-36 rounded bg-white/10" />
                                        <div className="h-32 rounded bg-white/5" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 text-red-300" size={18} />
                                <div>
                                    <h4 className="text-sm font-medium text-red-100">Integrationen konnten nicht geladen werden</h4>
                                    <p className="mt-1 text-sm text-red-100/70">{error}</p>
                                    <button
                                        onClick={loadOverview}
                                        className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-xs text-white transition-colors hover:bg-white/15"
                                    >
                                        Erneut versuchen
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Konten & Browser</p>
                                    <h4 className="mt-1 text-sm font-medium text-white">Direkte Arbeitsanbindung</h4>
                                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                                        Hier verknuepfst du den Browser selbst mit Mora: Benachrichtigungen, Postfach, Kalender und die direkten Arbeitsflaechen im OS.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                                                    <Bell size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-white">Browser</h5>
                                                    <p className="mt-0.5 text-xs text-white/40">Benachrichtigungen und lokale Hinweise</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${statusTone(browserBridge.permission === 'granted' ? 'connected' : browserBridge.permission === 'denied' ? 'degraded' : 'not_configured')}`}>
                                                {summary.browserStatusLabel}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-white/60">
                                            Echte Browser-Benachrichtigungen sind die erste lokale Bruecke fuer Mail-, Kalender- und Mora-Signale.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={requestBrowserNotifications}
                                                disabled={!browserBridge.supported || isRequestingNotifications}
                                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/12 px-3 py-2 text-xs text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/18 disabled:opacity-50"
                                            >
                                                <Bell size={14} />
                                                {isRequestingNotifications ? 'Freigabe...' : 'Benachrichtigungen aktivieren'}
                                            </button>
                                            <button
                                                onClick={sendBrowserTestNotification}
                                                disabled={browserBridge.permission !== 'granted'}
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                                            >
                                                <ExternalLink size={14} />
                                                Testsignal
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-white">Postfach</h5>
                                                    <p className="mt-0.5 text-xs text-white/40">Gmail, Outlook oder eigenes IMAP</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${statusTone(overview?.mail?.status)}`}>
                                                {humanizeIntegrationStatus(overview?.mail?.status)}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-white/60">{buildMailDescription(overview || undefined)}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={openMailPane}
                                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/12 px-3 py-2 text-xs text-emerald-100 transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/18"
                                            >
                                                <Mail size={14} />
                                                Post oeffnen
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
                                                    <Calendar size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-white">Kalender</h5>
                                                    <p className="mt-0.5 text-xs text-white/40">Google Calendar und lokale Terminansicht</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${statusTone(overview?.calendar?.status)}`}>
                                                {humanizeIntegrationStatus(overview?.calendar?.status)}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-white/60">{buildCalendarDescription(overview || undefined)}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={openCalendarPane}
                                                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/12 px-3 py-2 text-xs text-orange-100 transition-colors hover:border-orange-300/35 hover:bg-orange-500/18"
                                            >
                                                <Calendar size={14} />
                                                Kalender oeffnen
                                            </button>
                                            <button
                                                onClick={connectGoogleCalendar}
                                                disabled={!overview?.capabilities?.calendar_oauth_enabled || isConnectingCalendar}
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                                            >
                                                <ExternalLink size={14} />
                                                {isConnectingCalendar ? 'Verbinde...' : 'Mit Google verbinden'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                                                    <Cpu size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-white">Local Truth</h5>
                                                    <p className="mt-0.5 text-xs text-white/40">localhost als echte Arbeitsinstanz</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
                                                localTruthBridge.state === 'ready'
                                                    ? 'border-violet-400/20 bg-violet-500/12 text-violet-100'
                                                    : localTruthBridge.state === 'core_only' || localTruthBridge.state === 'ui_only'
                                                        ? 'border-amber-400/20 bg-amber-500/12 text-amber-100'
                                                        : 'border-white/10 bg-white/[0.04] text-white/60'
                                            }`}>
                                                {summary.localTruthStatusLabel}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed text-white/60">
                                            {localTruthBridge.error
                                                || 'Hier wird geprueft, ob lokale UI und lokaler Core fuer echte Konten und echte Integrationen erreichbar sind.'}
                                        </p>
                                        <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-white/55">
                                            UI: <span className="text-white/78">{summary.localTruthUrl}</span>
                                            <br />
                                            Core: <span className="text-white/78">{localTruthBridge.selectedCoreUrl || overview?.runtime?.local_truth?.core_candidates?.[0] || 'http://127.0.0.1:8081/v3/health'}</span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => void localTruthBridge.refresh()}
                                                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/12 px-3 py-2 text-xs text-violet-100 transition-colors hover:border-violet-300/35 hover:bg-violet-500/18"
                                            >
                                                <RefreshCw size={14} />
                                                Localhost pruefen
                                            </button>
                                            <button
                                                onClick={openLocalTruthSurface}
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08]"
                                            >
                                                <ExternalLink size={14} />
                                                Local Truth oeffnen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                <div className="mb-4">
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Lokale Intelligenz</p>
                                    <h4 className="mt-1 text-sm font-medium text-white">Local Truth Runtime</h4>
                                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                                        Auf localhost soll Mora nicht nur spiegeln, sondern mit echten lokalen Regeln, Konten und Integrationen arbeiten.
                                        Die Demo zeigt dieselbe Schale, aber nicht dieselbe operative Wahrheit.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
                                    <div className="rounded-2xl border border-cyan-400/12 bg-cyan-500/[0.06] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-200">
                                                    <Cpu size={18} />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-white">Gemma / Ollama lokal</h5>
                                                    <p className="mt-0.5 text-xs text-white/40">
                                                        {overview?.runtime?.local_truth?.preferred_provider || 'ollama'} · {overview?.runtime?.local_truth?.routing_profile || 'privacy'} · Browser bleibt verbunden
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${
                                                overview?.runtime?.local_truth?.state === 'ready'
                                                    ? 'border-cyan-400/20 bg-cyan-500/12 text-cyan-100'
                                                    : overview?.runtime?.local_truth?.state === 'degraded' || overview?.runtime?.local_truth?.state === 'partial'
                                                        ? 'border-amber-400/20 bg-amber-500/12 text-amber-100'
                                                        : 'border-white/10 bg-white/[0.04] text-white/60'
                                            }`}>
                                                {humanizeRuntimeState(overview?.runtime?.local_truth?.state)}
                                            </span>
                                        </div>
                                        <p className="mt-4 text-xs leading-relaxed text-white/60">
                                            Verwende lokal <span className="text-cyan-100">{overview?.runtime?.local_truth?.recommended_model || 'gemma4:e2b'}</span> fuer schnellen privaten Betrieb.
                                            Das aktuell konfigurierte Modell ist <span className="text-white/80">{overview?.runtime?.local_truth?.configured_model || 'unbekannt'}</span>.
                                        </p>
                                        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                                            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/60">
                                                UI: <span className="text-white/80">{humanizeRuntimeState(runtimeServices?.ui?.status)}</span>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/60">
                                                Core: <span className="text-white/80">{humanizeRuntimeState(runtimeServices?.core?.status)}</span>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/60">
                                                Assistant: <span className="text-white/80">{humanizeRuntimeState(runtimeServices?.assistant?.status)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-cyan-100/85">
                                            <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Windows Host</div>
                                            {localTruthStartupCommands.windows}
                                        </div>
                                        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-cyan-100/85">
                                            <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Linux Host</div>
                                            {localTruthStartupCommands.linux}
                                        </div>
                                        <p className="mt-2 text-[11px] text-white/45">
                                            SAIMOR nutzt denselben Runtime-Vertrag auf beiden Host-Systemen: gleicher Core, gleiche UI, gleiche Dienste. Unterschiedlich sind nur die Host-Launcher.
                                        </p>
                                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                            {[
                                                {
                                                    serviceId: 'local_truth' as const,
                                                    title: 'Local Truth',
                                                    state: overview?.runtime?.local_truth?.state,
                                                    supportedActions: overview?.runtime?.local_truth?.supported_actions || [],
                                                },
                                                {
                                                    serviceId: 'ui' as const,
                                                    title: 'UI',
                                                    state: runtimeServices?.ui?.status,
                                                    supportedActions: runtimeServices?.ui?.supported_actions || [],
                                                },
                                                {
                                                    serviceId: 'core' as const,
                                                    title: 'Core',
                                                    state: runtimeServices?.core?.status,
                                                    supportedActions: runtimeServices?.core?.supported_actions || [],
                                                },
                                            ].map((service) => (
                                                <div key={service.serviceId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <div className="text-xs font-medium text-white">{service.title}</div>
                                                            <div className="mt-1 text-[11px] text-white/45">{humanizeRuntimeState(service.state)}</div>
                                                        </div>
                                                        <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                                                            service.state === 'ready'
                                                                ? 'border-emerald-400/20 bg-emerald-500/12 text-emerald-100'
                                                                : service.state === 'degraded' || service.state === 'partial'
                                                                    ? 'border-amber-400/20 bg-amber-500/12 text-amber-100'
                                                                    : 'border-white/10 bg-white/[0.04] text-white/60'
                                                        }`}>
                                                            {humanizeRuntimeState(service.state)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {(['start', 'stop', 'restart'] as const)
                                                            .filter((action) => service.supportedActions.includes(action))
                                                            .map((action) => {
                                                                const actionKey = `${service.serviceId}:${action}`;
                                                                return (
                                                                    <button
                                                                        key={action}
                                                                        onClick={() => void runRuntimeAction(service.serviceId, action)}
                                                                        disabled={!canControlRuntime || runtimeActionKey !== null}
                                                                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/75 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                                                                    >
                                                                        {runtimeActionKey === actionKey ? 'Laeuft...' : action}
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-3 text-[11px] text-white/45">
                                            {canControlRuntime
                                                ? 'Als System-Eigentuemer kannst du die lokale Runtime jetzt direkt aus dem OS starten, stoppen und neu anstoen.'
                                                : 'Runtime-Aktionen sind bewusst nur fuer den System-Eigentuemer freigegeben.'}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => void copyRuntimeCommand('windows')}
                                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/12 px-3 py-2 text-xs text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/18"
                                            >
                                                <Copy size={14} />
                                                Windows kopieren
                                            </button>
                                            <button
                                                onClick={() => void copyRuntimeCommand('linux')}
                                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/12 px-3 py-2 text-xs text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/18"
                                            >
                                                <Copy size={14} />
                                                Linux kopieren
                                            </button>
                                            <button
                                                onClick={openOperationsControl}
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08]"
                                            >
                                                <ShieldCheck size={14} />
                                                Operations-Leitstand
                                            </button>
                                            <button
                                                onClick={openLocalTruthSurface}
                                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/75 transition-colors hover:bg-white/[0.08]"
                                            >
                                                <ExternalLink size={14} />
                                                Local Truth oeffnen
                                            </button>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Wahrheitsmodus</p>
                                        <div className="mt-3 space-y-3 text-xs leading-relaxed text-white/60">
                                            <p><span className="text-white/80">localhost</span> arbeitet mit echten lokalen Regeln, Browser-Freigaben und privaten Integrationen.</p>
                                            <p><span className="text-white/80">{overview?.runtime?.surfaces?.demo_mirror || 'https://hq.saimor.world'}</span> zeigt dieselbe Oberflaeche, bleibt aber dein Demo-Spiegel.</p>
                                            <p><span className="text-white/80">{overview?.runtime?.surfaces?.owner_console || 'https://owner.saimor.world/login'}</span> bleibt die getrennte Verwaltungs- und Verbindungsebene.</p>
                                            <p><span className="text-white/80">{overview?.runtime?.surfaces?.operations_console || 'https://www.saimor.world/systems/control'}</span> ist der operative Runtime- und Integrationsleitstand.</p>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-[11px] text-white/55">
                                            <div>Runtime: <span className="text-white/78">{overview?.runtime?.local_truth?.state || 'unknown'}</span></div>
                                            <div className="mt-1">Bridge: <span className="text-white/78">{localTruthBridge.state}</span></div>
                                            <div className="mt-1">Letzte Pruefung: <span className="text-white/78">{localTruthBridge.lastCheckedAt || 'noch keine'}</span></div>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">Runtime Jobs</div>
                                            <div className="mt-3 space-y-2">
                                                {canControlRuntime ? runtimeJobs.length > 0 ? runtimeJobs.map((job) => (
                                                    <div key={job.job_id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/60">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-white/80">{job.service_id} · {job.action}</span>
                                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                                                                job.status === 'succeeded'
                                                                    ? 'border-emerald-400/20 bg-emerald-500/12 text-emerald-100'
                                                                    : job.status === 'failed'
                                                                        ? 'border-red-400/20 bg-red-500/12 text-red-100'
                                                                        : job.status === 'running'
                                                                            ? 'border-amber-400/20 bg-amber-500/12 text-amber-100'
                                                                            : 'border-white/10 bg-white/[0.04] text-white/60'
                                                            }`}>
                                                                {job.status || 'unknown'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-white/45">{job.job_id}</div>
                                                        {job.error ? <div className="mt-1 text-red-200/80">{job.error}</div> : null}
                                                    </div>
                                                )) : (
                                                    <div className="text-[11px] text-white/45">Noch keine Runtime-Aktionen protokolliert.</div>
                                                ) : (
                                                    <div className="text-[11px] text-white/45">Nur der System-Eigentuemer sieht Runtime-Jobs.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                <SummaryCard
                                    icon={<Mail size={18} />}
                                    title="Mail"
                                    status={overview?.mail?.status}
                                    description={buildMailDescription(overview || undefined)}
                                    meta={overview?.mail?.provider ? `Provider: ${overview.mail.provider}` : null}
                                    detail={latestMail ? `${latestMail.from}: ${latestMail.subject}` : 'Nach dem Verbinden erscheinen neue Nachrichten direkt im OS.'}
                                />
                                <SummaryCard
                                    icon={<Calendar size={18} />}
                                    title="Kalender"
                                    status={overview?.calendar?.status}
                                    description={buildCalendarDescription(overview || undefined)}
                                    meta={overview?.calendar?.provider ? `Provider: ${overview.calendar.provider}` : null}
                                    detail={nextEvent ? `${nextEvent.title}${nextEvent.time ? ` · ${nextEvent.time}` : ''}` : 'Naechste Termine erscheinen direkt in Home, Kalender und Integrationen.'}
                                />
                                <SummaryCard
                                    icon={<Bot size={18} />}
                                    title="Assistant"
                                    status={overview?.assistant?.status}
                                    description={buildAssistantDescription(overview?.assistant)}
                                    meta={overview?.assistant?.routing_profile ? `Profil: ${overview.assistant.routing_profile}` : null}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                    <div className="mb-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Assistant Operations</p>
                                        <h4 className="mt-1 text-sm font-medium text-white">Provider-Routing und Fallback</h4>
                                    </div>
                                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <div className="rounded-xl bg-black/20 px-3 py-2 text-xs text-white/55">
                                            Routing-Profil: <span className="text-white/80">{overview?.assistant?.routing_profile || 'unbekannt'}</span>
                                        </div>
                                        <div className="rounded-xl bg-black/20 px-3 py-2 text-xs text-white/55">
                                            Primaer: <span className="text-white/80">{overview?.assistant?.recommended_provider || overview?.assistant?.primary_preference || 'automatisch'}</span>
                                        </div>
                                        <div className="rounded-xl bg-black/20 px-3 py-2 text-xs text-white/55">
                                            Fallbacks: <span className="text-white/80">{overview?.assistant?.fallback_order?.length || 0}</span>
                                        </div>
                                    </div>

                                    {assistantProviders.length > 0 ? (
                                        <div className="space-y-3">
                                            {assistantProviders.map(([provider, meta]) => {
                                                const providerStatus = meta.healthy ? 'available' : (meta.available ? 'configured' : 'unavailable');
                                                return (
                                                    <div key={provider} className="rounded-xl border border-white/10 bg-black/20 p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <h5 className="text-sm font-medium text-white">{provider}</h5>
                                                                <p className="mt-1 text-xs text-white/45">
                                                                    Prioritaet {meta.priority ?? '-'}
                                                                </p>
                                                            </div>
                                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${statusTone(providerStatus)}`}>
                                                                {meta.healthy ? 'Gesund' : meta.available ? 'Konfiguriert' : 'Nicht verfuegbar'}
                                                            </span>
                                                        </div>
                                                        {meta.error && (
                                                            <p className="mt-3 text-xs text-red-200/80">
                                                                Fehler: {meta.error}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
                                            Keine Provider-Metadaten verfuegbar.
                                        </div>
                                    )}

                                    {overview?.assistant?.error && (
                                        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-100/80">
                                            Provider-Fehler: {overview.assistant.error}
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                    <div className="mb-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Betriebszustand</p>
                                        <h4 className="mt-1 text-sm font-medium text-white">Runtime-Signale</h4>
                                    </div>
                                    <div className="space-y-3 text-xs text-white/55">
                                        <div className="rounded-xl bg-black/20 px-3 py-2">
                                            Mail-Modus: <span className="text-white/80">{overview?.capabilities?.mail_local_mode ? 'Lokal' : 'Extern'}</span>
                                        </div>
                                        <div className="rounded-xl bg-black/20 px-3 py-2">
                                            Kalender-OAuth: <span className="text-white/80">{overview?.capabilities?.calendar_oauth_enabled ? 'Aktiv' : 'Nicht aktiv'}</span>
                                        </div>
                                        <div className="rounded-xl bg-black/20 px-3 py-2">
                                            Assistant: <span className="text-white/80">{overview?.capabilities?.assistant_available ? 'Verfuegbar' : 'Nicht verfuegbar'}</span>
                                        </div>
                                        <div className="rounded-xl bg-black/20 px-3 py-2">
                                            Steuerung: <span className="text-white/80">{overview?.capabilities?.owner_manageable ? 'Eigentuemer-Modus' : 'Eingeschraenkt'}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">Mehrnutzer-Vertrag</p>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="rounded-xl border border-cyan-400/10 bg-cyan-500/[0.05] px-3 py-3 text-xs leading-relaxed text-cyan-100/78">
                                            <div className="font-medium text-cyan-100">Serverweit</div>
                                            Google OAuth Client ID, Secret und Redirect gehoeren zur SAIMOR-Plattform. Ohne diese App-Konfiguration kann kein Nutzer den Kalender verbinden.
                                        </div>
                                        <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/[0.05] px-3 py-3 text-xs leading-relaxed text-emerald-100/78">
                                            <div className="font-medium text-emerald-100">Pro Nutzer</div>
                                            Mail-Zugangsdaten sowie Google-Refresh-Tokens werden pro Nutzer gespeichert. Mora, Home, Mail und Kalender arbeiten danach auf genau diesem Nutzerkontext.
                                        </div>
                                    </div>
                                </div>
                                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                    <div className="mb-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Mail</p>
                                        <h4 className="mt-1 text-sm font-medium text-white">Postfach-Verbindung</h4>
                                    </div>
                                    <EmailIntegration />
                                </section>
                                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                    <div className="mb-4">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Kalender</p>
                                        <h4 className="mt-1 text-sm font-medium text-white">Termin-Verbindung</h4>
                                    </div>
                                    <CalendarIntegration />
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
