"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle, CheckCircle2, ChevronDown, Clock3, Loader2, PlayCircle, Search, ShieldAlert, Sparkles, UserRound, XCircle } from 'lucide-react';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import type { ActionEvent, ActionStatus } from '@/lib/hooks/useActionEvents';

type ActionFilter = 'all' | 'active' | 'done' | 'rejected' | 'failed';
type RoleFilter = 'all' | 'owner' | 'admin' | 'manager' | 'member' | 'system';
type IntentFilter = 'all' | 'intake' | 'create_folder' | 'move_node' | 'rename_node' | 'confirm_action' | 'undo';

// ─── Intake batch grouping ────────────────────────────────────────────────────

interface IntakeBatch {
    batchKey: string;
    events: ActionEvent[];
    timestamp: string;
    confirmed: number;
    rejected: number;
    failed: number;
    routes: string[];
}

function isIntakeEvent(evt: ActionEvent): boolean {
    const tool = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : '';
    return tool === 'create_node_from_file' || evt.intent === 'create_node_from_file';
}

function getIntakeRoute(evt: ActionEvent): string | null {
    // payload.intake_context is top-level (confirmed by Codex 2331018)
    const ic = evt.payload?.intake_context as Record<string, unknown> | undefined;
    if (ic) {
        const path = [ic.target_department_name, ic.target_space_name, ic.target_folder_name]
            .filter(Boolean)
            .join(' > ');
        if (path) return path;
        if (typeof ic.suggested_location === 'string') return ic.suggested_location;
    }
    // Fallback: payload.route_suggestion (also top-level, provided by Codex)
    const rs = evt.payload?.route_suggestion as Record<string, unknown> | undefined;
    if (rs) {
        const path = [rs.department_name, rs.space_name, rs.folder_name]
            .filter(Boolean)
            .join(' > ');
        if (path) return path;
        if (typeof rs.location === 'string') return rs.location;
    }
    return null;
}

function getIntakeFileName(evt: ActionEvent): string | null {
    const p = evt.payload;
    if (typeof p?.filename === 'string') return p.filename;
    if (typeof p?.file_name === 'string') return p.file_name;
    if (typeof p?.name === 'string') return p.name;
    const ic = p?.intake_context as Record<string, unknown> | undefined;
    if (typeof ic?.filename === 'string') return ic.filename;
    return null;
}

/**
 * Groups intake events into batches.
 * Hierarchy (Codex confirmed batch_id as canonical key, 2331018):
 *   1. batch_id  — direct, single-file batches are valid (no ≥2 threshold)
 *   2. session_id — fallback for events pre-dating batch_id field
 *   3. 90s time window — graceful degradation for historical data
 */
