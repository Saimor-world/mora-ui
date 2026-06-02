"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BookMarked, CheckCircle, CheckCircle2, ChevronDown, Clock3, History, Loader2, PlayCircle, Search, ShieldAlert, Sparkles, UserRound, XCircle } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import { confirmCreateNodeFromFile, rejectCreateNodeFromFile } from '@/lib/api/filesClient';
import type { ActionEvent, ActionStatus } from '@/lib/hooks/useActionEvents';
import { NAVIGATION_RESULT_EVENT, openNavigationOutcome, type NavigationOutcome } from '@/lib/utils/searchOpen';
import { toast } from '@/lib/toast';
import type { AppProps } from '@/lib/apps/types';
import {
    navigationOutcomeToActionEvent,
    getWorkSessionPlanId,
    getNavigationOutcome,
    getIntakeRoute,
    getIntakeFileName,
    getConfirmationToken,
    getPendingFileId,
    getIntakeRouteMode,
    getIntakeRouteReason,
    canActOnPendingEvent,
    groupIntakeBatches,
} from '@/lib/actionCenter/events';
import {
    statusLabelMap,
    intentLabelMap,
    formatActionTitle,
    formatActionMessage,
    formatTime,
    formatBatchTime,
    formatRole,
} from '@/lib/actionCenter/format';

type ActionFilter = 'all' | 'active' | 'done' | 'rejected' | 'failed';
type RoleFilter = 'all' | 'owner' | 'admin' | 'manager' | 'member' | 'system';
type IntentFilter = 'all' | 'intake' | 'create_folder' | 'move_node' | 'rename_node' | 'create_note' | 'create_draft' | 'update_note_content' | 'confirm_action' | 'undo' | 'work_session_plan';

// ─── Intake batch grouping ────────────────────────────────────────────────────

// ─── Formatting helpers ───────────────────────────────────────────────────────

const statusIconMap: Record<ActionStatus, React.ReactNode> = {
    proposed: <Clock3 size={14} className="text-blue-400" />,
    running: <PlayCircle size={14} className="text-emerald-400" />,
    pending_confirmation: <Clock3 size={14} className="text-amber-400" />,
    done: <CheckCircle2 size={14} className="text-emerald-500" />,
    failed: <XCircle size={14} className="text-red-400" />,
    rejected: <ShieldAlert size={14} className="text-slate-300" />,
    expired: <Clock3 size={14} className="text-slate-400" />,
};

const groupStatusMap: Record<Exclude<ActionFilter, 'all'>, ActionStatus[]> = {
    active: ['proposed', 'running', 'pending_confirmation'],
    done: ['done'],
    rejected: ['rejected', 'expired'],
    failed: ['failed'],
};

const roleFilters: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'Alle Rollen' },
    { key: 'owner', label: 'Owner' },
    { key: 'admin', label: 'Admin' },
    { key: 'manager', label: 'Manager' },
    { key: 'member', label: 'Member' },
    { key: 'system', label: 'System' },
];

const intentFilters: { key: IntentFilter; label: string }[] = [
    { key: 'all', label: 'Alle Aktionen' },
    { key: 'intake', label: 'Mycelium Intake' },
    { key: 'create_folder', label: 'Ordner erstellen' },
    { key: 'move_node', label: 'Datei verschieben' },
    { key: 'rename_node', label: 'Datei umbenennen' },
    { key: 'create_note', label: 'Notiz erstellen' },
    { key: 'create_draft', label: 'Entwurf erstellen' },
    { key: 'update_note_content', label: 'Inhalt aktualisieren' },
    { key: 'confirm_action', label: 'Bestätigen' },
    { key: 'undo', label: 'Rückgängig' },
    { key: 'work_session_plan', label: 'Arbeitsplan' },
];

const statusFilters: { key: ActionFilter; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'active', label: 'Aktiv' },
    { key: 'done', label: 'Erledigt' },
    { key: 'rejected', label: 'Verworfen' },
    { key: 'failed', label: 'Fehler' },
];

