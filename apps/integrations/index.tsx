'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
    AlertCircle,
    Bell,
    Bot,
    Calendar,
    CheckCircle2,
    Cloud,
    Cpu,
    Database,
    ExternalLink,
    KeyRound,
    Mail,
    MonitorCog,
    PlugZap,
    RefreshCw,
    Rss,
    ShieldCheck,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { EmailIntegration } from '@/components/integrations/EmailIntegration';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { RssIntegration } from '@/components/integrations/RssIntegration';
import { CloudStorageIntegration } from '@/components/integrations/CloudStorageIntegration';
import { usePaneStore } from '@/lib/store/paneStore';
import { corePost } from '@/lib/api/coreClient';
import { useCommunicationSurface } from '@/lib/hooks/useCommunicationSurface';
import { useCommunicationLiveData } from '@/lib/hooks/useCommunicationLiveData';
import { useRuntimeSession } from '@/lib/auth/runtimeSession';
import {
    getCalendarOAuthReturnTo,
    openCalendarOAuthPopup,
    getGoogleConnectReturnTo,
    openGoogleConnectPopup,
} from '@/lib/integrations/calendarOAuth';
import type { AppProps } from '@/lib/apps/types';
import type { IntegrationsOverview } from '@/lib/hooks/useIntegrationsOverview';
import { GLASS_SHEET_PRESENTATION } from '@/lib/os/glassSheet';

type Lane = 'overview' | 'sources' | 'desktop' | 'setup';
type RuntimeAction = 'start' | 'stop' | 'restart';
type RuntimeServiceId = 'local_truth' | 'ui' | 'core';

const laneItems: Array<{ id: Lane; label: string; icon: LucideIcon }> = [
    { id: 'overview', label: 'Konto', icon: KeyRound },
    { id: 'sources', label: 'Daten', icon: Database },
    { id: 'desktop', label: 'Desktop', icon: MonitorCog },
    { id: 'setup', label: 'Setup', icon: PlugZap },
];

const runtimeActionLabels: Record<RuntimeAction, string> = {
    start: 'Starten',
    stop: 'Stoppen',
    restart: 'Neu starten',
};

const statusLabel = (status?: string | null) => {
    switch (status) {
        case 'available':
            return 'Bereit';
        case 'configured':
            return 'Konfiguriert';
        case 'connected':
            return 'Verbunden';
        case 'local':
            return 'Lokal';
        case 'degraded':
        case 'partial':
            return 'Eingeschränkt';
        case 'not_configured':
            return 'Offen';
        case 'owner_only':
            return 'Owner';
        case 'forbidden_demo':
            return 'Gesperrt';
        case 'unavailable':
        case 'offline':
            return 'Offline';
        case 'ready':
            return 'Bereit';
        case 'blocked':
            return 'Getrennt';
        default:
            return 'Unklar';
    }
};

const statusClass = (status?: string | null) => {
    switch (status) {
        case 'available':
        case 'configured':
        case 'connected':
        case 'ready':
            return 'border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100';
        case 'local':
        case 'degraded':
        case 'partial':
            return 'border-amber-300/20 bg-amber-400/[0.10] text-amber-100';
        case 'unavailable':
        case 'offline':
            return 'border-red-300/20 bg-red-400/[0.10] text-red-100';
        default:
            return 'border-white/10 bg-white/[0.05] text-white/58';
    }
};

const isReady = (status?: string | null, configured?: boolean) =>
    Boolean(configured || status === 'available' || status === 'configured' || status === 'connected' || status === 'ready' || status === 'local');

const buildMailText = (overview?: IntegrationsOverview | null) => {
    if (overview?.mail?.configured) return overview.mail.email ? `Verbunden mit ${overview.mail.email}` : 'Postfach ist verbunden.';
    if (overview?.capabilities?.mail_local_mode || overview?.mail?.status === 'local') return 'Lokaler Postfachmodus aktiv. Keine externe IMAP-Synchronisation.';
    return overview?.setup?.mail?.detail || 'Noch kein Postfach verbunden. Richte Mail ein, damit Môra echte Nachrichten lesen kann.';
};

