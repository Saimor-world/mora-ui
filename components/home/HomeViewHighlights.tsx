'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import type { HomeView } from '@/lib/queries/useHomeView';

const SEV_DOT_COLOR: Record<string, string> = {
    high: 'bg-red-300',
    medium: 'bg-amber-300',
    low: 'bg-emerald-300',
};

function sevDotColor(severity: number | null): string {
    if (severity === null || severity === undefined) return 'bg-white/50';
    if (severity >= 0.7) return SEV_DOT_COLOR.high;
    if (severity >= 0.4) return SEV_DOT_COLOR.medium;
    return SEV_DOT_COLOR.low;
}

interface Props {
    view: HomeView | undefined;
}

export function HomeViewHighlights({ view }: Props) {
    const attention = view?.attention ?? [];
    const nextSteps = view?.next_steps ?? [];

    if (attention.length === 0 && nextSteps.length === 0) return null;

    return (
        <div className="pointer-events-auto relative overflow-hidden glass-card p-5 z-10 flex flex-col gap-4">
            <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-amber-300/60 via-red-200/40 to-emerald-200/50" />

            {attention.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={13} className="text-amber-300/70" />
                        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-100/60">
                            Was braucht Aufmerksamkeit
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {attention.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-start gap-2.5 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2.5">
                                <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${sevDotColor(item.severity)} animate-pulse`} />
                                <span className="text-[13px] text-white/75 leading-snug">{item.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {nextSteps.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={13} className="text-emerald-300/70" />
                        <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/60">
                            Naechste Aufgaben
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {nextSteps.slice(0, 3).map((step) => (
                            <div key={step.id} className="flex items-start gap-2.5 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2.5">
                                <TrendingUp size={12} className="mt-0.5 shrink-0 text-emerald-300/60" />
                                <span className="text-[13px] text-white/75 leading-snug">{step.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
