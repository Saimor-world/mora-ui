'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Activity, ArrowRight, X, type LucideIcon } from 'lucide-react';
import { isFirstRunTourDone, markFirstRunTourDone } from '@/lib/onboarding/firstRunStore';
import { useNavStore } from '@/lib/store/navStore';
import { loadWebsiteEntryContext } from '@/lib/websiteEntryStorage';

interface TourStep {
    id: string;
    icon: LucideIcon;
    title: string;
    body: string;
    target: { selector: string; offsetX?: number; offsetY?: number };
    accent: string;
}

const HOME_STEPS: TourStep[] = [
    {
        id: 'home-cockpit',
        icon: Activity,
        title: 'Dein Home',
        body: 'Widgets, Signale und MÔRA-Status — alles auf einen Blick, ohne Scroll-Chaos.',
        target: { selector: '[data-testid="home-cockpit"]', offsetY: 8 },
        accent: 'rgba(52,211,153,0.70)',
    },
    {
        id: 'mora',
        icon: Sparkles,
        title: 'Mora hört zu',
        body: 'Der Smaragd-Orb unten rechts ist Mora. Klick drauf oder frag sie etwas.',
        target: { selector: '[data-mora-orb]', offsetY: -16 },
        accent: 'rgba(167,139,250,0.70)',
    },
    {
        id: 'universe',
        icon: Compass,
        title: 'Dein Universe',
        body: 'Wechsle in Explore, um Bereiche und Verbindungen als Topographie zu sehen.',
        target: { selector: '[data-testid="universe-toggle"]', offsetY: -8 },
        accent: 'rgba(103,232,249,0.70)',
    },
];

const APPEAR_DELAY_MS = 12000;
const SESSION_SEEN_KEY = 'saimor_first_run_tour_session';

function hasSeenTourThisSession(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return window.sessionStorage.getItem(SESSION_SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

function markTourSeenThisSession(): void {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(SESSION_SEEN_KEY, '1');
    } catch {
        // ignore storage failures
    }
}

export const FirstRunTour: React.FC = () => {
    const activeMode = useNavStore((s) => s.activeMode);
    const coreMode = useNavStore((s) => s.coreMode);
    const [active, setActive] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const steps = useMemo(() => HOME_STEPS, []);

    useEffect(() => {
        if (isFirstRunTourDone()) return;
        if (hasSeenTourThisSession()) return;
        if (coreMode !== 'home') return;
        const t = setTimeout(() => {
            if (isFirstRunTourDone() || hasSeenTourThisSession()) return;
            setActive(true);
            markTourSeenThisSession();
        }, APPEAR_DELAY_MS);
        return () => clearTimeout(t);
    }, [coreMode]);

    useEffect(() => {
        if (!active) return;
        const step = steps[stepIdx];
        const el = document.querySelector(step.target.selector);
        if (el) setTargetRect(el.getBoundingClientRect());
        else setTargetRect(null);
    }, [active, stepIdx, steps]);

    const handleNext = () => {
        if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1);
        else handleDismiss();
    };

    const handleDismiss = () => {
        markFirstRunTourDone();
        setActive(false);
    };

    if (isFirstRunTourDone()) return null;
    if (activeMode === 'public_playground') return null;
    if (typeof window !== 'undefined' && loadWebsiteEntryContext()) return null;
    if (coreMode !== 'home') return null;
    if (!active) return null;

    const step = steps[stepIdx];
    const Icon = step.icon;

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.28 }}
                className="pointer-events-none fixed bottom-24 right-5 z-[7500] sm:right-8"
            >
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pointer-events-none fixed rounded-2xl"
                        style={{
                            left: targetRect.left - 6,
                            top: targetRect.top - 6,
                            width: targetRect.width + 12,
                            height: targetRect.height + 12,
                            border: `1px solid ${step.accent.replace('0.70', '0.28')}`,
                        }}
                    />
                )}

                <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.24, delay: 0.06 }}
                    className="pointer-events-auto w-[min(340px,calc(100vw-2.5rem))]"
                >
                    <div
                        className="relative overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                        style={{
                            background: 'linear-gradient(150deg, rgba(10,14,24,0.96), rgba(6,9,18,0.94))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(32px)',
                        }}
                    >
                        <div
                            className="absolute left-0 top-0 h-[1px] w-full"
                            style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
                        />

                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                                    style={{
                                        background: step.accent.replace('0.70', '0.10'),
                                        border: `1px solid ${step.accent.replace('0.70', '0.22')}`,
                                    }}
                                >
                                    <Icon size={14} style={{ color: step.accent.replace('0.70', '0.90') }} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[13px] font-medium text-white/90 leading-tight">{step.title}</h3>
                                    <p className="mt-1 text-[12px] leading-snug text-white/52">{step.body}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    aria-label="Überspringen"
                                    className="shrink-0 rounded-lg p-1 text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/50"
                                >
                                    <X size={11} />
                                </button>
                            </div>

                            <div className="mt-3.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    {steps.map((s, i) => (
                                        <div
                                            key={s.id}
                                            className="rounded-full transition-all"
                                            style={{
                                                width: i === stepIdx ? 16 : 4,
                                                height: 4,
                                                background: i === stepIdx
                                                    ? step.accent.replace('0.70', '0.75')
                                                    : i < stepIdx
                                                        ? step.accent.replace('0.70', '0.35')
                                                        : 'rgba(255,255,255,0.12)',
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDismiss}
                                        className="text-[10px] uppercase tracking-[0.16em] text-white/28 transition-colors hover:text-white/52"
                                    >
                                        Überspringen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
                                        style={{
                                            background: step.accent.replace('0.70', '0.12'),
                                            border: `1px solid ${step.accent.replace('0.70', '0.30')}`,
                                            color: step.accent.replace('0.70', '0.92'),
                                        }}
                                    >
                                        {stepIdx === steps.length - 1 ? 'Fertig' : 'Weiter'}
                                        <ArrowRight size={11} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FirstRunTour;