const buildCalendarText = (overview?: IntegrationsOverview | null) => {
    if (overview?.calendar?.configured) return overview.calendar.email ? `Verbunden mit ${overview.calendar.email}` : 'Kalender ist verbunden.';
    if (!overview?.capabilities?.calendar_oauth_enabled) return 'Google OAuth ist serverseitig noch nicht fertig. Owner-Setup prüfen.';
    return 'Noch kein Kalender verbunden. Starte Google OAuth, wenn du Termine im OS sehen willst.';
};

const buildCloudText = (overview?: IntegrationsOverview | null) => {
    const count = overview?.cloud_storage?.count || overview?.cloud_storage?.connectors?.length || 0;
    if (count > 0) return `${count} Cloud-Verbindung${count === 1 ? '' : 'en'} im privaten Bereich.`;
    return 'Noch keine Cloud verbunden. Später erscheinen hier Drive, OneDrive, Nextcloud und andere Quellen.';
};

const buildAssistantText = (overview?: IntegrationsOverview | null) => {
    const assistant = overview?.assistant;
    if (!assistant) return 'Provider-Status wird geladen.';
    if (assistant.status === 'available') {
        return `${assistant.healthy_provider_count || 0} Provider gesund. Routing: ${assistant.recommended_provider || assistant.primary_preference || 'automatisch'}.`;
    }
    if (assistant.status === 'configured') return `${assistant.configured_provider_count || 0} Provider konfiguriert, aktuell aber nicht gesund.`;
    return assistant.error || 'Assistant-Routing ist noch nicht stabil verbunden.';
};

