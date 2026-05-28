'use client';
import React from 'react';
import { Globe, FileText, Mic, ArrowRight } from 'lucide-react';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

const STEPS = [
    {
        icon: <Globe size={14} />,
        label: 'OS erkunden',
        detail: 'Deine Organisation als lebendige Topographie',
    },
    {
        icon: <FileText size={14} />,
        label: 'Dokumente & Ordner',
        detail: 'Inhalte direkt im Workspace bearbeiten',
    },
    {
        icon: <Mic size={14} />,
        label: 'Mit Môra sprechen',
        detail: 'KI-Steuerung per Sprache oder Text',
    },
];

interface Props {
    context: WebsiteEntryContext;
    onOpen: () => void;
}

export const DemoWelcomeCard: React.FC<Props> = ({ context, onOpen }) => (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-black/60 p-8 backdrop-blur-2xl shadow-[0_40px_160px_rgba(0,0,0,0.6)] max-w-md w-full">
        <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-violet-300/70 via-cyan-200/55 to-amber-200/50" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
            <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/55 mb-1">
                    Demo-Workspace
                </div>
                <h1 className="text-[22px] font-light text-white/90 leading-tight">
                    {context.companyName}
                </h1>
                {context.domain && (
                    <div className="text-[12px] text-white/38 mt-0.5">{context.domain}</div>
                )}
            </div>
            {context.score !== undefined && (
                <div className="shrink-0 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-[15px] font-medium text-amber-200/90">
                    {context.score}
                </div>
            )}
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-2 mb-7">
            {STEPS.map((step, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-4 py-3"
                >
                    <div className="shrink-0 rounded-lg bg-violet-500/15 p-2 text-violet-300">
                        {step.icon}
                    </div>
                    <div>
                        <div className="text-[12px] font-medium text-white/78">{step.label}</div>
                        <div className="text-[11px] text-white/38">{step.detail}</div>
                    </div>
                    <div className="ml-auto text-white/20 text-[10px]">{i + 1}</div>
                </div>
            ))}
        </div>

        {/* CTA */}
        <button
            type="button"
            onClick={onOpen}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-violet-600/80 hover:bg-violet-500/90 border border-violet-400/30 px-6 py-3.5 text-[13px] font-medium text-white transition-all"
        >
            Workspace öffnen
            <ArrowRight size={14} />
        </button>
    </div>
);
