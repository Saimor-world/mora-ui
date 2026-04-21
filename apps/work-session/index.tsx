'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import type { WorkSessionPlan, WorkSessionSegmentSummary, WorkSessionStep, WorkSessionStepStatus } from '@/lib/api/coreClient';
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
import type { AppProps } from '@/lib/apps/types';

// ─── Exported utilities (re-exported via thin wrapper for backward compat) ────

/** @deprecated Use groupStepsBySegment instead. */
export function splitAtPlannedSteps<T>(
    steps: T[],
    plannedCount: number | null | undefined,
): { original: T[]; continuation: T[] } {
    if (!plannedCount || plannedCount <= 0 || plannedCount >= steps.length) {
        return { original: steps, continuation: [] };
    }
    return {
        original: steps.slice(0, plannedCount),
        continuation: steps.slice(plannedCount),
    };
}

export function groupStepsBySegment(
    steps: WorkSessionStep[],
    summaries: WorkSessionSegmentSummary[] | undefined,
): Array<{ summary: WorkSessionSegmentSummary | null; steps: WorkSessionStep[] }> {
    const byIndex = new Map<number, WorkSessionStep[]>();
    for (const step of steps) {
        const idx = step.segment_index ?? 0;
        if (!byIndex.has(idx)) byIndex.set(idx, []);
        byIndex.get(idx)!.push(step);
    }

    if (summaries?.length) {
        const summaryMap = new Map<number, WorkSessionSegmentSummary>(
            summaries.map((s) => [s.segment_index, s])
        );
        const allIndices = new Set([
            ...summaries.map((s) => s.segment_index),
            ...byIndex.keys(),
        ]);
        return Array.from(allIndices)
            .sort((a, b) => a - b)
            .map((idx) => ({
                summary: summaryMap.get(idx) ?? null,
                steps: byIndex.get(idx) ?? [],
            }));
    }

    const hasSegmentation = Array.from(byIndex.keys()).some((k) => k > 0);
    if (hasSegmentation) {
        return Array.from(byIndex.keys())
            .sort((a, b) => a - b)
            .map((idx) => ({
                summary: null,
                steps: byIndex.get(idx) ?? [],
            }));
    }

    return [{ summary: null, steps }];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const segmentOriginLabels: Record<string, string> = {
    planning: 'Ausgangsplan',
    continuation: 'Fortsetzung',
    navigation: 'Navigation',
    native: 'Direkte Aktion',
};

const stepStatusLabels: Record<WorkSessionStepStatus, string> = {
    pending: 'Geplant',
    running: 'Laeuft',
    done: 'Fertig',
    failed: 'Fehlgeschlagen',
    pending_confirmation: 'Wartet',
    skipped: 'Uebersprungen',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        case 'done': return <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />;
        case 'failed': return <XCircle size={13} className="text-red-400 shrink-0" />;
        case 'running': return <PlayCircle size={13} className="text-blue-400 animate-pulse shrink-0" />;
        case 'pending_confirmation': return <AlertTriangle size={13} className="text-amber-400 shrink-0" />;
        case 'skipped': return <SkipForward size={13} className="text-white/20 shrink-0" />;
        default: return <Clock3 size={13} className="text-white/25 shrink-0" />;
    }
}

function compactText(value?: string | null, max = 180): string | null {
    if (!value) return null;
    const single = value.replace(/\s+/g, ' ').trim();
    if (!single) return null;
    return single.length > max ? `${single.slice(0, max - 1)}...` : single;
}

