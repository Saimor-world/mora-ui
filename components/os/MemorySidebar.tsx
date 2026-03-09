"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronLeft, ChevronRight, Search, Check, Clock, AlertCircle, Lightbulb, X, Activity, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { create } from 'zustand';
import { useMemory } from '@/lib/hooks/useMemory';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';
import { useMoraStore } from '@/lib/store/moraState';
import {
    searchMemory,
    learnInsight,
    reconcileMemory,
    getCachePerformance,
    getCriticalFlowPerformance,
    getApiVersionPerformance,
    type MemoryReconcileResult,
    type CachePerformance,
    type CacheBucket,
    type CriticalFlowPerformance,
    type ApiVersionPerformance
} from '@/lib/api/coreClient';
import type { MemorySearchResult, MemoryCategory } from '@/lib/types/memory';
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';

/**
 * MEMORY SIDEBAR
 *
 * Quick-access sidebar for Mora's memory system.
 * Shows pending items, recent memories, and quick input.
 *
 * Features:
 * - Collapsible sidebar (right edge)
 * - Quick memory input
 * - Pending review count
 * - Recent memories list
 * - Keyboard shortcut: Strg+Shift+M
 */

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

interface MemorySidebarState {
    isOpen: boolean;
    isCollapsed: boolean;
    setOpen: (open: boolean) => void;
    setCollapsed: (collapsed: boolean) => void;
    toggle: () => void;
}

