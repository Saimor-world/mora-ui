'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMoraStore } from '@/lib/store/moraState';

type TimeBand = 'morning' | 'day' | 'evening' | 'night';

const getTimeBand = (date: Date): TimeBand => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'day';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
};

const BAND_BACKGROUNDS: Record<TimeBand, string> = {
    morning: 'radial-gradient(circle at 18% 20%, rgba(251,191,36,0.18), transparent 34%), radial-gradient(circle at 82% 18%, rgba(34,211,238,0.16), transparent 32%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.12), transparent 42%)',
    day: 'radial-gradient(circle at 22% 18%, rgba(34,211,238,0.14), transparent 34%), radial-gradient(circle at 76% 24%, rgba(59,130,246,0.12), transparent 30%), radial-gradient(circle at 52% 84%, rgba(251,191,36,0.10), transparent 46%)',
    evening: 'radial-gradient(circle at 18% 26%, rgba(251,146,60,0.18), transparent 36%), radial-gradient(circle at 80% 18%, rgba(244,114,182,0.12), transparent 30%), radial-gradient(circle at 52% 82%, rgba(168,85,247,0.12), transparent 44%)',
    night: 'radial-gradient(circle at 16% 18%, rgba(16,185,129,0.12), transparent 32%), radial-gradient(circle at 82% 16%, rgba(139,92,246,0.16), transparent 34%), radial-gradient(circle at 56% 86%, rgba(34,211,238,0.09), transparent 44%)',
};

const ORB_ACCENTS: Record<string, string> = {
    thinking: 'rgba(59,130,246,0.18)',
    alert: 'rgba(248,113,113,0.16)',
    insight: 'rgba(251,191,36,0.18)',
    focus: 'rgba(16,185,129,0.18)',
    demo: 'rgba(20,184,166,0.18)',
    idle: 'rgba(255,255,255,0.06)',
};

export const TemporalAtmosphere: React.FC = () => {
    const orbState = useMoraStore((state) => state.orbState);
    const viewLevel = useMoraStore((state) => state.viewLevel);
    const isStandardMode = useMoraStore((state) => state.isStandardMode);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const timeBand = useMemo(() => getTimeBand(now), [now]);
    const baseOpacity = viewLevel === 'core' ? 1 : 0.58;
    const orbAccent = ORB_ACCENTS[orbState] || ORB_ACCENTS.idle;

    if (isStandardMode) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-[-8] overflow-hidden">
            <motion.div
                className="absolute inset-0"
                style={{
                    background: BAND_BACKGROUNDS[timeBand],
                    mixBlendMode: 'screen',
                }}
                animate={{
                    opacity: [0.45 * baseOpacity, 0.72 * baseOpacity, 0.5 * baseOpacity],
                    scale: [1, 1.06, 1],
                    x: ['-2%', '2%', '-1%'],
                    y: ['0%', '-1%', '0%'],
                }}
                transition={{
                    duration: 24,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    times: [0, 0.55, 1],
                }}
            />

            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${orbAccent} 0%, transparent 44%)`,
                    filter: 'blur(24px)',
                    mixBlendMode: 'screen',
                }}
                animate={{
                    opacity: [0.18 * baseOpacity, 0.42 * baseOpacity, 0.2 * baseOpacity],
                    scale: [0.92, 1.12, 0.96],
                }}
                transition={{
                    duration: orbState === 'alert' ? 6 : 14,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            <motion.div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 42px)',
                    maskImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8) 22%, rgba(255,255,255,0.5) 78%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8) 22%, rgba(255,255,255,0.5) 78%, transparent)',
                    opacity: viewLevel === 'core' ? 0.18 : 0.1,
                    mixBlendMode: 'overlay',
                }}
                animate={{
                    x: ['0%', '1.5%', '0%'],
                    opacity: [0.08, 0.16, 0.08],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
};
