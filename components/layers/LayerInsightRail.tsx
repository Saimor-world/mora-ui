'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface LayerInsightMetric {
    label: string;
    value: React.ReactNode;
    toneClassName?: string;
}

interface LayerInsightRailProps {
    className?: string;
    eyebrow: string;
    title: string;
    badge?: string;
    summary: string;
    accent?: string;
    metrics: LayerInsightMetric[];
    forceExpanded?: boolean;
    collapsedHint?: string;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
    children?: React.ReactNode;
}

export const LayerInsightRail: React.FC<LayerInsightRailProps> = ({
    className = '',
    eyebrow,
    title,
    badge,
    summary,
    accent = '#34d399',
    metrics,
    forceExpanded = false,
    collapsedHint = 'Mehr bei Fokus.',
    onPointerEnter,
    onPointerLeave,
    children,
}) => {
    const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
    const isExpanded = forceExpanded || isManuallyExpanded;
    const compactMetrics = metrics.slice(0, 2);

    return (
        <motion.div
            className={`pointer-events-auto absolute overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(5,12,11,0.84),rgba(0,0,0,0.52))] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl ${className}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0, width: isExpanded ? 328 : 214 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onMouseEnter={onPointerEnter}
            onMouseLeave={onPointerLeave}
        >
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24"
                style={{
                    background: `radial-gradient(circle at top left, ${accent}26 0%, transparent 72%)`,
                }}
            />

            <div className="relative p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: accent, boxShadow: `0 0 14px ${accent}` }}
                            />
                            <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                                {eyebrow}
                            </div>
                        </div>
                        <div className="mt-2 truncate text-base font-light tracking-[0.06em] text-white/88">
                            {title}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {badge && (
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/46">
                                {badge}
                            </div>
                        )}
                        <button
                            type="button"
                            aria-label={isExpanded ? 'Insight schliessen' : 'Insight oeffnen'}
                            onClick={() => setIsManuallyExpanded((current) => !current)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${isExpanded ? 'border-white/12 bg-white/[0.08] text-white/72' : 'border-white/8 bg-white/[0.04] text-white/38 hover:border-white/14 hover:text-white/68'}`}
                        >
                            <ChevronRight
                                size={14}
                                className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                            />
                        </button>
                    </div>
                </div>

                {!isExpanded && (
                    <>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {compactMetrics.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/44"
                                >
                                    <span>{metric.label}</span>
                                    <span className={`ml-2 text-[11px] normal-case tracking-normal ${metric.toneClassName || 'text-white/82'}`}>
                                        {metric.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 text-[11px] text-white/38">
                            {collapsedHint}
                        </div>
                    </>
                )}

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {metrics.map((metric) => (
                                    <div
                                        key={metric.label}
                                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                                    >
                                        <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                                            {metric.label}
                                        </div>
                                        <div className={`mt-1 text-base leading-none ${metric.toneClassName || 'text-white/84'}`}>
                                            {metric.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-4 text-[11px] leading-relaxed text-white/44">
                                {summary}
                            </p>

                            {children ? (
                                <div className="mt-4 border-t border-white/8 pt-4">
                                    {children}
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