export const useMemorySidebarStore = create<MemorySidebarState>((set) => ({
    isOpen: false,
    isCollapsed: true,
    setOpen: (open) => set({ isOpen: open }),
    setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
    toggle: () => set((s) => ({ isOpen: !s.isOpen, isCollapsed: false })),
}));

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUT HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useMemorySidebarShortcut() {
    const toggle = useMemorySidebarStore((s) => s.toggle);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Shift + M
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                toggle();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggle]);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const QuickMemoryInputInline: React.FC<{
    onSuccess?: () => Promise<void> | void;
    companyId?: string | null;
}> = ({ onSuccess, companyId }) => {
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!input.trim() || isSubmitting || !companyId) return;
        setIsSubmitting(true);

        try {
            await learnInsight({
                insight: input.trim(),
                category: 'context',
                auto_commit: true,
                company_id: companyId,
            });
            setSuccess(true);
            setInput('');
            onSuccess?.();
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error('[MemorySidebar] Learn failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-3 border-b border-white/5">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Schnell merken..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                    disabled={isSubmitting}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-white/30 hover:text-violet-400 disabled:opacity-30 transition-colors"
                >
                    {success ? <Check size={14} className="text-emerald-400" /> : <Brain size={14} />}
                </button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// PENDING ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const PendingItem: React.FC<{
    item: any;
    onApprove: () => void;
    onReject: () => void;
}> = ({ item, onApprove, onReject }) => (
    <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs">
        <p className="text-white/70 line-clamp-2 mb-2">{item.summary || item.insight}</p>
        <div className="flex items-center justify-between">
            <span className="text-[9px] text-amber-400/60 uppercase">{item.category}</span>
            <div className="flex gap-1">
                <button
                    onClick={onApprove}
                    className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                    <Check size={12} />
                </button>
                <button
                    onClick={onReject}
                    className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const MemoryItem: React.FC<{ memory: MemorySearchResult }> = ({ memory }) => {
    const categoryColors: Record<string, string> = {
        preference: 'text-blue-400',
        fact: 'text-amber-400',
        context: 'text-violet-400',
        summary: 'text-emerald-400',
    };

    const colorClass = memory.category ? categoryColors[memory.category] || 'text-white/40' : 'text-white/40';

    return (
        <div className="p-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs hover:bg-white/[0.04] transition-colors">
            <p className="text-white/70 line-clamp-2">{memory.summary}</p>
            <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[9px] uppercase ${colorClass}`}>
                    {memory.category || 'unknown'}
                </span>
                {memory.score && (
                    <span className="text-[9px] text-white/20">{Math.round(memory.score * 100)}%</span>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS PANEL
// ═══════════════════════════════════════════════════════════════════════════

type ReconcileStep = 'idle' | 'previewing' | 'preview_done' | 'applying' | 'done' | 'error';

// ─── Cache bucket health helpers ───────────────────────────────────────────────────
function hitRate(b: CacheBucket): number {
    const total = b.hits + b.misses;
    return total === 0 ? 1 : b.hits / total;
}
function invRate(b: CacheBucket): number {
    const total = b.hits + b.misses + (b.invalidations ?? 0);
    return total === 0 ? 0 : (b.invalidations ?? 0) / total;
}

const CacheBucketRow: React.FC<{ label: string; bucket: CacheBucket }> = ({ label, bucket }) => {
    const hit = hitRate(bucket);
    const inv = invRate(bucket);
    const isLowHit = hit < 0.5;
    const isHighInv = inv > 0.2;
    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/50 font-medium">{label}</span>
                <span className={`${isLowHit ? 'text-red-300' : 'text-emerald-300'}`}>
                    {Math.round(hit * 100)}% hit
                </span>
            </div>
            {/* Hit-rate bar */}
            <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isLowHit ? 'bg-red-500/70' : 'bg-emerald-500/70'
                        }`}
                    style={{ width: `${Math.round(hit * 100)}%` }}
                />
            </div>
            <div className="flex gap-3 text-[9px] text-white/30">
                <span>↑{bucket.hits}h</span>
                <span>↓{bucket.misses}m</span>
                {bucket.invalidations != null && <span>Ø{bucket.invalidations}inv</span>}
                {bucket.evictions != null && <span>▻{bucket.evictions}ev</span>}
                <span className="ml-auto">{bucket.active_entries ?? bucket.entries} entries</span>
            </div>
            {isLowHit && (
                <div className="text-[9px] text-red-400/80 flex items-center gap-1">
                    <span>⚠️</span> Hohe Miss-Rate
                </div>
            )}
            {isHighInv && (
                <div className="text-[9px] text-amber-400/70 flex items-center gap-1">
                    <span>⚡</span> Hohe Invalidierungsrate
                </div>
            )}
        </div>
    );
};

const DiagnosticsPanel: React.FC<{
    debugScope: ReturnType<typeof useMemory>['debugScope'];
    companyId: string | null;
    userRole?: string;
    onReconcileDone: () => void;
    isVisible: boolean;
}> = ({ debugScope, companyId, userRole, onReconcileDone, isVisible }) => {
    const [step, setStep] = useState<ReconcileStep>('idle');
    const [preview, setPreview] = useState<MemoryReconcileResult | null>(null);
    const [result, setResult] = useState<MemoryReconcileResult | null>(null);
    const [reconcileError, setReconcileError] = useState<string | null>(null);
    const [cachePerf, setCachePerf] = useState<CachePerformance | null>(null);
    const [criticalFlows, setCriticalFlows] = useState<CriticalFlowPerformance | null>(null);
    const [apiVersions, setApiVersions] = useState<ApiVersionPerformance | null>(null);
    const isOwner = userRole === 'owner' || userRole === 'admin';

    // Poll cache + critical-flow performance every 8s while diagnostics tab is visible
    useEffect(() => {
        if (!isVisible) return;
        let cancelled = false;
        const poll = async () => {
            const [cacheData, criticalData, apiVersionData] = await Promise.all([
                getCachePerformance(),
                getCriticalFlowPerformance(),
                getApiVersionPerformance(900, 5),
            ]);
            if (!cancelled && cacheData) setCachePerf(cacheData);
            if (!cancelled && criticalData) setCriticalFlows(criticalData);
            if (!cancelled && apiVersionData) setApiVersions(apiVersionData);
        };
        poll();
        const id = setInterval(poll, 8000);
        return () => { cancelled = true; clearInterval(id); };
    }, [isVisible]);

    const hasScopeMismatch = !!debugScope?.errors?.length;
    const counts = debugScope?.counts;

    const handlePreview = useCallback(async () => {
        if (!companyId) return;
        setStep('previewing');
        setReconcileError(null);
        try {
            const res = await reconcileMemory(companyId, false);
            if (res) { setPreview(res); setStep('preview_done'); }
            else { setReconcileError('Keine Antwort vom Server'); setStep('error'); }
        } catch (e: any) {
            setReconcileError(e?.message || 'Vorschau fehlgeschlagen');
            setStep('error');
        }
    }, [companyId]);

    const handleApply = useCallback(async () => {
        if (!companyId) return;
        setStep('applying');
        try {
            const res = await reconcileMemory(companyId, true);
            if (res) { setResult(res); setStep('done'); onReconcileDone(); }
            else { setReconcileError('Apply fehlgeschlagen'); setStep('error'); }
        } catch (e: any) {
            setReconcileError(e?.message || 'Apply fehlgeschlagen');
            setStep('error');
        }
    }, [companyId, onReconcileDone]);

    if (!debugScope) {
        return (
            <div className="flex flex-col items-center gap-3 py-8 text-white/30">
                <Activity size={20} className="opacity-40" />
                <span className="text-xs">Diagnostics werden geladen...</span>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
            {/* Scope info */}
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">Aktiver Scope</div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-[10px] text-violet-300 font-medium">
                        {debugScope.scope?.type || 'unknown'}
                    </span>
                    {debugScope.scope?.company_id && (
                        <span className="text-[10px] text-white/40 font-mono truncate max-w-[160px]">{debugScope.scope.company_id}</span>
                    )}
                </div>
                {debugScope.diagnostics && (
                    <div className="flex items-center gap-3 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                            <Clock size={10} className="text-white/30" />
                            <span className="text-[10px] text-white/50">{debugScope.diagnostics.query_time_ms.toFixed(1)}ms</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${debugScope.diagnostics.cached ? 'bg-emerald-400' : 'bg-amber-400/50'}`} />
                            <span className="text-[10px] text-white/50">{debugScope.diagnostics.cached ? 'Cached' : 'Live'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Counts grid */}
            {counts && (
                <div className="grid grid-cols-2 gap-1.5">
                    {([
                        { key: 'mem_episodic', label: 'Episodic', color: 'text-cyan-300' },
                        { key: 'mem_facts', label: 'Facts', color: 'text-amber-300' },
                        { key: 'mem_review_queue', label: 'Pending', color: 'text-orange-300' },
                        { key: 'memories', label: 'Total v3', color: 'text-emerald-300' },
                    ] as const).map(({ key, label, color }) => (
                        <div key={key} className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5">
                            <div className="text-[8px] text-white/35 uppercase tracking-wide">{label}</div>
                            <div className={`text-base leading-none font-light ${color}`}>{counts[key] ?? 0}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Scope mismatch warning + actionable CTA */}
            {hasScopeMismatch && (
                <div className="flex items-start gap-2 p-2 rounded-lg border border-red-500/30 bg-red-500/10">
                    <ShieldAlert size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <p className="text-[10px] font-semibold text-red-300">Scope-Mismatch erkannt</p>
                        {debugScope.errors.map((e: string, i: number) => (
                            <p key={i} className="text-[10px] text-red-400/80">{e}</p>
                        ))}
                        {isOwner && step === 'idle' && (
                            <button
                                onClick={handlePreview}
                                className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] font-medium transition-colors"
                            >
                                <Zap size={10} /> Reconcile starten
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Hints */}
            {debugScope.hints?.length > 0 && (
                <div className="space-y-1">
                    <div className="text-[9px] uppercase tracking-wider text-white/30">Hinweise</div>
                    {debugScope.hints.map((h: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/50">
                            <Lightbulb size={10} className="text-amber-400/70 mt-0.5 shrink-0" />
                            {h}
                        </div>
                    ))}
                </div>
            )}

            {/* Cache Perf section */}
            {cachePerf && (
                <div className="space-y-2">
                    <div className="text-[9px] uppercase tracking-wider text-white/30">Cache Perf</div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2 space-y-3">
                        <CacheBucketRow label="learning_brain · search" bucket={cachePerf.learning_brain.search} />
                        <div className="border-t border-white/5" />
                        <CacheBucketRow label="learning_brain · metrics" bucket={cachePerf.learning_brain.metrics} />
                        <div className="border-t border-white/5" />
                        <CacheBucketRow label="folder_context" bucket={cachePerf.folder_context} />
                        {cachePerf.entity_context && (
                            <>
                                <div className="border-t border-white/5" />
                                <CacheBucketRow label="entity_context" bucket={cachePerf.entity_context} />
                            </>
                        )}
                        {cachePerf.default_company_scope && (
                            <>
                                <div className="border-t border-white/5" />
                                <CacheBucketRow label="default_company_scope" bucket={cachePerf.default_company_scope} />
                            </>
                        )}
                        {cachePerf.memory_debug_scope && (
                            <>
                                <div className="border-t border-white/5" />
                                <CacheBucketRow label="memory_debug_scope" bucket={cachePerf.memory_debug_scope} />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* API Version Cutover */} 
            {apiVersions && (
                <div className="space-y-2">
                    <div className="text-[9px] uppercase tracking-wider text-white/30">API Cutover</div>
                    <div className={`rounded-lg border p-2 space-y-2 ${apiVersions.phaseout_gate.pass
                        ? 'border-emerald-500/25 bg-emerald-500/10'
                        : 'border-red-500/25 bg-red-500/10'
                        }`}>
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                                <div className="text-[8px] text-white/35 uppercase">v3</div>
                                <div className="text-[11px] text-emerald-300">{apiVersions.versions.v3.count}</div>
                            </div>
                            <div className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                                <div className="text-[8px] text-white/35 uppercase">v1</div>
                                <div className="text-[11px] text-amber-300">{apiVersions.versions.v1.count}</div>
                            </div>
                            <div className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                                <div className="text-[8px] text-white/35 uppercase">Legacy Crit</div>
                                <div className={`text-[11px] ${apiVersions.critical_legacy_routes.count === 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {apiVersions.critical_legacy_routes.count}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-white/40">Gate</span>
                            <span className={`font-semibold ${apiVersions.phaseout_gate.pass ? 'text-emerald-300' : 'text-red-300'}`}>
                                {apiVersions.phaseout_gate.pass ? 'PASS' : 'FAIL'}
                            </span>
                        </div>
                        {apiVersions.legacy_routes_top?.length > 0 ? (
                            <div className="text-[10px] text-white/45 truncate">
                                Top legacy: <span className="text-white/65 font-mono">{apiVersions.legacy_routes_top[0].route}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-white/30 italic">No legacy routes</div>
                        )}
                    </div>
                </div>
            )}

            {/* Critical flow gate */}
            {criticalFlows && (
                <div className="space-y-2">
                    <div className="text-[9px] uppercase tracking-wider text-white/30">Critical Flow Gate</div>
                    <div className={`rounded-lg border p-2 space-y-2 ${criticalFlows.gate.pass
                        ? 'border-emerald-500/25 bg-emerald-500/10'
                        : 'border-red-500/25 bg-red-500/10'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] font-semibold">
                                {criticalFlows.gate.pass ? 'PASS' : 'FAIL'}
                            </div>
                            <div className="text-[10px] text-white/50">window {criticalFlows.window_seconds}s</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                                <div className="text-[8px] text-white/35 uppercase">Legacy v1</div>
                                <div className="text-[11px] text-red-300">{criticalFlows.legacy_v1_critical_calls.count}</div>
                            </div>
                            <div className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                                <div className="text-[8px] text-white/35 uppercase">Context 5xx</div>
                                <div className="text-[11px] text-red-300">{criticalFlows.context_routes.status_5xx}</div>
                            </div>
                            <div className="rounded border border-white/10 bg-white/[0.03] px-2 py-1">
                                <div className="text-[8px] text-white/35 uppercase">Unbounded</div>
                                <div className="text-[11px] text-amber-300">{criticalFlows.v3_list_routes.unbounded_unscoped_count}</div>
                            </div>
                        </div>
                        {!criticalFlows.gate.pass && criticalFlows.gate.violations.length > 0 && (
                            <div className="space-y-1">
                                {criticalFlows.gate.violations.map((v) => (
                                    <div key={v} className="text-[10px] text-red-300/90">
                                        • {v}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reconcile — owner/admin only */}
            {isOwner && (
                <div className="pt-1">
                    <div className="text-[9px] uppercase tracking-wider text-white/30 mb-2">Legacy-Reconcile</div>

                    {step === 'idle' && (
                        <button
                            onClick={handlePreview}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 text-xs transition-colors"
                        >
                            <Zap size={12} /> Vorschau starten
                        </button>
                    )}

                    {step === 'previewing' && (
                        <div className="flex items-center justify-center gap-2 py-3 text-xs text-white/40">
                            <RefreshCw size={12} className="animate-spin" /> Analysiere...
                        </div>
                    )}

                    {step === 'preview_done' && preview && (
                        <div className="space-y-2">
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[10px] space-y-1">
                                <div className="flex justify-between"><span className="text-white/40">Neu migrierbar</span><span className="text-emerald-300">{preview.created}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Bereits vorhanden</span><span className="text-white/60">{preview.already_present}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Übersprungen</span><span className="text-amber-300">{preview.skipped}</span></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep('idle')} className="flex-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 transition-colors">
                                    Abbrechen
                                </button>
                                <button onClick={handleApply} className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-xs transition-colors">
                                    Anwenden
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'applying' && (
                        <div className="flex items-center justify-center gap-2 py-3 text-xs text-emerald-400">
                            <RefreshCw size={12} className="animate-spin" /> Wird angewendet...
                        </div>
                    )}

                    {step === 'done' && result && (
                        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300 mb-1">
                                <Check size={12} /> Reconcile abgeschlossen
                            </div>
                            <div className="text-[10px] text-white/50 space-y-0.5">
                                <div>Erstellt: <span className="text-emerald-300">{result.created}</span></div>
                                <div>Vorhanden: <span className="text-white/60">{result.already_present}</span></div>
                                <div>Übersprungen: <span className="text-amber-300">{result.skipped}</span></div>
                            </div>
                            <button onClick={() => { setStep('idle'); setResult(null); }} className="mt-1 text-[10px] text-white/30 hover:text-white/50">
                                Schließen
                            </button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-[10px] text-red-300">
                            {reconcileError}
                            <button onClick={() => setStep('idle')} className="block mt-1 text-white/40 hover:text-white/60">Zurücksetzen</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const MemorySidebar: React.FC = () => {
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const companies = useMoraStore((s) => s.companies);
    const user = useMoraStore((s) => (s as any).user);
    const resolvedCompanyId = activeCompanyId || companies[0]?.id || null;
    const mod = usePlatformModifier();
    const { isOpen, isCollapsed, setOpen, setCollapsed } = useMemorySidebarStore();
    const { pendingCount, pendingItems, refresh, approve, reject, debugScope } = useMemory();
    const ctx = useMoraContext();
    const [activeTab, setActiveTab] = useState<'memories' | 'diagnostics'>('memories');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
    const [recentMemories, setRecentMemories] = useState<MemorySearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Load recent memories on mount
    useEffect(() => {
        if (!resolvedCompanyId) {
            setRecentMemories([]);
            return;
        }
        const loadRecent = async () => {
            try {
                const results = await searchMemory('', 10, resolvedCompanyId);
                if (results) {
                    setRecentMemories(results);
                }
            } catch (err) {
                console.warn('[MemorySidebar] Failed to load recent:', err);
            }
        };
        if (isOpen) {
            loadRecent();
        }
    }, [resolvedCompanyId, isOpen]);

    // Search memories
    useEffect(() => {
        if (searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            if (!resolvedCompanyId) {
                setIsSearching(false);
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const results = await searchMemory(searchQuery, 5, resolvedCompanyId);
                setSearchResults(results || []);
            } catch (err) {
                console.error('[MemorySidebar] Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [resolvedCompanyId, searchQuery]);

    // Calculate sidebar width
    const sidebarWidth = isCollapsed ? 48 : 280;

    return (
        <>
            {/* Collapsed Tab (always visible on right edge) */}
            <motion.button
                initial={{ x: 100 }}
                animate={{ x: isOpen ? 100 : 0 }}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-[400] p-2 bg-black/60 backdrop-blur-xl border border-white/10 border-r-0 rounded-l-xl hover:bg-black/80 transition-colors"
                onClick={() => { setOpen(true); setCollapsed(false); }}
            >
                <div className="flex flex-col items-center gap-1">
                    <Brain size={18} className="text-violet-400" />
                    {pendingCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] text-white font-bold flex items-center justify-center">
                            {pendingCount > 9 ? '!' : pendingCount}
                        </span>
                    )}
                </div>
            </motion.button>

            {/* Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-[399] bg-black/20"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ x: 300 }}
                            animate={{ x: 0 }}
                            exit={{ x: 300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 z-[400] bg-black/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl"
                            style={{ width: sidebarWidth }}
                        >
                            {isCollapsed ? (
                                // Collapsed view
                                <div className="flex flex-col items-center py-4 gap-4">
                                    <button
                                        onClick={() => setCollapsed(false)}
                                        className="p-2 text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <Brain size={20} className="text-violet-400" />
                                    {pendingCount > 0 && (
                                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                            <span className="text-[10px] text-amber-400 font-bold">{pendingCount}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Expanded view
                                <div className="flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-3 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Brain size={16} className="text-violet-400" />
                                            <span className="text-xs font-medium text-white/80">Memory</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setCollapsed(true)}
                                                className="p-1 text-white/30 hover:text-white/60 transition-colors"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                            <button
                                                onClick={() => setOpen(false)}
                                                className="p-1 text-white/30 hover:text-white/60 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tab Bar */}
                                    <div className="flex border-b border-white/5">
                                        {(['memories', 'diagnostics'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-medium transition-colors ${activeTab === tab
                                                    ? 'text-violet-300 border-b-2 border-violet-500'
                                                    : 'text-white/30 hover:text-white/50'
                                                    }`}
                                            >
                                                {tab === 'memories' ? 'Speicher' : 'Diagnose'}
                                            </button>
                                        ))}
                                    </div>

                                    {activeTab === 'diagnostics' ? (
                                        <DiagnosticsPanel
                                            debugScope={debugScope}
                                            companyId={resolvedCompanyId}
                                            userRole={user?.role}
                                            onReconcileDone={refresh}
                                            isVisible={activeTab === 'diagnostics'}
                                        />
                                    ) : (<>

                                        {ctx.isOperational === null ? null : ctx.isOperational ? (
                                            <>
                                                {/* Quick Input */}
                                                {/* MR18: Mora context header — same scope as Intel Bar */}
                                                <div className="px-3 py-2 border-b border-white/5">
                                                    <MoraContextChip variant="sidebar" snapshot={ctx} />
                                                </div>
                                                <QuickMemoryInputInline onSuccess={refresh} companyId={activeCompanyId} />

                                                {!activeCompanyId && (
                                                    <div className="mx-3 mt-3 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-200">
                                                        Keine aktive Company gewaehlt. Memory ist pro Company isoliert.
                                                    </div>
                                                )}

                                                {/* Search */}
                                                <div className="p-3 border-b border-white/5">
                                                    <div className="relative">
                                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                                                        <input
                                                            type="text"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            placeholder="Suchen..."
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                                    {/* Search Results */}
                                                    {searchQuery.length >= 3 && (
                                                        <div>
                                                            <div className="text-[9px] uppercase tracking-wider text-white/30 mb-2">
                                                                Suchergebnisse
                                                            </div>
                                                            {isSearching ? (
                                                                <div className="text-xs text-white/40 text-center py-2">Suche...</div>
                                                            ) : searchResults.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {searchResults.map((mem) => (
                                                                        <MemoryItem key={mem.id} memory={mem} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-white/40 text-center py-2">Keine Ergebnisse</div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Pending Reviews */}
                                                    {pendingCount > 0 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <AlertCircle size={12} className="text-amber-400" />
                                                                <span className="text-[9px] uppercase tracking-wider text-amber-400/70">
                                                                    Zur Prüfung ({pendingCount})
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {pendingItems.slice(0, 3).map((item) => (
                                                                    <PendingItem
                                                                        key={item.id}
                                                                        item={item}
                                                                        onApprove={() => approve(item.id)}
                                                                        onReject={() => reject(item.id)}
                                                                    />
                                                                ))}
                                                                {pendingItems.length > 3 && (
                                                                    <button className="w-full text-[10px] text-violet-400/70 hover:text-violet-400 py-1">
                                                                        +{pendingItems.length - 3} weitere
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Recent Memories */}
                                                    {searchQuery.length < 3 && (
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Clock size={12} className="text-white/30" />
                                                                <span className="text-[9px] uppercase tracking-wider text-white/30">
                                                                    Kürzlich gelernt
                                                                </span>
                                                            </div>
                                                            {recentMemories.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {recentMemories.slice(0, 5).map((mem) => (
                                                                        <MemoryItem key={mem.id} memory={mem} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-white/30 text-center py-4">
                                                                    <Lightbulb size={16} className="mx-auto mb-2 opacity-40" />
                                                                    Noch keine Erinnerungen
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-xs text-muted-foreground px-4 py-6 text-center leading-relaxed">
                                                Speicher ist verfügbar, sobald ein Workspace eingerichtet ist.
                                            </p>
                                        )}

                                        {/* Footer */}
                                        <div className="p-3 border-t border-white/5 text-[9px] text-white/20 text-center">
                                            {mod}+Shift+M zum Oeffnen
                                        </div>
                                    </>)}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default MemorySidebar;
