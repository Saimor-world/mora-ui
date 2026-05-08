'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, Activity, ArrowRight, X } from 'lucide-react';
import { isFirstRunTourDone, markFirstRunTourDone } from '@/lib/onboarding/firstRunStore';

interface TourStep {
    id: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    body: string;
    target: { selector: string; offsetX?: number; offsetY?: number };
}

const STEPS: TourStep[] = [
    {
        id: 'universe',
        icon: Compass,
        title: 'Dein Universe',
        body: 'Hier siehst du alle Bereiche und ihre Verbindungen — wie eine Karte deiner Arbeit.',
        target: { selector: '[data-testid="universe-toggle"]', offsetY: -8 },
    },
    {
        id: 'mora',
        icon: Sparkles,
        title: 'Mora hört zu',
        body: 'Der Smaragd-Orb unten rechts ist Mora. Klick drauf oder frag sie was — sie kennt deinen Workspace.',
        target: { selector: '[data-mora-orb]', offsetY: -16 },
    },
    {
        id: 'tageslage',
        icon: Activity,
        title: 'Tageslage',
        body: 'Hier zeigt Mora dir was wirklich wichtig ist — ohne Lärm, nur echte Signale.',
        target: { selector: '[data-tageslage-panel]', offsetX: -16 },
    },
];

const APPEAR_DELAY_MS = 9000; // After greeting bubble dismissed

export const FirstRunTour: React.FC = () => {
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
        if (el) {
            setTargetRect(el.getBoundingClientRect());
        } else {
            setTargetRect(null);
        }
    }, [active, stepIdx]);

    const handleNext = () => {
        if (stepIdx < STEPS.length - 1) {
            setStepIdx(stepIdx + 1);
        } else {
            handleDismiss();
        }
    };

    const handleDismiss = () => {
        markFirstRunTourDone();
        setActive(false);
    };

    if (!active) return null;
    const step = STEPS[stepIdx];
    const Icon = step.icon;

    // Card position: prefer right side of target, fallback to center
    const cardLeft = targetRect
        ? Math.min(targetRect.right + 24, window.innerWidth - 360)
        : window.innerWidth / 2 - 160;
    const cardTop = targetRect
        ? Math.max(20, targetRect.top + (step.target.offsetY ?? 0))
        : window.innerHeight / 2 - 100;

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
                className="fixed inset-0 z-[7500] pointer-events-none"
            >
                {/* Spotlight ring around target */}
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: [1, 1.04, 1] }}
                        transition={{ scale: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
                        className="absolute pointer-events-none rounded-2xl"
                        style={{
                            left: targetRect.left - 8,
                            top: targetRect.top - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            border: '2px solid rgba(52,211,153,0.62)',
                            boxShadow: '0 0 32px rgba(52,211,153,0.42), inset 0 0 12px rgba(52,211,153,0.18)',
                        }}
                    />
                )}

                {/* Tooltip card */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.12 }}
                    className="absolute pointer-events-auto rounded-[20px] border p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-[24px]"
                    style={{
                        left: cardLeft,
                        top: cardTop,
                        width: 340,
                        background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.88))',
                        borderColor: 'rgba(52,211,153,0.30)',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.32)' }}
                        >
                            <Icon size={16} className="text-emerald-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/72">
                                Schritt {stepIdx + 1} von {STEPS.length}
                            </div>
                            <h3 className="mt-1 text-[15px] font-medium text-white/92">{step.title}</h3>
                            <p className="mt-1.5 text-[13px] leading-snug text-white/64">{step.body}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="Überspringen"
                            className="shrink-0 rounded-full p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                        >
                            <X size={12} />
                        </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="text-[11px] uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white/65"
                        >
                            Überspringen
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/14 border border-emerald-400/32 px-3 py-1.5 text-[12px] font-medium text-emerald-100 transition-colors hover:bg-emerald-500/22"
                        >
                            {stepIdx === STEPS.length - 1 ? 'Fertig' : 'Weiter'}
                            <ArrowRight size={12} />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FirstRunTour;