function safeOpen(url?: string | null) {
    if (!url || typeof window === 'undefined' || url.startsWith('about:')) {
        toast.info('Diese Verbindung ist hier noch nicht direkt oeffenbar.');
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

export default function IntegrationsApp({ paneId }: AppProps) {
    const {
        removePane,
        minimizePane,
        focusPane,
        getPane,
        updatePanePosition,
        updatePaneSize,
        openPane,
    } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);
    const runtimeSession = useRuntimeSession();
    const {
        overview,
        isLoading,
        error,
        browserBridge,
        refreshBrowserBridge,
        loadOverview,
        localTruthBridge,
        summary,
    } = useCommunicationSurface();
    const { mailPreview, calendarPreview, feedPreview, cloudPreview, refresh: refreshLiveData } = useCommunicationLiveData();

    const [lane, setLane] = useState<Lane>('overview');
    const [isRequestingNotifications, setIsRequestingNotifications] = useState(false);
    const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
    const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
    const [runtimeActionKey, setRuntimeActionKey] = useState<string | null>(null);

    const canControlRuntime = runtimeSession.data?.user?.role === 'system_owner';
    const runtimeServices = overview?.runtime?.local_truth?.services;
    const assistantProviders = useMemo(
        () => Object.entries(overview?.assistant?.providers || {}).sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99)),
        [overview?.assistant?.providers]
    );

    const readiness = useMemo(() => {
        const checks = [
            browserBridge.permission === 'granted',
            isReady(overview?.mail?.status, overview?.mail?.configured),
            isReady(overview?.calendar?.status, overview?.calendar?.configured),
            isReady(overview?.rss?.status, overview?.rss?.configured),
            isReady(overview?.cloud_storage?.status, overview?.cloud_storage?.configured),
            isReady(overview?.assistant?.status, overview?.capabilities?.assistant_available),
        ];
        const ready = checks.filter(Boolean).length;
        return { ready, total: checks.length, percent: Math.round((ready / checks.length) * 100) };
    }, [browserBridge.permission, overview]);

    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadOverview(),
            refreshLiveData(),
            localTruthBridge.refresh({ force: true }),
        ]);
    }, [loadOverview, localTruthBridge, refreshLiveData]);

    const requestBrowserNotifications = useCallback(async () => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined') {
            toast.error('Dieser Browser unterstützt Benachrichtigungen nicht.');
            return;
        }
        setIsRequestingNotifications(true);
        try {
            const permission = await Notification.requestPermission();
            refreshBrowserBridge();
            if (permission === 'granted') {
                toast.success('Browser ist verbunden');
                new Notification('Môra ist verbunden', { body: 'Signale können jetzt direkt im Browser erscheinen.' });
            } else {
                toast.info('Benachrichtigungen wurden nicht freigegeben.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Browser-Freigabe fehlgeschlagen');
        } finally {
            setIsRequestingNotifications(false);
        }
    }, [refreshBrowserBridge]);

    const sendBrowserTestNotification = useCallback(() => {
        if (typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
            toast.error('Browser-Benachrichtigungen sind noch nicht freigegeben.');
            return;
        }
        new Notification('Môra Testsignal', { body: 'Der Browser-Kanal funktioniert.' });
        toast.success('Testsignal gesendet');
    }, []);

    const openMailPane = useCallback(() => {
        openPane({ id: 'mail-main', type: 'mail', title: 'Mail', size: { width: 860, height: 640 }, position: { x: 160, y: 120 } });
    }, [openPane]);

    const openCalendarPane = useCallback(() => {
        openPane({ id: 'calendar-main', type: 'calendar', title: 'Kalender', size: { width: 840, height: 620 }, position: { x: 180, y: 110 } });
    }, [openPane]);

    const connectGoogleCalendar = useCallback(async () => {
        setIsConnectingCalendar(true);
        try {
            const res = await corePost('/v3/integrations/calendar/connect', { return_to: getCalendarOAuthReturnTo() });
            if (!res?.auth_url) {
                toast.error('Google-Kalender ist serverseitig noch nicht voll konfiguriert.');
                return;
            }
            const result = await openCalendarOAuthPopup(res.auth_url);
            if (result.ok) {
                toast.success('Kalender verbunden');
                await refreshAll();
            } else if (result.reason === 'blocked') {
                toast.error('Popup blockiert. Erlaube das Verbindungsfenster fuer SAIMOR.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Kalender-Verbindung konnte nicht gestartet werden');
        } finally {
            setIsConnectingCalendar(false);
        }
    }, [refreshAll]);

    const connectGoogleAll = useCallback(async () => {
        setIsConnectingGoogle(true);
        try {
            const res = await corePost('/v1/integrations/google/connect', { return_to: getGoogleConnectReturnTo() });
            if (!res?.auth_url) {
                toast.error('Google OAuth ist serverseitig noch nicht konfiguriert.');
                return;
            }
            const result = await openGoogleConnectPopup(res.auth_url);
            if (result.ok) {
                toast.success('Google verbunden — Mail, Kalender und Drive sind jetzt aktiv.');
                await refreshAll();
            } else if (result.reason === 'blocked') {
                toast.error('Popup blockiert. Erlaube das Verbindungsfenster fuer SAIMOR.');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Google-Verbindung konnte nicht gestartet werden');
        } finally {
            setIsConnectingGoogle(false);
        }
    }, [refreshAll]);

    const runRuntimeAction = useCallback(async (serviceId: RuntimeServiceId, action: RuntimeAction) => {
        const actionKey = `${serviceId}:${action}`;
        setRuntimeActionKey(actionKey);
        try {
            const result = await corePost(`/v3/system/runtime/actions/${serviceId}`, { action });
            if (!result?.accepted) {
                toast.error('Runtime-Aktion wurde nicht angenommen.');
                return;
            }
            toast.success(`${serviceId} ${runtimeActionLabels[action].toLowerCase()} wurde eingereiht`);
            window.setTimeout(() => void refreshAll(), 1600);
        } catch (err: any) {
            toast.error(err?.message || 'Runtime-Aktion konnte nicht gestartet werden');
        } finally {
            setRuntimeActionKey(null);
        }
    }, [refreshAll]);

    if (!pane) return null;

    return (
        <GlassPanel
            title="Integrationen"
            paneId={paneId}
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            padding={0}
            onPositionChange={(x, y) => updatePanePosition(paneId, x, y)}
            onResize={(w, h) => updatePaneSize(paneId, w, h)}
            onClose={() => removePane(paneId)}
            onMinimize={() => minimizePane(paneId)}
            onFocus={() => focusPane(paneId)}
            isActive={isActive}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
            {...GLASS_SHEET_PRESENTATION}
        >
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <header className="border-b border-white/[0.07] px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/50">Verbindungszentrale</p>
                            <h2 className="mt-2 text-2xl font-light tracking-[-0.03em] text-white/92">Was Môra wirklich nutzen darf</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                                Konten, Datenquellen, Browser-Freigaben und Desktop-Bridge an einem Ort. Erst verbinden, dann kann Môra echte Arbeit sehen.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.07] px-4 py-3 text-right">
                                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/45">Bereits nutzbar</div>
                                <div className="mt-1 text-2xl text-white/90">{readiness.ready}/{readiness.total}</div>
                            </div>
                            <button
                                onClick={() => void refreshAll()}
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-medium text-white/72 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                            >
                                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                                Aktualisieren
                            </button>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                        {laneItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setLane(item.id)}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors ${
                                    lane === item.id
                                        ? 'border-emerald-300/28 bg-emerald-400/[0.12] text-emerald-50'
                                        : 'border-white/10 bg-white/[0.035] text-white/52 hover:bg-white/[0.07] hover:text-white/76'
                                }`}
                            >
                                <item.icon size={14} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                    {isLoading ? (
                        <LoadingState />
                    ) : error ? (
                        <ErrorState error={error} onRetry={() => void refreshAll()} />
                    ) : (
                        <div className="space-y-5">
                            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(13,43,39,0.28),rgba(3,8,9,0.30))] p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Aktueller Stand</p>
                                            <h3 className="mt-2 text-lg font-medium text-white/90">{readiness.percent}% Integrationsbereit</h3>
                                            <p className="mt-2 text-sm leading-relaxed text-white/55">
                                                {readiness.ready >= 4
                                                    ? 'Die Instanz hat genug echte Quellen fuer sinnvolle Môra-Signale.'
                                                    : 'Noch wenige echte Quellen. Verbinde zuerst Browser, Kalender oder Datenquellen.'}
                                            </p>
                                        </div>
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/16 bg-emerald-400/[0.10] text-emerald-100">
                                            <PlugZap size={24} />
                                        </div>
                                    </div>
                                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.055]">
                                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#22d3ee,#fbbf24)]" style={{ width: `${readiness.percent}%` }} />
                                    </div>
                                </div>
                                <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Live-Vorschau</p>
                                    <div className="mt-4 space-y-3">
                                        <SignalLine icon={Mail} label="Mail" text={mailPreview[0] ? `${mailPreview[0].from}: ${mailPreview[0].subject}` : 'Keine aktuelle Mail sichtbar'} />
                                        <SignalLine icon={Calendar} label="Kalender" text={calendarPreview[0] ? calendarPreview[0].title : 'Kein Termin im Vorschaufenster'} />
                                        <SignalLine icon={Rss} label="Feeds" text={feedPreview[0] ? feedPreview[0].title : 'Keine Feed-Signale'} />
                                        <SignalLine icon={Cloud} label="Cloud" text={cloudPreview[0] ? cloudPreview[0].itemName : 'Keine Cloud-Datei geladen'} />
                                    </div>
                                </div>
                            </section>

                            {lane === 'overview' && (
                                <section className="space-y-4">
                                <GoogleConnectHero
                                    mailConfigured={Boolean(overview?.mail?.configured)}
                                    calendarConfigured={Boolean(overview?.calendar?.configured)}
                                    cloudConfigured={Boolean(overview?.cloud_storage?.configured)}
                                    oauthEnabled={Boolean(overview?.capabilities?.calendar_oauth_enabled)}
                                    isConnecting={isConnectingGoogle}
                                    onConnect={connectGoogleAll}
                                />
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                    <ConnectionCard
                                        icon={Bell}
                                        title="Browser"
                                        subtitle="Hinweise und Agent-Signale"
                                        status={browserBridge.permission === 'granted' ? 'connected' : browserBridge.permission === 'denied' ? 'degraded' : 'not_configured'}
                                        body={summary.browserPermissionSummary}
                                        actions={[
                                            { label: isRequestingNotifications ? 'Frage an...' : 'Freigeben', onClick: requestBrowserNotifications, disabled: !browserBridge.supported || isRequestingNotifications },
                                            { label: 'Testsignal', onClick: sendBrowserTestNotification, disabled: browserBridge.permission !== 'granted', ghost: true },
                                        ]}
                                    />
                                    <ConnectionCard
                                        icon={Mail}
                                        title="Mail"
                                        subtitle="Postfach fuer Môra"
                                        status={overview?.mail?.status}
                                        body={buildMailText(overview)}
                                        actions={[{ label: 'Mail öffnen', onClick: openMailPane }]}
                                    />
                                    <ConnectionCard
                                        icon={Calendar}
                                        title="Kalender"
                                        subtitle="Termine und Zeitkontext"
                                        status={overview?.calendar?.status}
                                        body={buildCalendarText(overview)}
                                        actions={[
                                            { label: 'Kalender öffnen', onClick: openCalendarPane },
                                            { label: isConnectingCalendar ? 'Verbinde...' : 'Google verbinden', onClick: connectGoogleCalendar, disabled: !overview?.capabilities?.calendar_oauth_enabled || isConnectingCalendar, ghost: true },
                                        ]}
                                    />
                                </div>
                                </section>
                            )}

                            {lane === 'sources' && (
                                <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                    <ConnectionCard
                                        icon={Cloud}
                                        title="Cloud"
                                        subtitle="Private externe Dateien"
                                        status={overview?.cloud_storage?.status}
                                        body={buildCloudText(overview)}
                                        meta={overview?.cloud_storage?.providers?.join(' / ') || null}
                                    />
                                    <ConnectionCard
                                        icon={Rss}
                                        title="Feeds"
                                        subtitle="News, Releases, Monitoring"
                                        status={overview?.rss?.status}
                                        body={overview?.rss?.configured ? `${overview.rss.count || 0} Quellen verbunden.` : 'Noch keine Feed-Quellen. Gut fuer Markt- und Systemsignale.'}
                                    />
                                    <ConnectionCard
                                        icon={Bot}
                                        title="Assistant"
                                        subtitle="Provider-Routing"
                                        status={overview?.assistant?.status}
                                        body={buildAssistantText(overview)}
                                        meta={overview?.assistant?.routing_profile ? `Profil: ${overview.assistant.routing_profile}` : null}
                                    />
                                    <div className="xl:col-span-3 rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-5">
                                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Provider</p>
                                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                            {assistantProviders.length > 0 ? assistantProviders.map(([provider, meta]) => (
                                                <div key={provider} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-medium text-white/85">{provider}</div>
                                                            <div className="mt-1 text-[11px] text-white/42">Priorität {meta.priority ?? '-'}</div>
                                                        </div>
                                                        <StatusPill status={meta.healthy ? 'available' : meta.available ? 'configured' : 'unavailable'} />
                                                    </div>
                                                    {meta.error ? <p className="mt-3 text-xs leading-relaxed text-red-100/75">{meta.error}</p> : null}
                                                </div>
                                            )) : (
                                                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-white/45">Keine Provider-Metadaten sichtbar.</div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {lane === 'desktop' && (
                                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
                                    <ConnectionCard
                                        icon={Cpu}
                                        title="Desktop Bridge"
                                        subtitle={localTruthBridge.isLocalSurface ? 'Lokale Instanz' : 'HQ Web-Version'}
                                        status={localTruthBridge.state}
                                        body={localTruthBridge.error || 'Lokale UI und lokaler Core werden nur in einer lokalen Session automatisch geprüft.'}
                                        meta={localTruthBridge.isLocalSurface ? summary.localTruthUrl : 'Remote-HQ scannt deinen Rechner nicht automatisch.'}
                                        actions={[
                                            { label: 'Prüfen', onClick: () => void localTruthBridge.refresh({ force: true, announce: true }) },
                                            { label: 'Oeffnen', onClick: () => safeOpen(summary.localTruthUrl), disabled: !summary.localTruthUiOpenable, ghost: true },
                                        ]}
                                    />
                                    <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-5">
                                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Runtime</p>
                                        <div className="mt-4 grid grid-cols-1 gap-3">
                                            <RuntimeRow title="UI" state={runtimeServices?.ui?.status} />
                                            <RuntimeRow title="OS Core" state={runtimeServices?.core?.status} />
                                            <RuntimeRow title="Assistant" state={runtimeServices?.assistant?.status} />
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {(['start', 'restart', 'stop'] as RuntimeAction[]).map((action) => {
                                                const actionKey = `local_truth:${action}`;
                                                return (
                                                    <button
                                                        key={action}
                                                        onClick={() => void runRuntimeAction('local_truth', action)}
                                                        disabled={!canControlRuntime || runtimeActionKey !== null}
                                                        className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-white/70 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        {runtimeActionKey === actionKey ? 'Läuft...' : runtimeActionLabels[action]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="mt-3 text-[11px] leading-relaxed text-white/42">
                                            {canControlRuntime
                                                ? 'Owner-Modus: Runtime-Aktionen werden über den Server eingereiht.'
                                                : 'Runtime-Steuerung ist nur fuer den System-Owner freigegeben.'}
                                        </p>
                                    </div>
                                </section>
                            )}

                            {lane === 'setup' && (
                                <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <SetupPanel eyebrow="Mail" title="Postfach verbinden"><EmailIntegration overviewSnapshot={overview} /></SetupPanel>
                                    <SetupPanel eyebrow="Kalender" title="Termine verbinden"><CalendarIntegration overviewSnapshot={overview} /></SetupPanel>
                                    <SetupPanel eyebrow="Feeds" title="RSS/Atom Quellen"><RssIntegration /></SetupPanel>
                                    <SetupPanel eyebrow="Cloud" title="Private Cloud-Speicher"><CloudStorageIntegration /></SetupPanel>
                                </section>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </GlassPanel>
    );
}

function StatusPill({ status }: { status?: string | null }) {
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${statusClass(status)}`}>
            {statusLabel(status)}
        </span>
    );
}

