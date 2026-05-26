'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Briefing {
    id: string;
    label: string;     // e.g. "Aktivität", "Mail", "Termin"
    title: string;     // e.g. "Weiter in Team"
    detail: string;    // e.g. "vor 12 Min."
    accentColor?: string; // optional override (default: emerald)
}

interface BriefingStackProps {
    briefings: Briefing[];
    autoCycleMs?: number; // default 6000, 0 = disabled
}

export const BriefingStack: React.FC<BriefingStackProps> = ({ briefings, autoCycleMs = 6000 }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const safeIdx = Math.min(activeIdx, briefings.length - 1);
    const active = briefings[safeIdx];

    useEffect(() => {
        if (briefings.length <= 1 || autoCycleMs === 0) return;
        const t = setInterval(() => {
            setActiveIdx((i) => (i + 1) % briefings.length);
        }, autoCycleMs);
        return () => clearInterval(t);
    }, [briefings.length, autoCycleMs]);

    if (!active) return null;
    const accent = active.accentColor ?? 'rgba(52,211,153,0.92)';

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">{active.label}</div>
                    <h2 className="mt-2 max-w-[28rem] text-[32px] font-light leading-[1.05] tracking-[-0.04em] text-white/92">
                        {active.title}
                    </h2>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                        <span className="text-[13px] text-white/58">{active.detail}</span>
                    </div>
                </motion.div>
            </AnimatePresence>

            {briefings.length > 1 && (
                <div className="mt-5 flex items-center gap-1.5">
                    {briefings.map((b, idx) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => setActiveIdx(idx)}
                            aria-label={`Briefing ${idx + 1}`}
                            className="h-1 rounded-full transition-all"
                            style={{
                                width: idx === safeIdx ? 28 : 12,
                                background: idx === safeIdx ? accent : 'rgba(255,255,255,0.18)',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