function renderOperationCards(items: Record<string, unknown>[], heading: string, actionId: string): React.ReactNode {
    if (items.length === 0) return null;
    return (
        <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">{heading}</div>
            <div className="mt-2 space-y-2">
                {items.map((op, index) => {
                    const type = typeof op.type === 'string' ? op.type : 'operation';
                    const folder = typeof op.folder === 'object' && op.folder ? (op.folder as Record<string, unknown>) : null;
                    const node = typeof op.node === 'object' && op.node ? (op.node as Record<string, unknown>) : null;
                    const line =
                        type === 'create_folder'
                            ? `Ordner: ${folder?.name || op.name || '-'}`
                            : type === 'move_node'
                                ? `Dokument: ${node?.title || node?.name || op.node_name || op.node_id || '-'}`
                                : type === 'rename_node'
                                    ? `${op.old_name || op.node_name || node?.title || node?.name || op.node_id || '-'} ? ${op.new_name || node?.title || node?.name || '-'}`
                                    : type === 'create_note'
                                        ? `Notiz: ${op.title || node?.title || node?.name || '-'}`
                                        : type === 'create_draft'
                                            ? `Entwurf: ${op.title || node?.title || node?.name || '-'}`
                                            : type === 'update_note_content'
                                                ? `Inhalt: ${op.node_name || node?.title || node?.name || op.node_id || '-'}`
                                                : type.replace(/_/g, ' ');
                    const details =
                        type === 'move_node'
                            ? [
                                `Quelle: ${op.source_folder_name || op.source_folder_id || '-'}`,
                                `Ziel: ${op.target_folder_name || op.target_folder_id || node?.folder_id || '-'}`,
                            ]
                            : type === 'create_folder'
                                ? [`?bergeordnet: ${op.parent_folder_name || op.parent_folder_id || folder?.parent_folder_id || op.space_id || folder?.space_id || '-'}`]
                                : type === 'rename_node'
                                    ? [
                                        `Vorher: ${op.old_name || op.node_name || '-'}`,
                                        `Nachher: ${op.new_name || node?.title || node?.name || '-'}`,
                                    ]
                                    : type === 'create_note' || type === 'create_draft'
                                        ? [
                                            `Ziel: ${op.destination_label || op.destination_summary || '-'}`,
                                            ...(typeof op.content_preview === 'string' && op.content_preview ? [`Inhalt: ${op.content_preview}`] : []),
                                        ]
                                        : type === 'update_note_content'
                                            ? (() => {
                                                const cc = op.content_change as Record<string, unknown> | undefined;
                                                const before = (typeof cc?.before_preview === 'string' && cc.before_preview) ? cc.before_preview : (typeof op.previous_content_preview === 'string' ? op.previous_content_preview : null);
                                                const after = (typeof cc?.after_preview === 'string' && cc.after_preview) ? cc.after_preview : (typeof op.content_preview === 'string' ? op.content_preview : null);
                                                return [
                                                    `Ziel: ${op.destination_label || op.destination_summary || '-'}`,
                                                    ...(before ? [`Vorher: ${before}`] : []),
                                                    ...(after ? [`Neu: ${after}`] : []),
                                                ];
                                            })()
                                            : [];
                    return (
                        <div key={`${actionId}-${heading}-${type}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                            <div className="text-[11px] font-medium text-white/80">{line}</div>
                            {details.length > 0 && (
                                <div className="mt-1 space-y-1">
                                    {details.map((detail) => (
                                        <div key={detail} className="text-[11px] text-white/50">{detail}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function renderActionResultDetails(evt: ActionEvent): React.ReactNode {
    const workSessionPlanId = getWorkSessionPlanId(evt);
    if (workSessionPlanId) {
        const stats = typeof evt.payload?.stats === 'object' && evt.payload.stats !== null
            ? evt.payload.stats as Record<string, unknown>
            : null;
        const scope = typeof evt.payload?.scope === 'object' && evt.payload.scope !== null
            ? evt.payload.scope as Record<string, unknown>
            : null;
        const details = [
            typeof evt.payload?.state === 'string' ? `Status: ${evt.payload.state}` : null,
            typeof scope?.view_level === 'string' ? `Ebene: ${scope.view_level}` : null,
            typeof scope?.active_entity_type === 'string' ? `Kontext: ${scope.active_entity_type}` : null,
            typeof stats?.total_steps === 'number' ? `Schritte: ${stats.total_steps}` : null,
            typeof stats?.read_steps === 'number' ? `Lesen: ${stats.read_steps}` : null,
            typeof stats?.write_steps === 'number' ? `Schreiben: ${stats.write_steps}` : null,
            typeof stats?.pending_confirmations === 'number' ? `Freigaben offen: ${stats.pending_confirmations}` : null,
            typeof evt.payload?.transparency_note === 'string' && evt.payload.transparency_note.trim()
                ? evt.payload.transparency_note
                : null,
        ].filter(Boolean) as string[];
        if (details.length === 0) return null;
        return (
            <div className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Arbeitsplan</div>
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 space-y-1">
                    {details.map((detail) => (
                        <div key={detail} className="text-[11px] text-white/65">{detail}</div>
                    ))}
                </div>
            </div>
        );
    }

    const navigation = getNavigationOutcome(evt);
    if (navigation) {
        const details = [
            navigation.label ? `Ziel: ${navigation.label}` : null,
            navigation.path ? `Pfad: ${navigation.path}` : null,
            navigation.query ? `Suche: ${navigation.query}` : null,
        ].filter(Boolean) as string[];
        if (details.length === 0) return null;
        return (
            <div className="md:col-span-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Navigation</div>
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 space-y-1">
                    {details.map((detail) => (
                        <div key={detail} className="text-[11px] text-white/65">{detail}</div>
                    ))}
                </div>
            </div>
        );
    }

    const result = evt.payload?.result;
    const operationsExecuted = Array.isArray((result as Record<string, unknown> | undefined)?.operations_executed)
        ? ((result as Record<string, unknown>).operations_executed as Record<string, unknown>[])
        : [];
    const operations = Array.isArray(evt.payload?.operations) ? (evt.payload.operations as Record<string, unknown>[]) : [];
    const _payloadCC = typeof evt.payload?.content_change === 'object' && evt.payload.content_change !== null
        ? evt.payload.content_change as Record<string, unknown>
        : null;
    const _beforePreview = (typeof _payloadCC?.before_preview === 'string' && _payloadCC.before_preview)
        ? _payloadCC.before_preview
        : (typeof evt.payload?.previous_content_preview === 'string' && evt.payload.previous_content_preview ? evt.payload.previous_content_preview as string : null);
    const _afterPreview = (typeof _payloadCC?.after_preview === 'string' && _payloadCC.after_preview)
        ? _payloadCC.after_preview
        : (typeof evt.payload?.content_preview === 'string' && evt.payload.content_preview ? evt.payload.content_preview as string : null);
    const promotedDetails = [
        typeof evt.payload?.destination_summary === 'string' && evt.payload.destination_summary
            ? `Ziel: ${evt.payload.destination_summary}`
            : null,
        _beforePreview ? `Vorher: ${_beforePreview}` : null,
        _afterPreview ? `Neu: ${_afterPreview}` : null,
    ].filter(Boolean) as string[];
    if (operations.length === 0 && operationsExecuted.length === 0 && promotedDetails.length === 0) return null;
    return (
        <>
            {promotedDetails.length > 0 && (
                <div className="md:col-span-2">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Ergebnis</div>
                    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 space-y-1">
                        {promotedDetails.map((detail) => (
                            <div key={detail} className="text-[11px] text-white/65">{detail}</div>
                        ))}
                    </div>
                </div>
            )}
            {renderOperationCards(operations, 'Plan', evt.action_id)}
            {renderOperationCards(operationsExecuted, 'Ergebnis', evt.action_id)}
        </>
    );
}

// ─── Verlauf (P5b) ───────────────────────────────────────────────────────────

interface JournalRun {
    event_id: string;
    tool_name: string | null;
    intent: string | null;
    change_summary: string | null;
    actor_id: string | null;
    ok: number | null;
    started_at: string | null;
    finished_at: string | null;
    input_json: string | null;
    output_json: string | null;
    affected_entities: unknown[];
    plan_id: string | null;
    message_id: string | null;
}

function formatDuration(started?: string | null, finished?: string | null): string {
    if (!started || !finished) return '';
    const ms = new Date(finished).getTime() - new Date(started).getTime();
    if (ms < 0) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function VerlaufTab() {
    const [runs, setRuns] = useState<JournalRun[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [promoting, setPromoting] = useState<string | null>(null);
    const [promoted, setPromoted] = useState<Set<string>>(new Set());
    const [okFilter, setOkFilter] = useState<'all' | 'ok' | 'failed'>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '80' });
            if (okFilter === 'ok') params.set('ok', 'true');
            if (okFilter === 'failed') params.set('ok', 'false');
            const res = await coreGet(`/v3/mora/journal?${params}`);
            setRuns(Array.isArray(res?.runs) ? (res.runs as JournalRun[]) : []);
        } catch {
            setRuns([]);
        } finally {
            setLoading(false);
        }
    }, [okFilter]);

    useEffect(() => { void load(); }, [load]);

    const handlePromote = useCallback(async (journalId: string) => {
        setPromoting(journalId);
        try {
            await corePost('/v3/mora/journal/promote', { journal_id: journalId });
            setPromoted((prev) => new Set([...prev, journalId]));
            toast.success('In Mora-Gedächtnis gespeichert');
        } catch {
            toast.error('Merken fehlgeschlagen');
        } finally {
            setPromoting(null);
        }
    }, []);

    return (
        <div className="flex h-full flex-col gap-3">
            {/* Filter bar */}
            <div className="flex items-center gap-2">
                {(['all', 'ok', 'failed'] as const).map((f) => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setOkFilter(f)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${okFilter === f
                            ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                            : 'border-white/10 text-white/55 hover:border-white/20 hover:text-white/75'
                        }`}
                    >
                        {f === 'all' ? 'Alle' : f === 'ok' ? 'Erfolgreich' : 'Fehler'}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => void load()}
                    className="ml-auto rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-cyan-300 hover:border-cyan-400/40"
                >
                    Aktualisieren
                </button>
            </div>

            {/* Run list */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
                {loading ? (
                    <div className="flex h-full items-center justify-center text-white/50">
                        <Loader2 size={18} className="mr-2 animate-spin text-cyan-300" />
                        Lade Verlauf…
                    </div>
                ) : runs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-white/45">
                        <History size={26} className="text-white/20" />
                        <div className="text-sm">Noch keine Werkzeug-Ausführungen</div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {runs.map((run) => {
                            const isOk = run.ok === 1;
                            const expanded = expandedId === run.event_id;
                            const duration = formatDuration(run.started_at, run.finished_at);
                            const alreadyMerked = promoted.has(run.event_id);
                            return (
                                <div key={run.event_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 shrink-0">
                                            {isOk
                                                ? <CheckCircle2 size={14} className="text-emerald-500" />
                                                : <XCircle size={14} className="text-red-400" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium text-white/90">
                                                        {run.change_summary || run.intent || run.tool_name || '—'}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                                                        {run.tool_name && <span className="font-mono">{run.tool_name}</span>}
                                                        {duration && <span>{duration}</span>}
                                                        {run.started_at && (
                                                            <span>{formatTime(run.started_at)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {isOk && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handlePromote(run.event_id)}
                                                            disabled={!!promoting || alreadyMerked}
                                                            title={alreadyMerked ? 'Bereits gemerkt' : 'In Gedächtnis speichern'}
                                                            className={`rounded-lg p-1 transition-colors ${alreadyMerked
                                                                ? 'text-violet-400'
                                                                : 'text-white/30 hover:bg-white/[0.05] hover:text-violet-300'
                                                            } disabled:cursor-not-allowed disabled:opacity-50`}
                                                        >
                                                            {promoting === run.event_id
                                                                ? <Loader2 size={13} className="animate-spin" />
                                                                : <BookMarked size={13} />}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedId(expanded ? null : run.event_id)}
                                                        className="rounded-lg p-1 text-white/40 hover:bg-white/[0.05] hover:text-white/70"
                                                    >
                                                        <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            {expanded && (
                                                <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px]">
                                                    {run.input_json && (
                                                        <div>
                                                            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Eingabe</div>
                                                            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-white/60">
                                                                {run.input_json}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {run.output_json && (
                                                        <div>
                                                            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Ausgabe</div>
                                                            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-white/60">
                                                                {run.output_json}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {run.affected_entities.length > 0 && (
                                                        <div>
                                                            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Betroffene Entitäten</div>
                                                            <div className="text-white/60">{JSON.stringify(run.affected_entities)}</div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-4 text-white/40">
                                                        <span>ID: <span className="font-mono">{run.event_id}</span></span>
                                                        {run.plan_id && <span>Plan: <span className="font-mono">{run.plan_id}</span></span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ActionCenterApp({ paneId }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);

    const [tab, setTab] = useState<'aktionen' | 'verlauf'>('aktionen');

    const [events, setEvents] = useState<ActionEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ActionFilter>('all');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [intentFilter, setIntentFilter] = useState<IntentFilter>('all');
    const [sessionFilter, setSessionFilter] = useState('');
    const [query, setQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedBatchKey, setExpandedBatchKey] = useState<string | null>(null);
    const [pendingActionState, setPendingActionState] = useState<Record<string, 'confirming' | 'rejecting'>>({});

    const loadEvents = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setIsLoading(true);
        setError(null);
        try {
            const queryParts = ['limit=120'];
            if (roleFilter !== 'all') {
                queryParts.push(`actor_role=${encodeURIComponent(roleFilter === 'system' ? 'system_owner' : roleFilter)}`);
            }
            if (intentFilter !== 'all') {
                const backendIntent = intentFilter === 'intake' ? 'create_node_from_file' : intentFilter;
                queryParts.push(`intent=${encodeURIComponent(backendIntent)}`);
            }
            if (sessionFilter.trim()) {
                queryParts.push(`session_id=${encodeURIComponent(sessionFilter.trim())}`);
            }
            const res = await coreGet(`/v3/actions/events?${queryParts.join('&')}`);
            const nextEvents = Array.isArray(res?.events) ? res.events as ActionEvent[] : [];
            setEvents(nextEvents);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Aktionsverlauf konnte nicht geladen werden.');
        } finally {
            if (!opts?.silent) setIsLoading(false);
        }
    }, [intentFilter, roleFilter, sessionFilter]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    useEffect(() => {
        const handleActionStatus = () => { void loadEvents({ silent: true }); };
        const handleInboxRefresh = () => { void loadEvents({ silent: true }); };
        realtime.on('action_status', handleActionStatus);
        window.addEventListener('saimor:inbox-refresh', handleInboxRefresh);
        const handleNavigationResult = (event: Event) => {
            const detail = (event as CustomEvent<NavigationOutcome>).detail;
            if (!detail) return;
            const evt = navigationOutcomeToActionEvent(detail);
            setEvents((prev) => [evt, ...prev]);
        };
        window.addEventListener(NAVIGATION_RESULT_EVENT, handleNavigationResult as EventListener);
        return () => {
            realtime.off('action_status', handleActionStatus);
            window.removeEventListener('saimor:inbox-refresh', handleInboxRefresh);
            window.removeEventListener(NAVIGATION_RESULT_EVENT, handleNavigationResult as EventListener);
        };
    }, [loadEvents]);

    const filteredEvents = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return events.filter((evt) => {
            if (statusFilter !== 'all' && !groupStatusMap[statusFilter].includes(evt.status)) return false;
            if (normalizedQuery) {
                const haystack = [
                    evt.intent,
                    evt.actor_role,
                    formatActionTitle(evt),
                    formatActionMessage(evt),
                    getIntakeRoute(evt),
                    getIntakeFileName(evt),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(normalizedQuery)) return false;
            }
            return true;
        });
    }, [events, query, statusFilter]);

    const intakeBatches = useMemo(
        () => (intentFilter === 'intake' ? groupIntakeBatches(filteredEvents) : []),
        [intentFilter, filteredEvents]
    );

    const summary = useMemo(() => ({
        total: events.length,
        active: events.filter((evt) => groupStatusMap.active.includes(evt.status)).length,
        done: events.filter((evt) => evt.status === 'done').length,
        rejected: events.filter((evt) => evt.status === 'rejected' || evt.status === 'expired').length,
        failed: events.filter((evt) => evt.status === 'failed').length,
    }), [events]);

    const resolveActionEndpoint = useCallback(async (evt: ActionEvent, mode: 'confirm' | 'reject') => {
        const token = getConfirmationToken(evt);
        if (!token) throw new Error('Bestätigungstoken fehlt');

        if (evt.intent === 'create_node_from_file') {
            const fileId = getPendingFileId(evt);
            if (!fileId) throw new Error('Datei-ID fehlt');
            if (mode === 'confirm') {
                await confirmCreateNodeFromFile(fileId, token);
            } else {
                await rejectCreateNodeFromFile(fileId, token);
            }
            return;
        }

        const endpoint = mode === 'confirm' ? '/v3/actions/confirm' : '/v3/actions/reject';
        await corePost(endpoint, { confirmation_token: token });
    }, []);

    const handlePendingAction = useCallback(async (evt: ActionEvent, mode: 'confirm' | 'reject') => {
        const actionId = evt.action_id;
        setPendingActionState((prev) => ({ ...prev, [actionId]: mode === 'confirm' ? 'confirming' : 'rejecting' }));
        try {
            await resolveActionEndpoint(evt, mode);
            toast.success(mode === 'confirm' ? 'Aktion bestätigt' : 'Aktion verworfen');
            await loadEvents({ silent: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : (mode === 'confirm' ? 'Aktion konnte nicht bestätigt werden.' : 'Aktion konnte nicht verworfen werden.');
            toast.error(message);
        } finally {
            setPendingActionState((prev) => {
                const next = { ...prev };
                delete next[actionId];
                return next;
            });
        }
    }, [loadEvents, resolveActionEndpoint]);

    if (!pane) return null;

    const showIntakeView = intentFilter === 'intake';

    return (
        <GlassPanel
            title="Action Center"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
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
            paneId={paneId}
        >
            <div className="flex h-full flex-col gap-4">
                {/* Tab bar */}
                <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    {([['aktionen', 'Aktionen'], ['verlauf', 'Verlauf']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${tab === key
                                ? 'bg-white/10 text-white/90'
                                : 'text-white/45 hover:text-white/65'
                            }`}
                        >
                            {key === 'aktionen' ? <Activity size={12} /> : <History size={12} />}
                            {label}
                        </button>
                    ))}
                </div>

                {/* Verlauf tab */}
                {tab === 'verlauf' && <VerlaufTab />}

                {/* Aktionen tab content (hidden when verlauf active) */}
                {tab === 'aktionen' && <>

                {/* Summary tiles */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                    {[
                        { label: 'Gesamt', value: summary.total },
                        { label: 'Aktiv', value: summary.active },
                        { label: 'Erledigt', value: summary.done },
                        { label: 'Verworfen', value: summary.rejected },
                        { label: 'Fehler', value: summary.failed },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">{item.label}</div>
                            <div className="mt-2 text-2xl font-semibold text-white/90">{item.value}</div>
                        </div>
                    ))}
                </div>

                {/* Filter bar */}
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-1 items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Nach Aktion suchen"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white/85 placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => loadEvents()}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-cyan-300 transition-colors hover:border-cyan-400/40 hover:bg-white/[0.06]"
                        >
                            Aktualisieren
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {!showIntakeView && statusFilters.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setStatusFilter(item.key)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${statusFilter === item.key
                                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                                    : 'border-white/10 text-white/55 hover:border-white/20 hover:text-white/75'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                        {!showIntakeView && (
                            <div className="relative">
                                <UserRound size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                                    className="rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-8 pr-8 text-[11px] text-white/70 focus:border-cyan-400/40 focus:outline-none"
                                >
                                    {roleFilters.map((item) => (
                                        <option key={item.key} value={item.key}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <select
                            value={intentFilter}
                            onChange={(e) => {
                                const next = e.target.value as IntentFilter;
                                setIntentFilter(next);
                                setExpandedBatchKey(null);
                                if (next === 'intake') setStatusFilter('all');
                            }}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 focus:border-cyan-400/40 focus:outline-none"
                        >
                            {intentFilters.map((item) => (
                                <option key={item.key} value={item.key}>{item.label}</option>
                            ))}
                        </select>
                        {!showIntakeView && (
                            <input
                                type="text"
                                value={sessionFilter}
                                onChange={(e) => setSessionFilter(e.target.value)}
                                placeholder="Session-ID"
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
                            />
                        )}
                    </div>
                </div>

                {/* Event list */}
                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-white/50">
                            <Loader2 size={18} className="mr-2 animate-spin text-cyan-300" />
                            Lade Aktionsverlauf…
                        </div>
                    ) : error ? (
                        <div className="flex h-full items-center justify-center text-sm text-red-300">{error}</div>
                    ) : showIntakeView ? (
                        intakeBatches.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/45">
                                <Sparkles size={26} className="text-white/20" />
                                <div className="text-sm">Noch keine Einordnungs-Batches</div>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">
                                    Dateien über Mycelium oder den Scanner einordnen
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {intakeBatches.map((batch) => {
                                    const isExpanded = expandedBatchKey === batch.batchKey;
                                    const allDone = batch.confirmed === batch.events.length;
                                    const allRejected = batch.rejected === batch.events.length;
                                    const allPending = batch.pending === batch.events.length;
                                    const summaryText = allDone
                                        ? `${batch.confirmed} ${batch.confirmed === 1 ? 'Datei eingeordnet' : 'Dateien eingeordnet'}`
                                        : allRejected
                                            ? `${batch.rejected} ${batch.rejected === 1 ? 'Datei verworfen' : 'Dateien verworfen'}`
                                            : allPending
                                                ? `${batch.pending} ${batch.pending === 1 ? 'Datei wartet auf Freigabe' : 'Dateien warten auf Freigabe'}`
                                                : [
                                                    batch.confirmed > 0 && `${batch.confirmed} eingeordnet`,
                                                    batch.rejected > 0 && `${batch.rejected} verworfen`,
                                                    batch.failed > 0 && `${batch.failed} fehlgeschlagen`,
                                                    batch.pending > 0 && `${batch.pending} ausstehend`,
                                                ].filter(Boolean).join(' · ');

                                    return (
                                        <div
                                            key={batch.batchKey}
                                            className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] overflow-hidden"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setExpandedBatchKey(isExpanded ? null : batch.batchKey)}
                                                className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/[0.03] transition-colors"
                                            >
                                                <Sparkles size={14} className="text-emerald-300 mt-0.5 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/70 font-medium">
                                                            {formatBatchTime(batch.timestamp)}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-white/35">
                                                                {batch.events.length} {batch.events.length === 1 ? 'Datei' : 'Dateien'}
                                                            </span>
                                                            <ChevronDown
                                                                size={13}
                                                                className={`text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-1 text-sm text-white/75">{summaryText}</div>
                                                    {batch.routes.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {batch.routes.slice(0, 3).map((route) => (
                                                                <span
                                                                    key={route}
                                                                    className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-100/80"
                                                                >
                                                                    {route}
                                                                </span>
                                                            ))}
                                                            {batch.routes.length > 3 && (
                                                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                                                                    +{batch.routes.length - 3} weitere
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-white/5 divide-y divide-white/5">
                                                    {batch.events.map((evt) => {
                                                        const fileName = getIntakeFileName(evt) ?? formatActionTitle(evt);
                                                        const route = getIntakeRoute(evt);
                                                        const isDone = evt.status === 'done';
                                                        const isRejected = evt.status === 'rejected' || evt.status === 'expired';
                                                        const isPending = canActOnPendingEvent(evt);
                                                        const state = pendingActionState[evt.action_id];
                                                        return (
                                                            <div
                                                                key={evt.action_id}
                                                                className="flex items-start gap-3 px-4 py-2.5"
                                                            >
                                                                <div className="mt-0.5 shrink-0">
                                                                    {isDone
                                                                        ? <CheckCircle size={13} className="text-emerald-400" />
                                                                        : isRejected
                                                                            ? <XCircle size={13} className="text-white/30" />
                                                                            : statusIconMap[evt.status]}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <span className="truncate text-[12px] text-white/80">{fileName}</span>
                                                                        {getIntakeRouteMode(evt) === 'learned_route' && (
                                                                            <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-500/12 px-1.5 py-0.5 text-[9px] text-violet-300/80">
                                                                                Gelernt
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {route && (
                                                                        <div className="truncate text-[11px] text-white/40 mt-0.5">{route}</div>
                                                                    )}
                                                                    {getIntakeRouteReason(evt) && (
                                                                        <div className="truncate text-[11px] text-white/30 mt-0.5 italic">
                                                                            {getIntakeRouteReason(evt)}
                                                                        </div>
                                                                    )}
                                                                    {isPending && (
                                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void handlePendingAction(evt, 'confirm')}
                                                                                disabled={!!state}
                                                                                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                {state === 'confirming' ? 'Bestätigt…' : 'Bestätigen'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void handlePendingAction(evt, 'reject')}
                                                                                disabled={!!state}
                                                                                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                {state === 'rejecting' ? 'Verwerfe…' : 'Verwerfen'}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="shrink-0 text-[10px] text-white/30">
                                                                    {formatTime(evt.timestamp)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : filteredEvents.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/45">
                            <Activity size={26} className="text-white/20" />
                            <div className="text-sm">Keine passenden Aktionen gefunden</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">
                                Filter oder Suchbegriff anpassen
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredEvents.map((evt) => {
                                const expanded = expandedId === evt.action_id;
                                const actionMessage = formatActionMessage(evt);
                                const isPending = canActOnPendingEvent(evt);
                                const state = pendingActionState[evt.action_id];
                                const navigationOutcome = getNavigationOutcome(evt);
                                return (
                                    <div key={`${evt.action_id}:${evt.timestamp}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">{statusIconMap[evt.status]}</div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-white/90">
                                                            {formatActionTitle(evt)}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                                                            <span>{statusLabelMap[evt.status]}</span>
                                                            {evt.actor_role && <span>{formatRole(evt.actor_role)}</span>}
                                                            <span>{formatTime(evt.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedId(expanded ? null : evt.action_id)}
                                                        className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                                                        aria-label="Action details"
                                                    >
                                                        <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                                {actionMessage && (
                                                    <div className="mt-2 text-sm leading-snug text-white/65">{actionMessage}</div>
                                                )}
                                                {isPending && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => void handlePendingAction(evt, 'confirm')}
                                                            disabled={!!state}
                                                            className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200 transition-colors hover:border-emerald-300/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {state === 'confirming' ? 'Bestätigt…' : 'Bestätigen'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handlePendingAction(evt, 'reject')}
                                                            disabled={!!state}
                                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {state === 'rejecting' ? 'Verwerfe…' : 'Verwerfen'}
                                                        </button>
                                                    </div>
                                                )}
                                                {expanded && (
                                                    <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/60 md:grid-cols-2">
                                                        <div>
                                                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Aktion</div>
                                                            <div className="mt-1 text-white/75">{intentLabelMap[evt.intent ?? ''] || (evt.intent ?? '-')}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Rolle</div>
                                                            <div className="mt-1 text-white/75">{evt.actor_role || '-'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Session</div>
                                                            <div className="mt-1 break-all font-mono text-white/75">{evt.session_id || '-'}</div>
                                                        </div>
                                                        {navigationOutcome && (
                                                            <div className="md:col-span-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openNavigationOutcome(navigationOutcome, openPane)}
                                                                    className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-200 transition-colors hover:bg-cyan-500/18"
                                                                >
                                                                    {navigationOutcome.targetType === 'search' ? <Search size={12} /> : <CheckCircle size={12} />}
                                                                    {navigationOutcome.targetType === 'search' ? 'Suche öffnen' : 'Erneut öffnen'}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {renderActionResultDetails(evt)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                </> /* end aktionen tab */}
            </div>
        </GlassPanel>
    );
}
