'use client';

import React from 'react';
import { Search, BookOpen, GitCompare, ListChecks, Sparkles, AlertTriangle, Wrench, type LucideIcon } from 'lucide-react';
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

/**
 * Compact, honest "what Mora did" trace under an answer.
 * Renders only the safe ToolTraceStep[] from toToolTrace() — never thoughts,
 * prompts or raw params. Failed steps are shown in amber, never as a green ✓.
 */
export function ToolTrace({ steps }: { steps?: ToolTraceStep[] }) {
    if (!steps || steps.length === 0) return null;
    return (
        <div data-testid="tool-trace" className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {steps.map((step, i) => {
                const Icon = ICONS[step.kind] ?? Wrench;
                return (
                    <span
                        key={i}
                        className={`inline-flex items-center gap-1.5 text-[11px] ${step.ok ? 'text-white/45' : 'text-amber-200/80'}`}
                        title={step.ok ? undefined : 'Aktion nicht abgeschlossen'}
                    >
                        <Icon size={11} className={step.ok ? TONES.success.text : TONES.warning.text} />
                        <span>{step.label}{step.detail ? `: ${step.detail}` : ''}</span>
                    </span>
                );
            })}
        </div>
    );
}