function groupIntakeBatches(events: ActionEvent[]): IntakeBatch[] {
    const intake = events.filter(isIntakeEvent);
    const sorted = [...intake].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Primary: group by batch_id (canonical since Codex 379cb8c)
    const batchMap = new Map<string, ActionEvent[]>();
    const noBatch: ActionEvent[] = [];
    sorted.forEach((evt) => {
        const key = evt.batch_id ?? evt.session_id;
        if (key) {
            const g = batchMap.get(key) ?? [];
            g.push(evt);
            batchMap.set(key, g);
        } else {
            noBatch.push(evt);
        }
    });

    const batchedGroups: ActionEvent[][] = [];
    const unbatchedEvents: ActionEvent[] = [];
    batchMap.forEach((evts, key) => {
        // session_id without batch_id: require ≥2 to avoid false groupings from
        // unrelated actions that happen to share a user session
        const evtBatchId = evts[0].batch_id;
        if (evtBatchId || evts.length > 1) {
            batchedGroups.push(evts);
        } else {
            unbatchedEvents.push(...evts);
        }
    });

    // Fallback: group remaining events by 90s proximity
    const timeWindowCandidates = [...unbatchedEvents, ...noBatch].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const timeGroups: ActionEvent[][] = [];
    timeWindowCandidates.forEach((evt) => {
        const ts = new Date(evt.timestamp).getTime();
        const last = timeGroups[timeGroups.length - 1];
        if (last && ts - new Date(last[last.length - 1].timestamp).getTime() < 90_000) {
            last.push(evt);
        } else {
            timeGroups.push([evt]);
        }
    });

    return [...batchedGroups, ...timeGroups]
        .map((evts) => {
            const routes: string[] = [];
            evts.forEach((evt) => {
                const r = getIntakeRoute(evt);
                if (r && !routes.includes(r)) routes.push(r);
            });
            const sortedEvts = [...evts].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const first = sortedEvts[0];
            return {
                batchKey: first.batch_id ?? first.session_id ?? first.action_id,
                events: sortedEvts,
                timestamp: sortedEvts[0].timestamp,
                confirmed: evts.filter((e) => e.status === 'done').length,
                rejected: evts.filter((e) => e.status === 'rejected' || e.status === 'expired').length,
                failed: evts.filter((e) => e.status === 'failed').length,
                routes,
            };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

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
    confirm_action: 'Aktion bestätigen',
    undo: 'Aktion rückgängig machen',
    create_node_from_file: 'Datei einordnen',
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
    { key: 'confirm_action', label: 'Bestätigen' },
    { key: 'undo', label: 'Rückgängig' },
];

const statusFilters: { key: ActionFilter; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'active', label: 'Aktiv' },
    { key: 'done', label: 'Erledigt' },
    { key: 'rejected', label: 'Verworfen' },
    { key: 'failed', label: 'Fehler' },
];

function formatActionTitle(evt: ActionEvent): string {
    const toolName = typeof evt.payload?.tool_name === 'string' ? evt.payload.tool_name : undefined;
    const intent = toolName || evt.intent || 'system_action';
    return intentLabelMap[intent] || intent.replace(/_/g, ' ');
}

function formatActionMessage(evt: ActionEvent): string | null {
    if (evt.error) return evt.error;
    if (evt.message) return evt.message;
    const summary = typeof evt.payload?.summary === 'string' ? evt.payload.summary : null;
    if (summary) return summary;
    return statusLabelMap[evt.status] || null;
}

function formatTime(ts?: string): string {
    if (!ts) return '--:--';
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return '--:--';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatBatchTime(ts: string): string {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '--';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (d.toDateString() === today.toDateString()) return `Heute · ${timeStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Gestern · ${timeStr}`;
    return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · ${timeStr}`;
}

function formatRole(role?: string | null): string {
    if (!role) return 'unbekannt';
    return role === 'system_owner' ? 'system' : role;
}

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
                                ? `Node: ${node?.title || node?.name || op.node_name || op.node_id || '-'}`
                                : type === 'rename_node'
                                    ? `${op.old_name || op.node_name || node?.title || node?.name || op.node_id || '-'} → ${op.new_name || node?.title || node?.name || '-'}`
                                    : type.replace(/_/g, ' ');
                    const details =
                        type === 'move_node'
                            ? [
                                `Quelle: ${op.source_folder_name || op.source_folder_id || '-'}`,
                                `Ziel: ${op.target_folder_name || op.target_folder_id || node?.folder_id || '-'}`,
                            ]
                            : type === 'create_folder'
                                ? [`Übergeordnet: ${op.parent_folder_name || op.parent_folder_id || folder?.parent_folder_id || op.space_id || folder?.space_id || '-'}`]
                                : type === 'rename_node'
                                    ? [
                                        `Vorher: ${op.old_name || op.node_name || '-'}`,
                                        `Nachher: ${op.new_name || node?.title || node?.name || '-'}`,
                                    ]
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
    const result = evt.payload?.result;
    const operationsExecuted = Array.isArray((result as Record<string, unknown> | undefined)?.operations_executed)
        ? ((result as Record<string, unknown>).operations_executed as Record<string, unknown>[])
        : [];
    const operations = Array.isArray(evt.payload?.operations) ? (evt.payload.operations as Record<string, unknown>[]) : [];
    if (operations.length === 0 && operationsExecuted.length === 0) return null;
    return (
        <>
            {renderOperationCards(operations, 'Plan', evt.action_id)}
            {renderOperationCards(operationsExecuted, 'Ergebnis', evt.action_id)}
        </>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ActionCenterPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);

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

    const loadEvents = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setIsLoading(true);
        setError(null);
        try {
            const queryParts = ['limit=120'];
            if (roleFilter !== 'all') {
                queryParts.push(`actor_role=${encodeURIComponent(roleFilter === 'system' ? 'system_owner' : roleFilter)}`);
            }
            if (intentFilter !== 'all') {
                // 'intake' is a UI alias — translate to the actual backend intent value
                const backendIntent = intentFilter === 'intake' ? 'create_node_from_file' : intentFilter;
                queryParts.push(`intent=${encodeURIComponent(backendIntent)}`);
            }
            if (sessionFilter.trim()) {
                queryParts.push(`session_id=${encodeURIComponent(sessionFilter.trim())}`);
            }
            const res = await coreGet(`/v3/actions/events?${queryParts.join('&')}`, { isOptional: true });
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
        realtime.on('action_status', handleActionStatus);
        realtime.connect();
        return () => { realtime.off('action_status', handleActionStatus); };
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

    if (!pane) return null;

    const showIntakeView = intentFilter === 'intake';

    return (
        <GlassPanel
            title="Action Center"
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
            paneId={id}
        >
            <div className="flex h-full flex-col gap-4">
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
                                setIntentFilter(e.target.value as IntentFilter);
                                setExpandedBatchKey(null);
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
                        // ── Intake batch view ──────────────────────────────────
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
                                    const summaryText = allDone
                                        ? `${batch.confirmed} ${batch.confirmed === 1 ? 'Datei eingeordnet' : 'Dateien eingeordnet'}`
                                        : allRejected
                                            ? `${batch.rejected} ${batch.rejected === 1 ? 'Datei verworfen' : 'Dateien verworfen'}`
                                            : [
                                                batch.confirmed > 0 && `${batch.confirmed} eingeordnet`,
                                                batch.rejected > 0 && `${batch.rejected} verworfen`,
                                                batch.failed > 0 && `${batch.failed} fehlgeschlagen`,
                                            ].filter(Boolean).join(' · ');

                                    return (
                                        <div
                                            key={batch.batchKey}
                                            className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] overflow-hidden"
                                        >
                                            {/* Batch header */}
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

                                            {/* Expanded: per-file rows */}
                                            {isExpanded && (
                                                <div className="border-t border-white/5 divide-y divide-white/5">
                                                    {batch.events.map((evt) => {
                                                        const fileName = getIntakeFileName(evt) ?? formatActionTitle(evt);
                                                        const route = getIntakeRoute(evt);
                                                        const isDone = evt.status === 'done';
                                                        const isRejected = evt.status === 'rejected' || evt.status === 'expired';
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
                                                                    <div className="truncate text-[12px] text-white/80">{fileName}</div>
                                                                    {route && (
                                                                        <div className="truncate text-[11px] text-white/40 mt-0.5">{route}</div>
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
                        // ── Flat list empty state ─────────────────────────────
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/45">
                            <Activity size={26} className="text-white/20" />
                            <div className="text-sm">Keine passenden Aktionen gefunden</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/25">
                                Filter oder Suchbegriff anpassen
                            </div>
                        </div>
                    ) : (
                        // ── Flat list ─────────────────────────────────────────
                        <div className="space-y-2">
                            {filteredEvents.map((evt) => {
                                const expanded = expandedId === evt.action_id;
                                const actionMessage = formatActionMessage(evt);
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
            </div>
        </GlassPanel>
    );
};

export default ActionCenterPane;
