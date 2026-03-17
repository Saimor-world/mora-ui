import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { EmailIntegration } from '@/components/integrations/EmailIntegration';
import { CalendarIntegration } from '@/components/integrations/CalendarIntegration';
import { coreGet } from '@/lib/api/coreClient';
import { AlertCircle, Bot, Calendar, Mail, RefreshCw, ShieldCheck } from 'lucide-react';

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
    capabilities?: {
        real_email_enabled?: boolean;
        mail_local_mode?: boolean;
        calendar_oauth_enabled?: boolean;
        owner_manageable?: boolean;
        assistant_available?: boolean;
    };
}

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
    if (mail.status === 'owner_only' || mail.status === 'forbidden_demo') {
        return 'Diese Verbindung kann nur im Eigentuemer-Kontext verwaltet werden.';
    }
    if (mail.status === 'local' || caps?.mail_local_mode) {
        return 'Lokaler Postfach-Modus aktiv. Keine externe IMAP-Synchronisation.';
    }
    if (mail.configured) {
        return mail.email ? `Verbunden mit ${mail.email}.` : 'Postfach ist eingerichtet.';
    }
    return 'Noch keine Mail-Verbindung eingerichtet.';
};

const buildCalendarDescription = (overview?: IntegrationsOverview) => {
    const calendar = overview?.calendar;
    const caps = overview?.capabilities;
    if (!calendar) return 'Kalender-Status wird geladen.';
    if (calendar.status === 'owner_only') {
        return 'Diese Verbindung kann nur im Eigentuemer-Kontext verwaltet werden.';
    }
    if (!caps?.calendar_oauth_enabled) {
        return 'Kalender-OAuth ist serverseitig noch nicht aktiviert.';
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
}> = ({ icon, title, status, description, meta }) => (
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
    </div>
);

export const IntegrationsPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const pane = getPane(id);

    const [overview, setOverview] = useState<IntegrationsOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadOverview = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await coreGet('/v3/integrations/overview');
            setOverview(data || null);
        } catch (err: any) {
            setError(err?.message || 'Integrationen konnten nicht geladen werden.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    const ownerBlocked = useMemo(() => {
        const mailBlocked = overview?.mail?.status === 'owner_only' || overview?.mail?.status === 'forbidden_demo';
        const calendarBlocked = overview?.calendar?.status === 'owner_only';
        return Boolean(mailBlocked && calendarBlocked);
    }, [overview]);

    const assistantProviders = useMemo(
        () => Object.entries(overview?.assistant?.providers || {}).sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99)),
        [overview]
    );

    if (!pane) return null;

    return (
        <GlassPanel
            title="Integrationen"
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
                            <h3 className="mt-2 text-lg font-medium text-white">Externe Dienste und Assistant-Provider</h3>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                                Mail, Kalender und LLM-Provider werden hier als betriebliche Oberflaeche zusammengezogen.
                                Die Karten zeigen den aktuellen Zustand, die Bereiche darunter bleiben die ausfuehrbaren Details.
                            </p>
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
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                <SummaryCard
                                    icon={<Mail size={18} />}
                                    title="Mail"
                                    status={overview?.mail?.status}
                                    description={buildMailDescription(overview || undefined)}
                                    meta={overview?.mail?.provider ? `Provider: ${overview.mail.provider}` : null}
                                />
                                <SummaryCard
                                    icon={<Calendar size={18} />}
                                    title="Kalender"
                                    status={overview?.calendar?.status}
                                    description={buildCalendarDescription(overview || undefined)}
                                    meta={overview?.calendar?.provider ? `Provider: ${overview.calendar.provider}` : null}
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

                            {ownerBlocked ? (
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="mt-0.5 text-white/55" size={18} />
                                        <div>
                                            <h4 className="text-sm font-medium text-white">Dieser Bereich ist im aktuellen Kontext eingeschraenkt</h4>
                                            <p className="mt-1 text-sm text-white/55">
                                                Mail- und Kalender-Integrationen koennen nur im Eigentuemer-Kontext verwaltet werden.
                                                Die Assistant-Uebersicht bleibt sichtbar, aber die ausfuehrbaren Verbindungen sind hier gesperrt.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
                            )}
                        </div>
                    )}
                </div>
            </div>
        </GlassPanel>
    );
};