function SegmentDivider({ summary }: { summary: WorkSessionSegmentSummary | null }) {
    const origin = summary?.origin ?? 'continuation';
    const label = summary?.origin_label || segmentOriginLabels[origin] || origin;
    const subtitle = summary?.summary;
    const completed = summary?.completed_steps;
    const total = summary?.total_steps ?? summary?.step_count;
    const isActive = summary?.state === 'running' || summary?.latest === true;
    return (
        <div className="my-3">
            <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[9px] uppercase tracking-[0.22em] text-white/28">
                    {label}{isActive && total ? ` ${completed ?? 0}/${total}` : ''}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            {subtitle && <p className="mt-1.5 text-[10px] text-white/28 leading-relaxed text-center">{subtitle}</p>}
        </div>
    );
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
            surfaceNavigationOutcome({ title: 'Bereich geöffnet', message: `Ich habe ${label} aus dem Arbeitsplan geöffnet.`, targetType: 'department', label, companyId, departmentId: nav.department_id, source: 'work-session' }, openPane);
            return;
        case 'space':
            if (!nav.space_id) return;
            surfaceNavigationOutcome({ title: 'Bereich geöffnet', message: `Ich habe ${label} aus dem Arbeitsplan geöffnet.`, targetType: 'space', label, companyId, spaceId: nav.space_id, source: 'work-session' }, openPane);
            return;
        case 'folder':
            if (!nav.folder_id) return;
            surfaceNavigationOutcome({ title: 'Ordner geöffnet', message: `Ich habe ${label} aus dem Arbeitsplan im Finder geöffnet.`, targetType: 'folder', label, companyId, folderId: nav.folder_id, source: 'work-session' }, openPane);
            return;
        case 'company':
            if (!companyId) return;
            surfaceNavigationOutcome({ title: 'Organisation geöffnet', message: `Ich habe ${label} im aktuellen Organisationskontext geöffnet.`, targetType: 'company', label, companyId, source: 'work-session' }, openPane);
            return;
        case 'node':
            if (!nav.node_id) return;
            surfaceNavigationOutcome({ title: 'Datei geöffnet', message: `Ich habe ${label} aus dem Arbeitsplan geöffnet.`, targetType: 'node', label, companyId, folderId: nav.folder_id || undefined, nodeId: nav.node_id, source: 'work-session' }, openPane);
            return;
        case 'search':
            surfaceNavigationOutcome({ title: 'Suche geöffnet', message: `Ich habe die Suche aus dem Arbeitsplan geöffnet.`, targetType: 'search', label, query: label, companyId, source: 'work-session' }, openPane);
            return;
        default: return;
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
    const resultSummary = step.result?.result_summary || step.result?.change_summary || step.result?.destination_summary || step.output_summary;
    const contentDiff = renderContentDiff(step);
    const hasDetail = !!(step.why || resultSummary || step.summary || contentDiff || step.result?.summary);

    const rowCls = write
        ? isDone ? 'border-orange-500/10 bg-orange-500/[0.03]'
            : isFailed ? 'border-red-500/15 bg-red-500/[0.04]'
                : isSkipped ? 'border-white/[0.06] bg-white/[0.025]'
                    : 'border-orange-500/15 bg-orange-500/[0.05]'
        : isDone ? 'border-white/[0.04] bg-white/[0.01]'
            : isFailed ? 'border-red-500/15 bg-red-500/[0.04]'
                : isSkipped ? 'border-white/[0.06] bg-white/[0.025]'
                    : 'border-white/[0.06] bg-white/[0.02]';

    const titleCls = isDone ? 'text-white/32'
        : isFailed ? 'text-red-300/70'
            : isSkipped ? 'text-white/42'
                : isRunning ? 'text-white/90 font-medium'
                    : write ? 'text-amber-100/78' : 'text-white/58';

    const kindLabel = step.action_label || kindLabels[step.kind.toLowerCase()];

    return (
        <div className={`rounded-lg border px-3 py-2.5 ${rowCls}`}>
            <div className="flex items-start gap-2.5">
                <div className="mt-0.5"><StepIcon status={step.status} /></div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <span className={`text-xs leading-snug break-words ${titleCls}`}>{step.title}</span>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] uppercase tracking-wider text-white/24">{stepStatusLabels[step.status]}</span>
                                {step.navigation?.label && <span className="text-[10px] text-white/28">{compactText(step.navigation.label, 80)}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {write && !isDone && kindLabel && (
                                <span className="text-[9px] uppercase tracking-wider text-orange-300/45 flex items-center gap-1">
                                    <KindIcon kind={step.kind} size={8} />{kindLabel}
                                </span>
                            )}
                            {!write && <KindIcon kind={step.kind} size={10} className="text-white/18" />}
                            {hasNavigation && (isDone || isRunning) && (
                                <button type="button" onClick={() => onOpen(step)}
                                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-500/[0.06] px-2 py-0.5 text-[10px] text-cyan-200/65 hover:border-cyan-400/30 hover:bg-cyan-500/[0.12] hover:text-cyan-200 transition-colors">
                                    <ArrowUpRight size={10} />Öffnen
                                </button>
                            )}
                            {hasDetail && (
                                <button type="button" onClick={() => setExpanded((v) => !v)}
                                    className="text-white/20 hover:text-white/45 transition-colors" aria-label="Details anzeigen">
                                    {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                            )}
                        </div>
                    </div>
                    <AnimatePresence initial={false}>
                        {expanded && hasDetail && (
                            <motion.div key="detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                                <div className="mt-2 space-y-1.5">
                                    {step.why && <p className="text-[11px] text-white/38 leading-relaxed">{step.why}</p>}
                                    {resultSummary && (
                                        <div className="rounded bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5">
                                            <div className="text-[9px] uppercase tracking-wider text-white/22 mb-0.5">Ergebnis</div>
                                            <p className="text-[11px] text-white/65 leading-relaxed">{resultSummary}</p>
                                        </div>
                                    )}
                                    {step.summary && !resultSummary && <p className="text-[11px] text-white/32 leading-relaxed">{step.summary}</p>}
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

function ConfirmStepCard({ step, onConfirm, onReject }: { step: WorkSessionStep; onConfirm: (stepId: string) => Promise<void>; onReject: (stepId: string) => Promise<void> }) {
    const [processing, setProcessing] = useState(false);
    const handle = async (fn: (id: string) => Promise<void>) => {
        setProcessing(true);
        try { await fn(step.step_id); } finally { setProcessing(false); }
    };
    const confirmLabel = step.action_label || kindLabels[step.kind.toLowerCase()] || 'Ausfuehren';
    const primaryResult = step.result?.result_summary || step.result?.change_summary || step.result?.destination_summary || step.summary;
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
                    {step.tool_name && <span className="text-[9px] text-amber-200/30 mt-1 inline-block font-mono">{step.tool_name}</span>}
                </div>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={() => handle(onReject)} disabled={processing}
                    className="flex-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/45 hover:text-white/65 text-xs transition-colors disabled:opacity-40">
                    Ueberspringen
                </button>
                <button type="button" onClick={() => handle(onConfirm)} disabled={processing}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-100 text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                    {processing ? <Loader2 size={11} className="animate-spin" /> : <KindIcon kind={step.kind} size={11} />}
                    {confirmLabel}
                </button>
            </div>
        </div>
    );
}

function TransitionGhostCard({ stepTitle, transitionType, message, segmentContext }: { stepTitle: string; transitionType: 'confirmed' | 'skipped' | string; message: string; segmentContext?: string }) {
    const isConfirmed = transitionType === 'confirmed';
    const tone = isConfirmed ? 'emerald' : 'slate';
    const label = isConfirmed ? 'Bestaetigt' : 'Uebersprungen';
    const Icon = isConfirmed ? CheckCircle2 : SkipForward;
    const body = compactText(message, 220) || (isConfirmed ? 'Schritt bestaetigt.' : 'Schritt uebersprungen.');
    const footer = segmentContext ? `Weiter in ${segmentContext}.` : undefined;
    return (
        <CommandReceipt tone={tone} icon={Icon} label={label}
            title={<span className="text-xs text-white/38">{stepTitle}</span>}
            body={<span className="text-[11px] leading-relaxed text-blue-200/55">{body}</span>}
            footer={footer}
            className="rounded-xl border-white/[0.06] bg-white/[0.02] shadow-none"
        />
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkSessionApp({ paneId, initialData = {} }: AppProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize, openPane } = usePaneStore();
    const pane = getPane(paneId);
    const isActive = usePaneStore((state) => state.activePaneId === paneId);
    const setActiveSession = useWorkSessionStore((state) => state.setActiveSession);

    const initPlan = (initialData?.plan as WorkSessionPlan | undefined) ?? null;
    const initPlanId = (initialData?.plan_id as string | undefined) ?? null;

    const [plan, setPlan] = useState<WorkSessionPlan | null>(initPlan);
    const [isLoading, setIsLoading] = useState(!initPlan && !!initPlanId);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (plan || !initPlanId) return;
        let cancelled = false;
        setIsLoading(true);
        coreGet(`/v3/work-session/plan/${encodeURIComponent(initPlanId)}`, { isOptional: true })
            .then((data) => {
                if (!cancelled) {
                    setPlan((data as WorkSessionPlan) ?? null);
                    if (!data) setError('Plan nicht gefunden.');
                }
            })
            .catch(() => { if (!cancelled) setError('Plan konnte nicht geladen werden.'); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initPlanId]);

    useEffect(() => {
        if (!plan?.plan_id) return;
        const active = plan.state === 'running' || plan.state === 'waiting_confirmation' || plan.state === 'pending';
        if (!active) { if (pollRef.current) clearInterval(pollRef.current); return; }
        pollRef.current = setInterval(async () => {
            try {
                const fresh = await coreGet(`/v3/work-session/plan/${encodeURIComponent(plan.plan_id)}`, { isOptional: true });
                if (fresh) setPlan(fresh as WorkSessionPlan);
            } catch { /* keep last snapshot */ }
        }, POLL_INTERVAL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [plan?.plan_id, plan?.state]);

    useEffect(() => {
        if (!plan?.plan_id) return;
        setActiveSession({ planId: plan.plan_id, sessionId: plan.session_id });
        dispatchWorkSessionPlan({
            planId: plan.plan_id, sessionId: plan.session_id, source: 'pane',
            state: plan.state, title: plan.title, summary: plan.summary,
            mode: plan.mode, scope: plan.scope, stats: plan.stats,
            transparencyNote: plan.transparency_note,
            running_step_title: plan.state === 'running' ? plan.execution?.current_step_title : undefined,
            pending_confirmation_title: plan.state === 'waiting_confirmation' ? plan.execution?.pending_confirmation_title : undefined,
            next_label: plan.execution?.next_label,
            next_message: plan.execution?.last_transition_message ?? plan.execution?.next_message,
            last_transition_step_id: plan.execution?.last_transition_step_id,
            last_transition_type: plan.execution?.last_transition_type,
            last_transition_message: plan.execution?.last_transition_message,
        });
    }, [plan, setActiveSession]);

    useEffect(() => {
        const handlePlanUpdate = (event: Event) => {
            const detail = (event as CustomEvent<WorkSessionShellSummary>).detail;
            if (!detail || detail.source === 'pane' || !plan?.plan_id || detail.planId !== plan.plan_id) return;
            void coreGet(`/v3/work-session/plan/${encodeURIComponent(plan.plan_id)}`, { isOptional: true })
                .then((fresh) => { if (fresh) setPlan(fresh as WorkSessionPlan); })
                .catch(() => { /* keep current snapshot */ });
        };
        window.addEventListener(WORK_SESSION_PLAN_EVENT, handlePlanUpdate as EventListener);
        return () => window.removeEventListener(WORK_SESSION_PLAN_EVENT, handlePlanUpdate as EventListener);
    }, [plan?.plan_id]);

    const handleConfirmStep = async (stepId: string) => {
        if (!plan) return;
        try {
            const updated = await corePost('/v3/work-session/confirm', { plan_id: plan.plan_id, step_id: stepId }, { isOptional: true });
            if (updated) setPlan(updated as WorkSessionPlan);
        } catch { toast.error('Bestaetigung fehlgeschlagen.'); }
    };

    const handleRejectStep = async (stepId: string) => {
        if (!plan) return;
        try {
            const updated = await corePost('/v3/work-session/reject', { plan_id: plan.plan_id, step_id: stepId }, { isOptional: true });
            if (updated) setPlan(updated as WorkSessionPlan);
        } catch { toast.error('Schritt konnte nicht uebersprungen werden.'); }
    };

    if (!pane) return null;

    const pendingSteps = plan?.steps.filter((s) => s.status === 'pending_confirmation') ?? [];
    const timelineSteps = plan?.steps.filter((s) => s.status !== 'pending_confirmation') ?? [];
    const stateBadge = plan ? (planStateLabels[plan.state] ?? { label: plan.state, cls: 'bg-white/[0.05] text-white/40 border-white/10' }) : null;
    const receiptTone = plan?.state === 'running' ? 'blue' : plan?.state === 'waiting_confirmation' ? 'amber' : plan?.state === 'done' ? 'emerald' : plan?.state === 'failed' ? 'red' : 'violet';
    const readCount = plan?.stats?.read_steps ?? timelineSteps.filter((s) => !isWriteKind(s.kind)).length;
    const writeCount = plan?.stats?.write_steps ?? timelineSteps.filter((s) => isWriteKind(s.kind)).length;
    const completedCount = plan?.stats?.completed_steps;
    const runningCount = plan?.stats?.running_steps ?? plan?.steps.filter((s) => s.status === 'running').length ?? 0;
    const skippedCount = plan?.stats?.skipped_steps ?? plan?.steps.filter((s) => s.status === 'skipped').length ?? 0;
    const totalCount = plan?.stats?.total_steps ?? plan?.steps.length ?? 0;
    const lastTransitionStepId = plan?.execution?.last_transition_step_id;
    const ghostStep = lastTransitionStepId ? plan?.steps.find((step) => step.step_id === lastTransitionStepId) : null;
    const showGhost = !!ghostStep && (ghostStep.status === 'done' || ghostStep.status === 'skipped');
    const ghostMessage = compactText(plan?.execution?.last_transition_message ?? plan?.execution?.next_message ?? '', 220) || '';
    const ghostTransitionType = plan?.execution?.last_transition_type ?? (ghostStep?.status === 'skipped' ? 'skipped' : 'confirmed');
    const ghostSegmentContext = plan?.execution?.current_segment_origin_label ?? undefined;

    return (
        <GlassPanel
            title={plan?.title ?? 'Arbeitsplan'}
            paneId={paneId}
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
        >
            <div className="flex flex-col h-full bg-black/60 rounded-b-2xl overflow-hidden">
                {isLoading && <div className="flex-1 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-white/25" /></div>}

                {!isLoading && error && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <CommandReceipt tone="red" icon={XCircle} label="Arbeitsplan nicht erreichbar" title={error}
                            body="Der Plan konnte gerade nicht geladen werden. Bitte dieses Fenster schließen und erneut öffnen, wenn der Fehler bleibt."
                            chips={[{ label: 'Keine Aktion ausgefuehrt' }, { label: 'Datenstand bleibt erhalten' }]} className="w-full max-w-xl" />
                    </div>
                )}

                {!isLoading && !error && !plan && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <CommandReceipt tone="slate" label="Arbeitsplan" title="Kein Plan geladen."
                            body="Mora zeigt hier nur einen vorhandenen Plan an. Sobald ein Plan angelegt oder geöffnet wurde, erscheint er in dieser Flaeche."
                            chips={[{ label: 'Wartet auf Plan' }, { label: 'Universe bleibt aktiv' }]} className="w-full max-w-xl" />
                    </div>
                )}

                {plan && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
                            <CommandReceipt tone={receiptTone} label={stateBadge?.label || 'Arbeitsplan'} title={plan.title}
                                body={plan.summary || 'Der Plan ist geladen und Mora zeigt hier die aktuelle Arbeit und ihre Statuslage.'}
                                chips={[
                                    ...(plan.scope?.view_level ? [{ label: `Sicht: ${plan.scope.view_level}` }] : []),
                                    ...(plan.scope?.active_entity_type ? [{ label: `Objekt: ${plan.scope.active_entity_type}` }] : []),
                                    ...(plan.mode ? [{ label: `Modus: ${plan.mode}` }] : []),
                                    ...(readCount > 0 ? [{ label: `Lesen ${readCount}` }] : []),
                                    ...(writeCount > 0 ? [{ label: `Schreiben ${writeCount}` }] : []),
                                    ...(runningCount > 0 ? [{ label: `Laeuft ${runningCount}` }] : []),
                                    ...(skippedCount > 0 ? [{ label: `Uebersprungen ${skippedCount}` }] : []),
                                    ...(completedCount !== undefined && totalCount > 0 && completedCount > 0 ? [{ label: `${completedCount}/${totalCount} fertig`, tone: 'emerald' as const }] : []),
                                ]}
                                footer={plan.transparency_note || 'Mora zeigt nur den Zustand, den der Kern geliefert hat.'}
                            />
                        </div>

                        <AnimatePresence>
                            {(pendingSteps.length > 0 || showGhost) && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="px-4 pt-4 pb-2">
                                    {pendingSteps.length > 0 && <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/55 mb-2.5">Bestaetigung erforderlich</div>}
                                    <div className="space-y-2">
                                        {showGhost && ghostStep && (
                                            <motion.div key={`ghost-${lastTransitionStepId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <TransitionGhostCard stepTitle={ghostStep.title} transitionType={ghostTransitionType} message={ghostMessage} segmentContext={ghostSegmentContext} />
                                            </motion.div>
                                        )}
                                        {pendingSteps.map((step) => (
                                            <ConfirmStepCard key={step.step_id} step={step} onConfirm={handleConfirmStep} onReject={handleRejectStep} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {timelineSteps.length > 0 && (() => {
                            const groups = groupStepsBySegment(timelineSteps, plan.segment_summaries);
                            return (
                                <div className="px-4 py-4">
                                    {pendingSteps.length > 0 && <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-3">Schritte</div>}
                                    {groups.map((group, groupIdx) => {
                                        const isActiveGroup = plan?.state === 'running' && (() => {
                                            if (plan?.execution?.current_segment_index !== undefined) {
                                                return group.summary?.segment_index === plan.execution.current_segment_index;
                                            }
                                            if (group.summary?.latest === true) return true;
                                            return group.steps.some(s => s.status === 'running');
                                        })();
                                        return (
                                            <React.Fragment key={group.summary?.segment_index ?? `seg-${groupIdx}`}>
                                                {groupIdx > 0 && <SegmentDivider summary={group.summary} />}
                                                <div className={isActiveGroup ? 'border-l-2 border-blue-400/25 pl-2.5' : ''}>
                                                    <div className="space-y-1">
                                                        {group.steps.map((step, idx) => (
                                                            <motion.div key={step.step_id} initial={{ opacity: 0, x: -3 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.025, duration: 0.15 }}>
                                                                <StepRow step={step} onOpen={(targetStep) => openWorkSessionNavigation(targetStep, openPane)} />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            );
                        })()}

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
}
