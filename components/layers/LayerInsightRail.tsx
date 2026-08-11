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
    alwaysExpanded?: boolean;
    showToggle?: boolean;
    collapsedHint?: string;
    compact?: boolean;
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
    alwaysExpanded = false,
    showToggle = true,
    collapsedHint = 'Mehr bei Fokus.',
    compact = false,
    onPointerEnter,
    onPointerLeave,
    children,
}) => {
    const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
    const isExpanded = alwaysExpanded || forceExpanded || isManuallyExpanded;
    const compactMetrics = metrics.slice(0, 2);

    return (
        <motion.div
            className={`pointer-events-auto absolute overflow-hidden border border-white/10 bg-black/30 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] ${compact ? 'w-[248px] rounded-[18px]' : 'w-[280px] rounded-[22px]'} ${className}`}
            initial={{ opacity: 0, x: -10, y: 4 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <div
                className={`pointer-events-none absolute inset-x-0 top-0 ${compact ? 'h-16' : 'h-20'}`}
                style={{
                    background: `radial-gradient(circle at top left, ${accent}22 0%, transparent 75%)`,
                }}
            />

            <div className={compact ? 'relative p-3.5' : 'relative p-4'}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
                            />
                            <div className="text-[9.5px] font-medium uppercase tracking-[0.2em] text-white/45">
                                {eyebrow}
                            </div>
                        </div>
                        <div className={`mt-1 truncate font-light tracking-[0.02em] text-white/90 ${compact ? 'text-[18px]' : 'text-[20px]'}`}>
                            {title}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {badge && (
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-white/55">
                                {badge}
                            </div>
                        )}
                        {showToggle ? (
                            <button
                                type="button"
                                aria-label={isExpanded ? 'Insight schließen' : 'Insight öffnen'}
                                onClick={() => setIsManuallyExpanded((current) => !current)}
                                className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${isExpanded ? 'border-white/14 bg-white/[0.08] text-white/80' : 'border-white/10 bg-white/[0.04] text-white/40 hover:border-white/18 hover:text-white/80'}`}
                            >
                                <ChevronRight
                                    size={13}
                                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                                />
                            </button>
                        ) : null}
                    </div>
                </div>

                {!isExpanded && (
                    <>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {compactMetrics.map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/45"
                                >
                                    <span>{metric.label}</span>
                                    <span className={`ml-1.5 text-[10px] normal-case tracking-normal ${metric.toneClassName || 'text-white/80'}`}>
                                        {metric.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-2 text-[10px] leading-relaxed text-white/40">
                            {collapsedHint}
                        </div>
                    </>
                )}

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.32, ease: 'easeOut' }}
                        >
                            <div className="mt-3.5 grid grid-cols-3 gap-1.5">
                                {metrics.map((metric) => (
                                    <div
                                        key={metric.label}
                                        className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2"
                                    >
                                        <div className="text-[8.5px] font-medium uppercase tracking-[0.16em] text-white/35">
                                            {metric.label}
                                        </div>
                                        <div className={`mt-0.5 text-sm font-medium leading-none ${metric.toneClassName || 'text-white/82'}`}>
                                            {metric.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-3 text-[10.5px] leading-relaxed text-white/45">
                                {summary}
                            </p>

                            {children ? (
                                <div className="mt-3 border-t border-white/8 pt-3">
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
