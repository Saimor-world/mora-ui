'use client';

import React, { useState } from 'react';
import { Search, BookOpen, GitCompare, ListChecks, Sparkles, AlertTriangle, Wrench, ChevronRight, ChevronDown, type LucideIcon } from 'lucide-react';
import type { ToolTraceKind, ToolTraceStep } from '@/lib/chat/toolTrace';
import { TONES } from '@/lib/ui/status';

const ICONS: Record<ToolTraceKind, LucideIcon> = {
    searched: Search,
    read: BookOpen,
    compared: GitCompare,
    planned: ListChecks,
    acted: Sparkles,
    failed: AlertTriangle,
    other: Wrench,
};

export function ToolTrace({ steps }: { steps?: ToolTraceStep[] }) {
    const [expanded, setExpanded] = useState(false);

    if (!steps || steps.length === 0) return null;

    const hasFailure = steps.some((s) => !s.ok);

    if (!expanded) {
        return (
            <button
                data-testid="tool-trace"
                onClick={() => setExpanded(true)}
                className={`mt-2 inline-flex items-center gap-1 text-[11px] transition-colors ${
                    hasFailure ? 'text-amber-200/70 hover:text-amber-200' : 'text-white/32 hover:text-white/55'
                }`}
            >
                <ChevronRight size={11} />
                {steps.length} {steps.length === 1 ? 'Schritt' : 'Schritte'}
            </button>
        );
    }

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div data-testid="tool-trace" className="mt-2">
            <button
                onClick={() => setExpanded(false)}
                className="mb-1.5 inline-flex items-center gap-1 text-[11px] text-white/32 hover:text-white/55 transition-colors"
            >
                <ChevronDown size={11} />
                {steps.length} {steps.length === 1 ? 'Schritt' : 'Schritte'}
            </button>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {steps.map((step, i) => {
                    const Icon = ICONS[step.kind] ?? Wrench;
                    const durationText = step.durationMs != null ? ` (${formatDuration(step.durationMs)})` : '';
                    return (
                        <span
                            key={i}
                            className={`inline-flex items-center gap-1.5 text-[11px] ${step.ok ? 'text-white/45' : 'text-amber-200/80'}`}
                            title={step.ok ? undefined : 'Aktion nicht abgeschlossen'}
                        >
                            <Icon size={11} className={step.ok ? TONES.success.text : TONES.warning.text} />
                            <span>{step.label}{step.detail ? `: ${step.detail}` : ''}{durationText}</span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
