'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import type { WorkSessionPlan, WorkSessionStep, WorkSessionStepStatus } from '@/lib/api/coreClient';
import { dispatchWorkSessionPlan, WORK_SESSION_PLAN_EVENT, type WorkSessionShellSummary } from '@/lib/utils/moraExplanation';
import { useWorkSessionStore } from '@/lib/store/workSessionStore';
import { surfaceNavigationOutcome } from '@/lib/utils/searchOpen';
import {
    AlertTriangle,
    ArrowUpRight,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Eye,
    FilePlus2,
    FolderOpen,
    Loader2,
    MoveRight,
    Pencil,
    PlayCircle,
    Search,
    SkipForward,
    Trash2,
    Type,
    Upload,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const WRITE_KINDS = new Set([
    'create', 'update', 'move', 'rename', 'intake', 'delete', 'write', 'execute', 'patch',
]);

const POLL_INTERVAL_MS = 3000;

type OpenPaneFn = ReturnType<typeof usePaneStore.getState>['openPane'];

function isWriteKind(kind: string): boolean {
    return WRITE_KINDS.has(kind.toLowerCase());
}

const kindLabels: Record<string, string> = {
    create: 'Erstellen',
    update: 'Aktualisieren',
    move: 'Verschieben',
    rename: 'Umbenennen',
    intake: 'Einordnen',
    delete: 'Loeschen',
    search: 'Suchen',
    navigate: 'Navigieren',
    write: 'Schreiben',
    execute: 'Ausfuehren',
    patch: 'Aktualisieren',
};

const planStateLabels: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Bereit', cls: 'bg-white/[0.05] text-white/40 border-white/10' },
    running: { label: 'Laeuft', cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
    waiting_confirmation: { label: 'Wartet', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    done: { label: 'Abgeschlossen', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
    partial: { label: 'Teilweise', cls: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
    failed: { label: 'Fehlgeschlagen', cls: 'bg-red-500/10 text-red-300 border-red-500/20' },
};

const stepStatusLabels: Record<WorkSessionStepStatus, string> = {
    pending: 'Geplant',
    running: 'Laeuft',
    done: 'Fertig',
    failed: 'Fehlgeschlagen',
    pending_confirmation: 'Wartet',
    skipped: 'Uebersprungen',
};

function KindIcon({ kind, size = 12, className }: { kind: string; size?: number; className?: string }) {
    const k = kind.toLowerCase();
    const p = { size, className };
    if (k === 'search') return <Search {...p} />;
    if (k === 'navigate') return <FolderOpen {...p} />;
    if (k === 'create') return <FilePlus2 {...p} />;
    if (k === 'update') return <Pencil {...p} />;
    if (k === 'move') return <MoveRight {...p} />;
    if (k === 'rename') return <Type {...p} />;
    if (k === 'intake') return <Upload {...p} />;
    if (k === 'delete') return <Trash2 {...p} />;
    return isWriteKind(k) ? <Pencil {...p} /> : <Eye {...p} />;
}

function StepIcon({ status }: { status: WorkSessionStepStatus }) {
    switch (status) {
        case 'done':
            return <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />;
        case 'failed':
            return <XCircle size={13} className="text-red-400 shrink-0" />;
        case 'running':
            return <PlayCircle size={13} className="text-blue-400 animate-pulse shrink-0" />;
        case 'pending_confirmation':
            return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
        case 'skipped':
            return <SkipForward size={13} className="text-white/20 shrink-0" />;
        default:
            return <Clock3 size={13} className="text-white/25 shrink-0" />;
    }
}

function compactText(value?: string | null, max = 180): string | null {
    if (!value) return null;
    const single = value.replace(/\s+/g, ' ').trim();
    if (!single) return null;
    return single.length > max ? `${single.slice(0, max - 1)}...` : single;
}

function renderContentDiff(step: WorkSessionStep) {
    const change = step.result?.content_change;
    const before = change?.before_preview ?? step.result?.previous_content_preview ?? null;
    const after = change?.after_preview ?? step.result?.content_preview ?? null;
    const summary = change?.summary ?? step.result?.change_summary ?? null;

    if (!before && !after && !summary) return null;

    return (
        <div className="rounded bg-white/[0.03] border border-white/[0.06] px-2.5 py-2 space-y-1.5">
            <div className="text-[9px] uppercase tracking-wider text-white/22">Inhaltsaenderung</div>
            {summary && <p className="text-[11px] text-white/58 leading-relaxed">{summary}</p>}
            {(before || after) && (
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    <div className="rounded bg-black/20 px-2 py-1.5">
                        <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Vorher</div>
                        <p className="text-[11px] text-white/45 leading-relaxed">{compactText(before) || 'Leer'}</p>
                    </div>
                    <div className="rounded bg-black/20 px-2 py-1.5">
                        <div className="text-[9px] uppercase tracking-wider text-white/20 mb-1">Nachher</div>
                        <p className="text-[11px] text-white/65 leading-relaxed">{compactText(after) || 'Leer'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function openWorkSessionNavigation(step: WorkSessionStep, openPane: OpenPaneFn) {
    const nav = step.navigation;
    if (!nav) return;

    const label = nav.label || step.title;
    const companyId = nav.company_id || undefined;

    switch (nav.target_type) {
        case 'department':
            if (!nav.department_id) return;
            surfaceNavigationOutcome({
                title: 'Bereich geoeffnet',
                message: `Ich habe ${label} aus dem Arbeitsplan geoeffnet.`,
                targetType: 'department',
                label,
                companyId,
                departmentId: nav.department_id,
                source: 'search',
            }, openPane);
            return;
        case 'space':
            if (!nav.space_id) return;
            surfaceNavigationOutcome({
                title: 'Bereich geoeffnet',
                message: `Ich habe ${label} aus dem Arbeitsplan geoeffnet.`,
                targetType: 'space',
                label,
                companyId,
                spaceId: nav.space_id,
                source: 'search',
            }, openPane);
            return;
        case 'folder':
            if (!nav.folder_id) return;
            surfaceNavigationOutcome({
                title: 'Ordner geoeffnet',
                message: `Ich habe ${label} aus dem Arbeitsplan im Finder geoeffnet.`,
                targetType: 'folder',
                label,
                companyId,
                folderId: nav.folder_id,
                source: 'search',
            }, openPane);
            return;
        case 'company':
            if (!companyId) return;
            surfaceNavigationOutcome({
                title: 'Firmenkontext geoeffnet',
                message: `Ich habe ${label} im aktuellen Firmenkontext geoeffnet.`,
                targetType: 'company',
                label,
                companyId,
                source: 'search',
            }, openPane);
            return;
        case 'node':
            if (!nav.node_id) return;
            surfaceNavigationOutcome({
                title: 'Datei geoeffnet',
                message: `Ich habe ${label} aus dem Arbeitsplan geoeffnet.`,
                targetType: 'node',
                label,
                companyId,
                folderId: nav.folder_id || undefined,
                nodeId: nav.node_id,
                source: 'search',
            }, openPane);
            return;
        case 'search':
            surfaceNavigationOutcome({
                title: 'Suche geoeffnet',
                message: `Ich habe die Suche aus dem Arbeitsplan geoeffnet.`,
                targetType: 'search',
                label,
                query: label,
                companyId,
                source: 'search',
            }, openPane);
            return;
        default:
            return;
    }
}

function StepRow({ step, onOpen }: { step: WorkSessionStep; onOpen: (step: WorkSessionStep) => void }) {
    const [expanded, setExpanded] = useState(false);
    const write = isWriteKind(step.kind);
    const isDone = step.status === 'done';
    const isFailed = step.status === 'failed';
    const isRunning = step.status === 'running';
    const isSkipped = step.status === 'skipped';
    const hasNavigation = !!step.navigation;
    const resultSummary =
        step.result?.result_summary ||
        step.result?.change_summary ||
        step.result?.destination_summary ||
        step.output_summary;
    const contentDiff = renderContentDiff(step);
    const hasDetail = !!(step.why || resultSummary || step.summary || contentDiff || step.result?.summary);

    const rowCls = write
        ? isDone
            ? 'border-orange-500/10 bg-orange-500/[0.03]'
            : isFailed
              ? 'border-red-500/15 bg-red-500/[0.04]'
              : isSkipped
                ? 'border-white/[0.06] bg-white/[0.025]'
                : 'border-orange-500/15 bg-orange-500/[0.05]'
        : isDone
          ? 'border-white/[0.04] bg-white/[0.01]'
          : isFailed
            ? 'border-red-500/15 bg-red-500/[0.04]'
            : isSkipped
              ? 'border-white/[0.06] bg-white/[0.025]'
              : 'border-white/[0.06] bg-white/[0.02]';

    const titleCls = isDone
        ? 'text-white/32'
        : isFailed
          ? 'text-red-300/70'
          : isSkipped
            ? 'text-white/42'
            : isRunning
              ? 'text-white/90 font-medium'
              : write
                ? 'text-amber-100/78'
                : 'text-white/58';

    const kindLabel = step.action_label || kindLabels[step.kind.toLowerCase()];

    return (
        <div className={`rounded-lg border px-3 py-2.5 ${rowCls}`}>
            <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                    <StepIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <span className={`text-xs leading-snug break-words ${titleCls}`}>{step.title}</span>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] uppercase tracking-wider text-white/24">{stepStatusLabels[step.status]}</span>
                                {step.navigation?.label && (
                                    <span className="text-[10px] text-white/28">{compactText(step.navigation.label, 80)}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {write && !isDone && kindLabel && (
                                <span className="text-[9px] uppercase tracking-wider text-orange-300/45 flex items-center gap-1">
                                    <KindIcon kind={step.kind} size={8} />
                                    {kindLabel}
                                </span>
                            )}
                            {!write && <KindIcon kind={step.kind} size={10} className="text-white/18" />}
                            {hasNavigation && (isDone || isRunning) && (
                                <button
                                    type="button"
                                    onClick={() => onOpen(step)}
                                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-500/[0.06] px-2 py-0.5 text-[10px] text-cyan-200/65 hover:border-cyan-400/30 hover:bg-cyan-500/[0.12] hover:text-cyan-200 transition-colors"
                                >
                                    <ArrowUpRight size={10} />
                                    Oeffnen
                                </button>
                            )}
                            {hasDetail && (
                                <button
                                    type="button"
                                    onClick={() => setExpanded((v) => !v)}
                                    className="text-white/20 hover:text-white/45 transition-colors"
                                    aria-label="Details anzeigen"
                                >
                                    {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                            )}
                        </div>
                    </div>

                    <AnimatePresence initial={false}>
                        {expanded && hasDetail && (
                            <motion.div
                                key="detail"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 space-y-1.5">
                                    {step.why && <p className="text-[11px] text-white/38 leading-relaxed">{step.why}</p>}
                                    {resultSummary && (
                                        <div className="rounded bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5">
                                            <div className="text-[9px] uppercase tracking-wider text-white/22 mb-0.5">Ergebnis</div>
                                            <p className="text-[11px] text-white/65 leading-relaxed">{resultSummary}</p>
                                        </div>
                                    )}
                                    {step.summary && !resultSummary && (
                                        <p className="text-[11px] text-white/32 leading-relaxed">{step.summary}</p>
                                    )}
                                    {contentDiff}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function ConfirmStepCard({
    step,
    onConfirm,
    onReject,
}: {
    step: WorkSessionStep;
    onConfirm: (stepId: string) => Promise<void>;
    onReject: (stepId: string) => Promise<void>;
}) {
    const [processing, setProcessing] = useState(false);

    const handle = async (fn: (id: string) => Promise<void>) => {
        setProcessing(true);
        try {
            await fn(step.step_id);
        } finally {
            setProcessing(false);
        }
    };

    const confirmLabel = step.action_label || kindLabels[step.kind.toLowerCase()] || 'Ausfuehren';
    const primaryResult =
        step.result?.result_summary ||
        step.result?.change_summary ||
        step.result?.destination_summary ||
        step.summary;
    const contentDiff = renderContentDiff(step);

    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
            <div className="flex items-start gap-2 mb-3">
                <div className="shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/20">
                    <KindIcon kind={step.kind} size={11} className="text-amber-300/80" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase tracking-wider text-amber-300/50">
                            {step.action_label || kindLabels[step.kind.toLowerCase()] || step.kind}
                        </span>
                    </div>
                    <div className="text-xs font-medium text-amber-100/90 leading-snug mt-0.5">{step.title}</div>
                    {step.why && <p className="text-[11px] text-white/42 mt-1.5 leading-relaxed">{step.why}</p>}
                    {primaryResult && (
                        <div className="mt-2 rounded border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5">
                            <p className="text-[11px] text-white/62 leading-relaxed">{primaryResult}</p>
                        </div>
                    )}
                    {step.navigation?.label && <p className="mt-2 text-[10px] text-white/32">Ziel: {step.navigation.label}</p>}
                    {contentDiff && <div className="mt-2">{contentDiff}</div>}
                    {step.tool_name && (
                        <span className="text-[9px] text-amber-200/30 mt-1 inline-block font-mono">{step.tool_name}</span>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => handle(onReject)}
                    disabled={processing}
                    className="flex-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/45 hover:text-white/65 text-xs transition-colors disabled:opacity-40"
                >
                    Ueberspringen
                </button>
                <button
                    type="button"
                    onClick={() => handle(onConfirm)}
                    disabled={processing}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-100 text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                    {processing ? <Loader2 size={11} className="animate-spin" /> : <KindIcon kind={step.kind} size={11} />}
                    {confirmLabel}
                </button>
            </div>
        </div>
    );
}

export const WorkSessionPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const setActiveSession = useWorkSessionStore((state) => state.setActiveSession);

    const [plan, setPlan] = useState<WorkSessionPlan | null>((pane?.data?.plan as WorkSessionPlan | undefined) ?? null);
    const [isLoading, setIsLoading] = useState(!plan && !!pane?.data?.plan_id);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const planId = pane?.data?.plan_id as string | undefined;
        if (plan || !planId) return;
        let cancelled = false;
        setIsLoading(true);
        coreGet(`/v3/work-session/plan/${encodeURIComponent(planId)}`, { isOptional: true })
            .then((data) => {
                if (!cancelled) {
                    setPlan((data as WorkSessionPlan) ?? null);
                    if (!data) setError('Plan nicht gefunden.');
                }
            })
            .catch(() => {
                if (!cancelled) setError('Plan konnte nicht geladen werden.');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pane?.data?.plan_id, plan]);

    useEffect(() => {
        if (!plan?.plan_id) return;
        const active = plan.state === 'running' || plan.state === 'waiting_confirmation' || plan.state === 'pending';
        if (!active) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }
        pollRef.current = setInterval(async () => {
            try {
                const fresh = await coreGet(`/v3/work-session/plan/${encodeURIComponent(plan.plan_id)}`, { isOptional: true });
                if (fresh) setPlan(fresh as WorkSessionPlan);
            } catch {
                // keep last good snapshot
            }
        }, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [plan?.plan_id, plan?.state]);

    useEffect(() => {
        if (!plan?.plan_id) return;
        setActiveSession({ planId: plan.plan_id, sessionId: plan.session_id });
        dispatchWorkSessionPlan({
            planId: plan.plan_id,
            sessionId: plan.session_id,
            source: 'pane',
            state: plan.state,
            title: plan.title,
            summary: plan.summary,
            mode: plan.mode,
            scope: plan.scope,
            stats: plan.stats,
            transparencyNote: plan.transparency_note,
        });
    }, [plan, setActiveSession]);

    useEffect(() => {
        const handlePlanUpdate = (event: Event) => {
            const detail = (event as CustomEvent<WorkSessionShellSummary>).detail;
            if (!detail || detail.source === 'pane' || !plan?.plan_id || detail.planId !== plan.plan_id) return;
            void coreGet(`/v3/work-session/plan/${encodeURIComponent(plan.plan_id)}`, { isOptional: true })
                .then((fresh) => {
                    if (fresh) setPlan(fresh as WorkSessionPlan);
                })
                .catch(() => {
                    // keep current snapshot if refresh fails
                });
        };
        window.addEventListener(WORK_SESSION_PLAN_EVENT, handlePlanUpdate as EventListener);
        return () => window.removeEventListener(WORK_SESSION_PLAN_EVENT, handlePlanUpdate as EventListener);
    }, [plan?.plan_id]);

    const handleConfirmStep = async (stepId: string) => {
        if (!plan) return;
        try {
            const updated = await corePost('/v3/work-session/confirm', { plan_id: plan.plan_id, step_id: stepId }, { isOptional: true });
            if (updated) setPlan(updated as WorkSessionPlan);
        } catch {
            toast.error('Bestaetigung fehlgeschlagen.');
        }
    };

    const handleRejectStep = async (stepId: string) => {
        if (!plan) return;
        try {
            const updated = await corePost('/v3/work-session/reject', { plan_id: plan.plan_id, step_id: stepId }, { isOptional: true });
            if (updated) setPlan(updated as WorkSessionPlan);
        } catch {
            toast.error('Schritt konnte nicht uebersprungen werden.');
        }
    };

    if (!pane) return null;

    const pendingSteps = plan?.steps.filter((s) => s.status === 'pending_confirmation') ?? [];
    const timelineSteps = plan?.steps.filter((s) => s.status !== 'pending_confirmation') ?? [];
    const stateBadge = plan ? (planStateLabels[plan.state] ?? { label: plan.state, cls: 'bg-white/[0.05] text-white/40 border-white/10' }) : null;

    const readCount = plan?.stats?.read_steps ?? timelineSteps.filter((s) => !isWriteKind(s.kind)).length;
    const writeCount = plan?.stats?.write_steps ?? timelineSteps.filter((s) => isWriteKind(s.kind)).length;
    const completedCount = plan?.stats?.completed_steps;
    const runningCount = plan?.stats?.running_steps ?? plan?.steps.filter((s) => s.status === 'running').length ?? 0;
    const skippedCount = plan?.stats?.skipped_steps ?? plan?.steps.filter((s) => s.status === 'skipped').length ?? 0;
    const totalCount = plan?.stats?.total_steps ?? plan?.steps.length ?? 0;

    return (
        <GlassPanel
            title={plan?.title ?? 'Arbeitsplan'}
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
        >
            <div className="flex flex-col h-full bg-black/60 rounded-b-2xl overflow-hidden">
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={22} className="animate-spin text-white/25" />
                    </div>
                )}

                {!isLoading && error && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <div>
                            <XCircle size={22} className="mx-auto mb-2 text-red-400/50" />
                            <p className="text-sm text-white/45">{error}</p>
                        </div>
                    </div>
                )}

                {!isLoading && !error && !plan && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <p className="text-sm text-white/25">Kein Plan geladen.</p>
                    </div>
                )}

                {plan && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h2 className="text-sm font-semibold text-white/90 leading-snug">{plan.title}</h2>
                                {stateBadge && (
                                    <span className={`shrink-0 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ${stateBadge.cls}`}>
                                        {stateBadge.label}
                                    </span>
                                )}
                            </div>

                            {plan.summary && <p className="text-xs text-white/50 leading-relaxed mb-3">{plan.summary}</p>}

                            <div className="flex flex-wrap gap-1.5">
                                {plan.scope?.view_level && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-200/65">
                                        {plan.scope.view_level}
                                    </span>
                                )}
                                {plan.scope?.active_entity_type && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/35">
                                        {plan.scope.active_entity_type}
                                    </span>
                                )}
                                {plan.mode && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/30">
                                        {plan.mode}
                                    </span>
                                )}
                                {readCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/28 flex items-center gap-1">
                                        <Eye size={9} />
                                        {readCount}
                                    </span>
                                )}
                                {writeCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/[0.08] border border-orange-400/15 text-orange-200/55 flex items-center gap-1">
                                        <Pencil size={9} />
                                        {writeCount}
                                    </span>
                                )}
                                {runningCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/[0.08] border border-blue-400/15 text-blue-200/55 flex items-center gap-1">
                                        <PlayCircle size={9} />
                                        {runningCount}
                                    </span>
                                )}
                                {skippedCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/32 flex items-center gap-1">
                                        <SkipForward size={9} />
                                        {skippedCount}
                                    </span>
                                )}
                                {completedCount !== undefined && totalCount > 0 && completedCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/[0.06] border border-emerald-400/15 text-emerald-300/50">
                                        {completedCount}/{totalCount}
                                    </span>
                                )}
                            </div>
                        </div>

                        <AnimatePresence>
                            {pendingSteps.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="px-4 pt-4 pb-2"
                                >
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/55 mb-2.5">
                                        Bestaetigung erforderlich
                                    </div>
                                    <div className="space-y-2">
                                        {pendingSteps.map((step) => (
                                            <ConfirmStepCard
                                                key={step.step_id}
                                                step={step}
                                                onConfirm={handleConfirmStep}
                                                onReject={handleRejectStep}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {timelineSteps.length > 0 && (
                            <div className="px-4 py-4">
                                {pendingSteps.length > 0 && (
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-3">Schritte</div>
                                )}
                                <div className="space-y-1">
                                    {timelineSteps.map((step, idx) => (
                                        <motion.div
                                            key={step.step_id}
                                            initial={{ opacity: 0, x: -3 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.025, duration: 0.15 }}
                                        >
                                            <StepRow step={step} onOpen={(targetStep) => openWorkSessionNavigation(targetStep, openPane)} />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {plan.transparency_note && (
                            <div className="px-5 pb-5">
                                <p className="text-[11px] text-white/25 italic leading-relaxed">{plan.transparency_note}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
};
