// components/mora/MoraContextChip.tsx
"use client";

import React from 'react';
import { Layers, Lock, Brain, ArrowRight } from 'lucide-react';
import type { MoraContextSnapshot } from '@/lib/mora/useMoraContext';

export interface MoraContextChipProps {
    snapshot: MoraContextSnapshot;
    /** bar = compact single-line (Intel Bar)
     *  sidebar = slightly wider, same line
     *  hub = full row with more label space */
    variant?: 'bar' | 'sidebar' | 'hub';
    className?: string;
}

// ─── Scope breadcrumb string ─────────────────────────────────────────────────

function buildBreadcrumb(labels: MoraContextSnapshot['scopeLabels']): string {
    const parts: string[] = [];
    if (labels.company) parts.push(labels.company);
    if (labels.department) parts.push(labels.department);
    if (labels.space) parts.push(labels.space);
    if (labels.folder) parts.push(labels.folder);
    return parts.slice(0, 3).join(' › ');
}

function truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// ─── Answer source pill ──────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
    NonNullable<MoraContextSnapshot['lastAnswerSource']>,
    { label: string; className: string }
> = {
    memory: {
        label: 'Gedächtnis',
        className: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    },
    context: {
        label: 'Kontext',
        className: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    },
    inference: {
        label: 'Inferenz',
        className: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    },
};

// ─── Component ───────────────────────────────────────────────────────────────

export const MoraContextChip: React.FC<MoraContextChipProps> = ({
    snapshot,
    variant = 'bar',
    className = '',
}) => {
    const {
        scopeLevel,
        scopeLabels,
        scopeEnforced,
        scopeReason,
        memoryPendingCount,
        lastAnswerSource,
    } = snapshot;

    // Don't render if there is genuinely nothing to show
    const hasScopeInfo = scopeLevel !== 'global';
    const hasMemory = memoryPendingCount > 0;
    const hasSource = lastAnswerSource !== null;
    if (!hasScopeInfo && !hasMemory && !hasSource) return null;

    const breadcrumb = hasScopeInfo ? buildBreadcrumb(scopeLabels) : null;
    const maxChars = variant === 'hub' ? 36 : variant === 'sidebar' ? 28 : 22;

    return (
        <div
            className={`flex items-center gap-1.5 flex-wrap ${className}`}
            aria-label="Mora Kontext"
        >
            {/* Hub-variant label */}
            {variant === 'hub' && hasScopeInfo && (
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/30 mr-1">
                    Kontext
                </span>
            )}

            {/* Scope breadcrumb */}
            {breadcrumb && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 transition-colors duration-150">
                    <Layers size={10} className="text-emerald-400/70 shrink-0" />
                    <span className="text-[11px] text-white/70 font-light leading-none">
                        {truncate(breadcrumb, maxChars)}
                    </span>
                </div>
            )}

            {/* Enforced lock */}
            {scopeEnforced && (
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 transition-colors duration-150 cursor-default"
                    title={scopeReason ?? 'Scope eingeschränkt'}
                    aria-label={scopeReason ? `Scope eingeschränkt: ${scopeReason}` : 'Scope eingeschränkt'}
                >
                    <Lock size={9} className="text-amber-400/80 shrink-0" />
                    {variant === 'hub' && (
                        <span className="text-[10px] text-amber-300/80 leading-none">
                            {scopeReason ?? 'Eingeschränkt'}
                        </span>
                    )}
                </div>
            )}

            {/* Memory pending badge */}
            {hasMemory && (
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 transition-colors duration-150"
                    title={`${memoryPendingCount} Einträge warten auf Überprüfung`}
                >
                    <Brain size={9} className="text-violet-400/70 shrink-0" />
                    <span className="text-[10px] text-violet-300/80 leading-none font-medium">
                        {memoryPendingCount > 9 ? '9+' : memoryPendingCount}
                    </span>
                </div>
            )}

            {/* Answer source pill */}
            {hasSource ? (() => {
                const cfg = lastAnswerSource !== null ? SOURCE_CONFIG[lastAnswerSource] : undefined;
                if (!cfg) return null;
                return (
                    <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] leading-none transition-colors duration-150 ${cfg.className}`}
                        title={`Antwortquelle: ${cfg.label}`}
                    >
                        <ArrowRight size={9} className="shrink-0" />
                        {cfg.label}
                    </div>
                );
            })() : (
                // Graceful degradation: source unknown, show neutral dash
                <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/25 leading-none"
                    title="Antwortquelle nicht verfügbar (Backend-Abhängigkeit)"
                >
                    —
                </div>
            )}
        </div>
    );
};

export default MoraContextChip;
