'use client';

/**
 * WorkSessionPane — Grounded Work Session V1
 *
 * OS-level pane for a structured work-session plan (Core 0df2d28).
 * Displays plan title, scope context, step timeline (read vs. write),
 * and pending confirmation steps with inline confirm/reject.
 *
 * Data flow:
 *   openPane({ type: 'work-session', data: { plan } })       — pre-populated
 *   openPane({ type: 'work-session', data: { plan_id } })    — fetch on mount
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet, corePost } from '@/lib/api/coreClient';
import type { WorkSessionPlan, WorkSessionStats, WorkSessionStep, WorkSessionStepStatus } from '@/lib/api/coreClient';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Eye,
    Loader2,
    Pencil,
    PlayCircle,
    SkipForward,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Kinds that mutate data — shown with amber/orange accent */
const WRITE_KINDS = new Set([
    'create', 'update', 'move', 'delete', 'write', 'execute', 'patch', 'rename',
]);

const POLL_INTERVAL_MS = 3000;

// ─── Helpers ───────────────────────────────────────────────────────────────

function isWriteKind(kind: string): boolean {
    return WRITE_KINDS.has(kind.toLowerCase());
}

const planStateLabels: Record<string, { label: string; cls: string }> = {
    pending:              { label: 'Bereit',          cls: 'bg-white/[0.05] text-white/40 border-white/10' },
    running:              { label: 'Läuft',            cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
    waiting_confirmation: { label: 'Wartet',           cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    done:                 { label: 'Abgeschlossen',    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
    partial:              { label: 'Teilweise',        cls: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
    failed:               { label: 'Fehlgeschlagen',   cls: 'bg-red-500/10 text-red-300 border-red-500/20' },
};

// ─── Step status icon ──────────────────────────────────────────────────────

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

// ─── Step row ──────────────────────────────────────────────────────────────

function StepRow({ step }: { step: WorkSessionStep }) {
    const [expanded, setExpanded] = useState(false);
    const write = isWriteKind(step.kind);
    const isDone = step.status === 'done';
    const isFailed = step.status === 'failed';
    const isRunning = step.status === 'running';
    const hasDetail = !!(step.why || step.output_summary || step.summary);

    const rowCls = write
        ? isDone   ? 'border-orange-500/10 bg-orange-500/[0.03]'
        : isFailed ? 'border-red-500/15 bg-red-500/[0.04]'
        :            'border-orange-500/15 bg-orange-500/[0.05]'
        : isDone   ? 'border-white/[0.04] bg-white/[0.01]'
        : isFailed ? 'border-red-500/15 bg-red-500/[0.04]'
        :            'border-white/[0.06] bg-white/[0.02]';

    const titleCls = isDone
        ? 'text-white/35 line-through decoration-white/15'
        : isFailed  ? 'text-red-300/70'
        : isRunning ? 'text-white/90 font-medium'
        : write     ? 'text-amber-100/75'
        :             'text-white/55';

    return (
        <div className={`rounded-lg border px-3 py-2.5 ${rowCls}`}>
            <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                    <StepIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs leading-snug break-words ${titleCls}`}>
                            {step.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {write && !isDone && (
                                <span className="text-[9px] uppercase tracking-wider text-orange-300/45 flex items-center gap-1">
                                    <Pencil size={8} />
                                    {step.kind}
                                </span>
                            )}
                            {!write && (
                                <Eye size={9} className="text-white/15" />
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
                                    {step.why && (
                                        <p className="text-[11px] text-white/38 leading-relaxed">{step.why}</p>
                                    )}
                                    {step.output_summary && (
                                        <div className="rounded bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5">
                                            <div className="text-[9px] uppercase tracking-wider text-white/22 mb-0.5">Ergebnis</div>
                                            <p className="text-[11px] text-white/65 leading-relaxed">{step.output_summary}</p>
                                        </div>
                                    )}
                                    {step.summary && !step.output_summary && (
                                        <p className="text-[11px] text-white/32 leading-relaxed">{step.summary}</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ─── Confirmation step card ─────────────────────────────────────────────────

function ConfirmStepCard({
    step,
    planId,
    onConfirm,
    onReject,
}: {
    step: WorkSessionStep;
    planId: string;
    onConfirm: (stepId: string) => Promise<void>;
    onReject: (stepId: string) => Promise<void>;
}) {
    const [processing, setProcessing] = useState(false);

    const handle = async (fn: (id: string) => Promise<void>) => {
        setProcessing(true);
        try { await fn(step.step_id); } finally { setProcessing(false); }
    };

    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
            <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-amber-100/90 leading-snug">{step.title}</div>
                    {step.why && (
                        <p className="text-[11px] text-white/42 mt-1 leading-relaxed">{step.why}</p>
                    )}
                    {step.tool_name && (
                        <span className="text-[9px] uppercase tracking-wider text-amber-200/35 mt-1 inline-block">
                            {step.tool_name.replace(/_/g, ' ')}
                        </span>
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
                    Ablehnen
                </button>
                <button
                    type="button"
                    onClick={() => handle(onConfirm)}
                    disabled={processing}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-100 text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                    {processing && <Loader2 size={11} className="animate-spin" />}
                    Ausführen
                </button>
            </div>
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────

export const WorkSessionPane: React.FC<{ id: string }> = ({ id }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);

    const [plan, setPlan] = useState<WorkSessionPlan | null>(
        (pane?.data?.plan as WorkSessionPlan | undefined) ?? null
    );
    const [isLoading, setIsLoading] = useState(!plan && !!pane?.data?.plan_id);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch plan if only plan_id was passed
    useEffect(() => {
        const planId = pane?.data?.plan_id as string | undefined;
        if (plan || !planId) return;
        let cancelled = false;
        setIsLoading(true);
        coreGet(`/v3/work-session/plan/${encodeURIComponent(planId)}`, { isOptional: true })
            .then((data) => {
                if (!cancelled) {
                    setPlan(data as WorkSessionPlan ?? null);
                    if (!data) setError('Plan nicht gefunden.');
                }
            })
            .catch(() => { if (!cancelled) setError('Plan konnte nicht geladen werden.'); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [pane?.data?.plan_id]);

    // Live polling while plan is active
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
            } catch { /* ignore poll failures */ }
        }, POLL_INTERVAL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [plan?.plan_id, plan?.state]);

    const handleConfirmStep = async (stepId: string) => {
        if (!plan) return;
        try {
            const updated = await corePost('/v3/work-session/confirm', { plan_id: plan.plan_id, step_id: stepId }, { isOptional: true });
            if (updated) {
                setPlan(updated as WorkSessionPlan);
            }
        } catch {
            toast.error('Best?tigung fehlgeschlagen.');
        }
    };

    const handleRejectStep = async (stepId: string) => {
        if (!plan) return;
        try {
            const updated = await corePost('/v3/work-session/reject', { plan_id: plan.plan_id, step_id: stepId }, { isOptional: true });
            if (updated) {
                setPlan(updated as WorkSessionPlan);
            }
        } catch {
            toast.error('Ablehnung fehlgeschlagen.');
        }
    };

    if (!pane) return null;

    const pendingSteps = plan?.steps.filter((s) => s.status === 'pending_confirmation') ?? [];
    const timelineSteps = plan?.steps.filter((s) => s.status !== 'pending_confirmation') ?? [];
    const stateBadge = plan ? (planStateLabels[plan.state] ?? { label: plan.state, cls: 'bg-white/[0.05] text-white/40 border-white/10' }) : null;

    // Prefer stats from the contract (cbd0639); fall back to local count if missing
    const readCount = plan?.stats?.read_steps ?? timelineSteps.filter((s) => !isWriteKind(s.kind)).length;
    const writeCount = plan?.stats?.write_steps ?? timelineSteps.filter((s) => isWriteKind(s.kind)).length;
    const completedCount = plan?.stats?.completed_steps;
    const totalCount = plan?.stats?.total_steps ?? (plan?.steps.length ?? 0);

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

                {/* Loading state */}
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={22} className="animate-spin text-white/25" />
                    </div>
                )}

                {/* Error state */}
                {!isLoading && error && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <div>
                            <XCircle size={22} className="mx-auto mb-2 text-red-400/50" />
                            <p className="text-sm text-white/45">{error}</p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !error && !plan && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <p className="text-sm text-white/25">Kein Plan geladen.</p>
                    </div>
                )}

                {/* Plan content */}
                {plan && (
                    <div className="flex-1 overflow-y-auto">

                        {/* ── Header ── */}
                        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h2 className="text-sm font-semibold text-white/90 leading-snug">{plan.title}</h2>
                                {stateBadge && (
                                    <span className={`shrink-0 text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ${stateBadge.cls}`}>
                                        {stateBadge.label}
                                    </span>
                                )}
                            </div>

                            {plan.summary && (
                                <p className="text-xs text-white/50 leading-relaxed mb-3">{plan.summary}</p>
                            )}

                            {/* Scope + mode chips */}
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
                                {/* Step count summary from stats */}
                                {readCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/25 flex items-center gap-1">
                                        <Eye size={9} />
                                        {readCount} Lesen
                                    </span>
                                )}
                                {writeCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/[0.08] border border-orange-400/15 text-orange-200/50 flex items-center gap-1">
                                        <Pencil size={9} />
                                        {writeCount} Schreiben
                                    </span>
                                )}
                                {completedCount !== undefined && totalCount > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-white/22">
                                        {completedCount}/{totalCount}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Pending confirmations ── */}
                        <AnimatePresence>
                            {pendingSteps.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="px-4 pt-4 pb-2"
                                >
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300/55 mb-2.5">
                                        Bestätigung erforderlich
                                    </div>
                                    <div className="space-y-2">
                                        {pendingSteps.map((step) => (
                                            <ConfirmStepCard
                                                key={step.step_id}
                                                step={step}
                                                planId={plan.plan_id}
                                                onConfirm={handleConfirmStep}
                                                onReject={handleRejectStep}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Steps timeline ── */}
                        {timelineSteps.length > 0 && (
                            <div className="px-4 py-4">
                                {pendingSteps.length > 0 && (
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-3">
                                        Schritte
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {timelineSteps.map((step, idx) => (
                                        <motion.div
                                            key={step.step_id}
                                            initial={{ opacity: 0, x: -3 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.025, duration: 0.15 }}
                                        >
                                            <StepRow step={step} />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Transparency note ── */}
                        {plan.transparency_note && (
                            <div className="px-5 pb-5">
                                <p className="text-[11px] text-white/25 italic leading-relaxed">
                                    {plan.transparency_note}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassPanel>
    );
};
