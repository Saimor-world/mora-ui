'use client';
import React, { useEffect, useState } from 'react';
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

const STEPS: TourStep[] = [
    {
        id: 'universe',
        icon: Compass,
        title: 'Dein Universe',
        body: 'Alle Bereiche und ihre Verbindungen — als Karte deiner Arbeit.',
        target: { selector: '[data-testid="universe-toggle"]', offsetY: -8 },
        accent: 'rgba(103,232,249,0.70)',
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
        id: 'tageslage',
        icon: Activity,
        title: 'Lagebild',
        body: 'Nur echte Signale — kein Lärm, kein Padding.',
        target: { selector: '[data-testid="openflow-lagebild"]', offsetX: -16 },
        accent: 'rgba(251,191,36,0.70)',
    },
];

const APPEAR_DELAY_MS = 9000;

export const FirstRunTour: React.FC = () => {
    const activeMode = useNavStore((s) => s.activeMode);
    const [active, setActive] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (isFirstRunTourDone()) return;
        const t = setTimeout(() => setActive(true), APPEAR_DELAY_MS);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!active) return;
        const step = STEPS[stepIdx];
        const el = document.querySelector(step.target.selector);
        if (el) setTargetRect(el.getBoundingClientRect());
        else setTargetRect(null);
    }, [active, stepIdx]);

    const handleNext = () => {
        if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
        else handleDismiss();
    };

    const handleDismiss = () => {
        markFirstRunTourDone();
        setActive(false);
    };

    // Suppress in playground mode AND in any website-entry preview session.
    // The tour is meant to onboard users to THEIR OWN workspace, not a demo.
    if (activeMode === 'public_playground') return null;
    if (typeof window !== 'undefined' && loadWebsiteEntryContext()) return null;
    if (!active) return null;
    const step = STEPS[stepIdx];
    const Icon = step.icon;

    // Card position: prefer right side of target, fallback to center-bottom
    const cardLeft = targetRect
        ? Math.min(targetRect.right + 20, window.innerWidth - 360)
        : window.innerWidth - 360 - 24;
    const cardTop = targetRect
        ? Math.max(16, targetRect.top + (step.target.offsetY ?? 0))
        : window.innerHeight / 2 - 80;

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="fixed inset-0 z-[7500] pointer-events-none"
            >
                {/* Subtle target indicator — thin ring only, no glow */}
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute pointer-events-none rounded-2xl"
                        style={{
                            left: targetRect.left - 6,
                            top: targetRect.top - 6,
                            width: targetRect.width + 12,
                            height: targetRect.height + 12,
                            border: `1px solid ${step.accent.replace('0.70', '0.38')}`,
                        }}
                    />
                )}

                {/* Tooltip card */}
                <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.24, delay: 0.08 }}
                    className="absolute pointer-events-auto"
                    style={{
                        left: cardLeft,
                        top: cardTop,
                        width: 320,
                    }}
                >
                    {/* Connector line from ring to card */}
                    {targetRect && (
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                right: '100%',
                                top: 20,
                                width: 20,
                                height: 1,
                                background: `linear-gradient(90deg, transparent, ${step.accent.replace('0.70', '0.28')})`,
                            }}
                        />
                    )}

                    <div
                        className="relative overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                        style={{
                            background: 'linear-gradient(150deg, rgba(10,14,24,0.96), rgba(6,9,18,0.94))',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(32px)',
                        }}
                    >
                        {/* Accent top line */}
                        <div
                            className="absolute left-0 top-0 h-[1px] w-full"
                            style={{ background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)` }}
                        />

                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                {/* Icon */}
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
                                {/* Step dots */}
                                <div className="flex items-center gap-1.5">
                                    {STEPS.map((s, i) => (
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
                                        {stepIdx === STEPS.length - 1 ? 'Fertig' : 'Weiter'}
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