function ConnectionCard({
    icon: Icon,
    title,
    subtitle,
    status,
    body,
    meta,
    actions = [],
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    status?: string | null;
    body: string;
    meta?: string | null;
    actions?: Array<{ label: string; onClick: () => void | Promise<void>; disabled?: boolean; ghost?: boolean }>;
}) {
    return (
        <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.08] text-emerald-100">
                        <Icon size={19} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white/90">{title}</h3>
                        <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
                    </div>
                </div>
                <StatusPill status={status} />
            </div>
            <p className="mt-4 min-h-[3.2rem] text-sm leading-relaxed text-white/58">{body}</p>
            {meta ? <p className="mt-2 truncate text-[11px] text-white/34">{meta}</p> : null}
            {actions.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => void action.onClick()}
                            disabled={action.disabled}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                                action.ghost
                                    ? 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                                    : 'border-emerald-300/18 bg-emerald-400/[0.10] text-emerald-50 hover:bg-emerald-400/[0.16]'
                            }`}
                        >
                            {action.ghost ? <ExternalLink size={14} /> : <CheckCircle2 size={14} />}
                            {action.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function SignalLine({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <Icon size={15} className="shrink-0 text-emerald-100/58" />
            <span className="w-16 shrink-0 text-[11px] uppercase tracking-[0.14em] text-white/35">{label}</span>
            <span className="min-w-0 truncate text-xs text-white/64">{text}</span>
        </div>
    );
}

function RuntimeRow({ title, state }: { title: string; state?: string | null }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
            <span className="text-sm text-white/74">{title}</span>
            <StatusPill status={state} />
        </div>
    );
}

function SetupPanel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{eyebrow}</p>
            <h3 className="mt-1 text-sm font-medium text-white/84">{title}</h3>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function GoogleConnectHero({
    mailConfigured,
    calendarConfigured,
    cloudConfigured,
    oauthEnabled,
    isConnecting,
    onConnect,
}: {
    mailConfigured: boolean;
    calendarConfigured: boolean;
    cloudConfigured: boolean;
    oauthEnabled: boolean;
    isConnecting: boolean;
    onConnect: () => void | Promise<void>;
}) {
    const allConnected = mailConfigured && calendarConfigured && cloudConfigured;
    if (allConnected) return null;

    const dots: Array<{ label: string; done: boolean }> = [
        { label: 'Mail', done: mailConfigured },
        { label: 'Kalender', done: calendarConfigured },
        { label: 'Drive', done: cloudConfigured },
    ];

    return (
        <div className="relative overflow-hidden rounded-[28px] border border-emerald-400/18 bg-[linear-gradient(135deg,rgba(4,22,18,0.42),rgba(2,10,8,0.36))] p-6">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 70% 40%, #10b981 0%, transparent 65%)' }} />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/55">Schnellstart</p>
                    <h3 className="mt-2 text-lg font-medium text-white/92">Mit Google verbinden</h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/52">
                        Mail, Kalender und Drive in einem Schritt. Eine Anmeldung — Môra sieht danach echte Termine, Nachrichten und Dateien.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                        {dots.map((d) => (
                            <span
                                key={d.label}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                    d.done
                                        ? 'border-emerald-400/20 bg-emerald-400/[0.10] text-emerald-200/80'
                                        : 'border-white/10 bg-white/[0.04] text-white/40'
                                }`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${d.done ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                {d.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="shrink-0">
                    <button
                        onClick={() => void onConnect()}
                        disabled={!oauthEnabled || isConnecting}
                        className="inline-flex min-w-[200px] items-center justify-center gap-2.5 rounded-2xl border border-emerald-400/28 bg-emerald-400/[0.12] px-6 py-3.5 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-400/[0.20] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        <svg viewBox="0 0 18 18" width="16" height="16" className="shrink-0" aria-hidden>
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
                        </svg>
                        {isConnecting ? 'Verbinde...' : 'Mit Google verbinden'}
                    </button>
                    {!oauthEnabled && (
                        <p className="mt-2 text-center text-[11px] text-amber-200/55">Google OAuth muss zuerst vom Owner konfiguriert werden.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-44 animate-pulse rounded-[26px] border border-white/[0.08] bg-white/[0.035]" />
            ))}
        </div>
    );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
        <div className="rounded-[26px] border border-red-300/18 bg-red-400/[0.07] p-6">
            <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 text-red-100/80" />
                <div>
                    <h3 className="text-sm font-medium text-red-50">Integrationen konnten nicht geladen werden</h3>
                    <p className="mt-2 text-sm leading-relaxed text-red-50/70">{error}</p>
                    <button
                        onClick={onRetry}
                        className="mt-4 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/[0.12]"
                    >
                        Erneut versuchen
                    </button>
                </div>
            </div>
        </div>
    );
}
