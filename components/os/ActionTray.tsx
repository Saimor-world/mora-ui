import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, ChevronDown, Clock3, FolderOpen, Loader2, PlayCircle, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useActionEvents, type ActionStatus } from '@/lib/hooks/useActionEvents';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { NAVIGATION_ACTION_INTENT, openNavigationOutcome, type NavigationOutcome } from '@/lib/utils/searchOpen';

const statusIconMap: Record<ActionStatus, React.ReactNode> = {
    proposed: <Clock3 size={14} className="text-blue-400" />,
    running: <PlayCircle size={14} className="text-emerald-400 animate-pulse" />,
    pending_confirmation: <Clock3 size={14} className="text-amber-400" />,
    done: <CheckCircle2 size={14} className="text-emerald-500" />,
    failed: <XCircle size={14} className="text-red-400" />,
    rejected: <ShieldAlert size={14} className="text-slate-300" />,
    expired: <Clock3 size={14} className="text-slate-400" />,
};

const statusLabelMap: Record<ActionStatus, string> = {
    proposed: 'Vorgeschlagen',
    running: 'Läuft',
    pending_confirmation: 'Wartet auf Bestätigung',
    done: 'Abgeschlossen',
    failed: 'Fehlgeschlagen',
    rejected: 'Verworfen',
    expired: 'Abgelaufen',
};

const intentLabelMap: Record<string, string> = {
    create_folder: 'Ordner erstellen',
    move_node: 'Datei verschieben',
    rename_node: 'Datei umbenennen',
    create_note: 'Notiz erstellen',
    create_draft: 'Entwurf erstellen',
    update_note_content: 'Inhalt aktualisieren',
    create_node_from_file: 'Inhalt aus Datei erzeugen',
    confirm_action: 'Aktion bestätigen',
    undo: 'Aktion rückgängig machen',
    work_session_plan: 'Arbeitsplan',
    navigation_open: 'Navigation',
};

const formatTime = (ts?: string): string => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--:--';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function formatActionTraceId(actionId?: string): string | null {
    if (!actionId) return null;
    const compact = actionId.replace(/^act[_-]?/i, '');
    return compact.length > 10 ? compact.slice(0, 10) : compact;
}

type ActionEventLike = {
    action_id?: string;
    status: ActionStatus;
    intent?: string;
    actor_id?: string;
    actor_role?: string;
    session_id?: string;
    timestamp?: string;
    message: string | null;
    error: string | null;
    payload: Record<string, unknown>;
};

const trayFilters = [
    { key: 'all', label: 'Alle' },
    { key: 'active', label: 'Aktiv' },
    { key: 'done', label: 'Erledigt' },
    { key: 'rejected', label: 'Verworfen' },
    { key: 'failed', label: 'Fehler' },
] as const;
type TrayFilter = (typeof trayFilters)[number]['key'];

function extractPayloadString(payload: Record<string, unknown>, key: string): string | null {
    const value = payload?.[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function formatActionTitle(evt: ActionEventLike): string {
    const payloadTool = extractPayloadString(evt.payload, 'tool_name');
    const intent = payloadTool || evt.intent || 'system_action';
    return intentLabelMap[intent] || intent.replace(/_/g, ' ');
}

function buildBaseMessage(evt: ActionEventLike): string | null {
    const workSessionPlanId = getWorkSessionPlanId(evt);
    if (workSessionPlanId) {
        const summary = extractPayloadString(evt.payload, 'summary') || evt.message;
        const stats = typeof evt.payload?.stats === 'object' && evt.payload.stats !== null
            ? evt.payload.stats as Record<string, unknown>
            : null;
        const total = typeof stats?.total_steps === 'number' ? stats.total_steps : null;
        const read = typeof stats?.read_steps === 'number' ? stats.read_steps : null;
        const write = typeof stats?.write_steps === 'number' ? stats.write_steps : null;
        const pending = typeof stats?.pending_confirmations === 'number' ? stats.pending_confirmations : null;
        const statsSummary = [
            total ? `${total} Schritte` : null,
            read ? `${read} Lesen` : null,
            write ? `${write} Schreiben` : null,
            pending ? `${pending} Freigabe${pending === 1 ? '' : 'n'} offen` : null,
        ].filter(Boolean).join(' | ');
        if (summary && statsSummary) return `${summary} | ${statsSummary}`;
        if (summary) return summary;
        if (statsSummary) return statsSummary;
    }

    if (evt.error) return evt.error;
    if (evt.message) return evt.message;

    // Top-level promoted fields (single content-action results).
    // change_summary is the primary human-readable result from Core 6b1b301.
    const changeSummary = extractPayloadString(evt.payload, 'change_summary');
    if (changeSummary) return changeSummary;

    const topLevelResultSummary = extractPayloadString(evt.payload, 'result_summary');
    if (topLevelResultSummary) return topLevelResultSummary;

    const payloadSummary = extractPayloadString(evt.payload, 'summary');
    if (payloadSummary) {
        if (evt.status === 'done') return `${statusLabelMap.done}: ${payloadSummary}`;
        if (evt.status === 'rejected') return `${statusLabelMap.rejected}: ${payloadSummary}`;
        return payloadSummary;
    }

    const result = evt.payload?.result;
    if (result && typeof result === 'object' && result !== null) {
        const r = result as Record<string, unknown>;
        const resultSummary = extractPayloadString(r, 'result_summary') || extractPayloadString(r, 'summary');
        if (resultSummary) return resultSummary;
        const destSummary = extractPayloadString(r, 'destination_summary');
        if (destSummary) {
            const intent = extractPayloadString(evt.payload, 'tool_name') || evt.intent || '';
            return intent === 'update_note_content'
                ? `Aktualisiert in ${destSummary}`
                : `Erstellt in ${destSummary}`;
        }
    }

    const topLevelDestSummary = extractPayloadString(evt.payload, 'destination_summary');
    if (topLevelDestSummary) {
        const intent = extractPayloadString(evt.payload, 'tool_name') || evt.intent || '';
        return intent === 'update_note_content'
            ? `Aktualisiert in ${topLevelDestSummary}`
            : `Erstellt in ${topLevelDestSummary}`;
    }

    return statusLabelMap[evt.status] || null;
}

function formatActionMessage(evt: ActionEventLike): string | null {
    const base = buildBaseMessage(evt);
    if (!base) return null;

    // Learned-route prefix for intake actions only
    const isIntake = (extractPayloadString(evt.payload, 'tool_name') || evt.intent) === 'create_node_from_file';
    if (isIntake) {
        const rs = evt.payload?.route_suggestion as Record<string, unknown> | undefined;
        const ic = evt.payload?.intake_context as Record<string, unknown> | undefined;
        const routeMode = rs?.route_mode ?? ic?.route_mode;
        if (routeMode === 'learned_route') return `Gelernt: ${base}`;
    }

    return base;
}

function getWorkSessionPlanId(evt: ActionEventLike): string | null {
    const isWorkSession =
        evt.intent === 'work_session_plan' ||
        extractPayloadString(evt.payload, 'tool_name') === 'work_session_plan';
    if (!isWorkSession) return null;
    const id = evt.payload?.plan_id;
    return typeof id === 'string' && id.length > 0 ? id : null;
}

function getNavigationOutcome(evt: ActionEventLike): NavigationOutcome | null {
    const intent = extractPayloadString(evt.payload, 'tool_name') || evt.intent || '';
    if (intent !== NAVIGATION_ACTION_INTENT) return null;
    return evt.payload as unknown as NavigationOutcome;
}

function buildExpandedDetails(evt: ActionEventLike): string[] {
    const workSessionPlanId = getWorkSessionPlanId(evt);
    if (workSessionPlanId) {
        const stats = typeof evt.payload?.stats === 'object' && evt.payload.stats !== null
            ? evt.payload.stats as Record<string, unknown>
            : null;
        const scope = typeof evt.payload?.scope === 'object' && evt.payload.scope !== null
            ? evt.payload.scope as Record<string, unknown>
            : null;
        return [
            typeof evt.payload?.state === 'string' ? `Status: ${evt.payload.state}` : null,
            typeof scope?.view_level === 'string' ? `Ebene: ${scope.view_level}` : null,
            typeof scope?.active_entity_type === 'string' ? `Kontext: ${scope.active_entity_type}` : null,
            typeof stats?.total_steps === 'number' ? `Schritte: ${stats.total_steps}` : null,
            typeof stats?.pending_confirmations === 'number' ? `Freigaben offen: ${stats.pending_confirmations}` : null,
            extractPayloadString(evt.payload, 'transparency_note'),
        ].filter(Boolean) as string[];
    }

    const navigation = getNavigationOutcome(evt);
    if (navigation) {
        return [
            navigation.label ? `Ziel: ${navigation.label}` : null,
            navigation.path ? `Pfad: ${navigation.path}` : null,
            navigation.query ? `Suche: ${navigation.query}` : null,
        ].filter(Boolean) as string[];
    }

    const destSummary = extractPayloadString(evt.payload, 'destination_summary');
    const cc = typeof evt.payload?.content_change === 'object' && evt.payload.content_change !== null
        ? evt.payload.content_change as Record<string, unknown>
        : null;
    const before = (typeof cc?.before_preview === 'string' && cc.before_preview)
        ? cc.before_preview
        : extractPayloadString(evt.payload, 'previous_content_preview');
    const after = (typeof cc?.after_preview === 'string' && cc.after_preview)
        ? cc.after_preview
        : extractPayloadString(evt.payload, 'content_preview');
    return [
        destSummary ? `Ziel: ${destSummary}` : null,
        before ? `Vorher: ${before}` : null,
        after ? `Neu: ${after}` : null,
    ].filter(Boolean) as string[];
}

export const ActionTray: React.FC = () => {
    const isStandardMode = useNavStore((s) => s.isStandardMode);
    const openPane = usePaneStore((s) => s.openPane);
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<TrayFilter>('all');
    const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
    const { events, isLoading } = useActionEvents(true);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        [events]
    );
    const filteredEvents = useMemo(() => {
        if (filter === 'all') return sortedEvents;
        if (filter === 'active') {
            return sortedEvents.filter((e) => !['done', 'failed', 'rejected', 'expired'].includes(e.status));
        }
        return sortedEvents.filter((e) => e.status === filter);
    }, [filter, sortedEvents]);
    const activeCount = sortedEvents.filter((e) => !['done', 'failed', 'rejected', 'expired'].includes(e.status)).length;
    const renderStatusIcon = (status: ActionStatus) =>
        statusIconMap[status] ?? <Clock3 size={14} className="text-slate-400" />;

    return (
        <div className="relative z-[250]">
            <motion.button
                onClick={() => setIsOpen((v) => !v)}
                className={`relative p-3 rounded-xl transition-all group border ${isOpen
                    ? isStandardMode
                        ? 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : isStandardMode
                        ? 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#0078D4]/40 hover:text-[#0078D4]'
                        : 'bg-white/[0.05] border-white/10 text-white/70 hover:bg-white/[0.08] hover:border-white/20'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Action tray"
            >
                <Activity size={20} className={isOpen ? '' : 'group-hover:text-inherit'} />
                {activeCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 text-[9px] text-white font-bold items-center justify-center">
                            {activeCount > 9 ? '9+' : activeCount}
                        </span>
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-[-1]"
                            onClick={() => setIsOpen(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`absolute bottom-full mb-3 right-0 w-80 border shadow-2xl rounded-2xl overflow-hidden origin-bottom-right ${isStandardMode
                                ? 'bg-white border-gray-200'
                                : 'bg-black/95 backdrop-blur-xl border-white/10'
                                }`}
                        >
                            <div className={`px-4 py-3 border-b flex justify-between items-center ${isStandardMode ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/[0.02]'
                                }`}>
                                <div className="flex items-center gap-2">
                                    <Activity size={16} className={isStandardMode ? 'text-[#0078D4]' : 'text-blue-400'} />
                                    <h3 className={`text-sm font-semibold ${isStandardMode ? 'text-gray-800' : 'text-white/90'}`}>
                                        Aktionsverlauf
                                    </h3>
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${isStandardMode ? 'text-gray-600 bg-gray-200' : 'text-white/40 bg-white/[0.05]'
                                    }`}>
                                    Live
                                </span>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto p-2">
                                {!isLoading && sortedEvents.length > 0 && (
                                    <div className="flex flex-wrap gap-1 px-2 pb-2">
                                        {trayFilters.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => setFilter(item.key)}
                                                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                                                    filter === item.key
                                                        ? isStandardMode
                                                            ? 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/30'
                                                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                                        : isStandardMode
                                                            ? 'text-gray-500 border-gray-200 hover:border-gray-300'
                                                            : 'text-white/50 border-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {isLoading && (
                                    <div className="py-6 px-4 text-center">
                                        <Loader2 size={18} className="mx-auto animate-spin mb-2 text-blue-400" />
                                        <div className={`text-xs ${isStandardMode ? 'text-gray-500' : 'text-white/50'}`}>
                                            Aktionen werden geladen…
                                        </div>
                                    </div>
                                )}

                                {!isLoading && filteredEvents.length === 0 && (
                                    <div className="py-8 px-4 text-center">
                                        <Activity size={24} className={`mx-auto mb-2 ${isStandardMode ? 'text-gray-300' : 'text-white/20'}`} />
                                        <div className={`text-sm ${isStandardMode ? 'text-gray-500' : 'text-white/50'}`}>
                                            Keine passenden Aktionen
                                        </div>
                                        <div className={`text-[10px] mt-1 ${isStandardMode ? 'text-gray-400' : 'text-white/30'}`}>
                                            Passe den Filter an oder warte auf neue Aktivität
                                        </div>
                                    </div>
                                )}

                                {!isLoading && filteredEvents.length > 0 && (
                                    <div className="space-y-1">
                                        {filteredEvents.map((evt) => {
                                            const isExpanded = expandedActionId === evt.action_id;
                                            const navigationOutcome = getNavigationOutcome(evt);
                                            return (
                                            <div
                                                key={`${evt.action_id}:${evt.timestamp}`}
                                                className={`flex items-start gap-3 p-3 rounded-xl transition-colors border ${isStandardMode
                                                    ? 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                                                    : 'hover:bg-white/[0.04] border-transparent hover:border-white/[0.05]'
                                                    }`}
                                            >
                                                <div className="mt-0.5">{renderStatusIcon(evt.status)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1 gap-2">
                                                        <div className={`text-xs font-medium truncate mr-2 ${isStandardMode ? 'text-gray-800' : 'text-white/90'}`}>
                                                            {formatActionTitle(evt)}
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <div className={`text-[9px] whitespace-nowrap ${isStandardMode ? 'text-gray-500' : 'text-white/40'}`}>
                                                                {formatTime(evt.timestamp)}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedActionId(isExpanded ? null : evt.action_id)}
                                                                className={`p-1 rounded ${isStandardMode ? 'text-gray-400 hover:bg-gray-100' : 'text-white/40 hover:bg-white/[0.05]'}`}
                                                                aria-label="Action details"
                                                            >
                                                                <ChevronDown
                                                                    size={12}
                                                                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className={`text-[9px] uppercase tracking-wider mb-1 ${isStandardMode ? 'text-gray-500' : 'text-white/35'}`}>
                                                        {statusLabelMap[evt.status] || evt.status}
                                                    </div>
                                                    {formatActionMessage(evt) && (
                                                        <div className={`text-[10px] leading-tight ${isStandardMode ? 'text-gray-600' : 'text-white/60'}`}>
                                                            {formatActionMessage(evt)}
                                                        </div>
                                                    )}
                                                    {isExpanded && (
                                                        <div className={`mt-2 rounded-lg border p-2 text-[10px] space-y-1 ${
                                                            isStandardMode ? 'border-gray-200 bg-gray-50 text-gray-600' : 'border-white/10 bg-white/[0.03] text-white/55'
                                                        }`}>
                                                            {evt.actor_role && (
                                                                <div className="flex justify-between gap-3">
                                                                    <span className="uppercase tracking-wider text-[9px] opacity-70">Rolle</span>
                                                                    <span>{evt.actor_role}</span>
                                                                </div>
                                                            )}
                                                            {evt.timestamp && (
                                                                <div className="flex justify-between gap-3">
                                                                    <span className="uppercase tracking-wider text-[9px] opacity-70">Zeit</span>
                                                                    <span>{formatTime(evt.timestamp)}</span>
                                                                </div>
                                                            )}
                                                            {buildExpandedDetails(evt).map((detail) => (
                                                                <div key={detail} className="leading-snug">{detail}</div>
                                                            ))}
                                                            {navigationOutcome && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openNavigationOutcome(navigationOutcome, openPane)}
                                                                    className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
                                                                        isStandardMode
                                                                            ? 'border-[#0078D4]/20 bg-[#0078D4]/8 text-[#0078D4] hover:bg-[#0078D4]/12'
                                                                            : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/16'
                                                                    }`}
                                                                >
                                                                    {navigationOutcome.targetType === 'search' ? <Search size={11} /> : <FolderOpen size={11} />}
                                                                    {navigationOutcome.targetType === 'search' ? 'Suche öffnen' : 'Erneut öffnen'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {evt.error && (
                                                        <div className="text-[10px] text-red-500 leading-tight mt-1">
                                                            {evt.error}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>
                            <div className={`border-t px-3 py-2 ${isStandardMode ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/[0.02]'}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openPane({
                                            id: 'actions-main',
                                            type: 'actions',
                                            title: 'Action Center',
                                            size: { width: 920, height: 680 }
                                        });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                                        isStandardMode
                                            ? 'border-gray-200 text-[#0078D4] hover:border-[#0078D4]/40 hover:bg-white'
                                            : 'border-white/10 text-cyan-300 hover:border-cyan-400/40 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    Im Action Center öffnen
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
