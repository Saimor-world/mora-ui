'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, LayoutGrid, ArrowRight, X, type LucideIcon } from 'lucide-react';
import {
    isProductTourDismissed,
    markProductTourDismissed,
    migrateProductTourDismissToServer,
    PRODUCT_TOUR_RESTART_EVENT,
    PRODUCT_TOUR_STATE_EVENT,
} from '@/lib/onboarding/productTourStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
    isWebsiteEntryPreviewSession,
    loadWebsiteEntryContext,
} from '@/lib/websiteEntryStorage';
import { queueAccountSettingsSync } from '@/lib/userSettings/persistAccountSettings';

interface TourStep {
    id: string;
    icon: LucideIcon;
    title: string;
    voice: string;
    target: { selector: string; offsetY?: number };
    accent: string;
}

const HOME_STEPS: TourStep[] = [
    {
        id: 'home-cockpit',
        icon: LayoutGrid,
        title: 'Dein Home',
        voice: 'Hier ist dein Home — Signale, Widgets und der Pulse deiner Organisation, ohne Scroll-Chaos.',
        target: { selector: '[data-testid="home-cockpit"]', offsetY: 8 },
        accent: 'rgba(52,211,153,0.70)',
    },
    {
        id: 'universe',
        icon: Compass,
        title: 'Dein Universe',
        voice: 'Wechsle ins Universe, wenn du Bereiche und Verbindungen als Topographie sehen willst.',
        target: { selector: '[data-testid="universe-toggle"]', offsetY: -8 },
        accent: 'rgba(103,232,249,0.70)',
    },
    {
        id: 'dock',
        icon: Sparkles,
        title: 'Dein Dock',
        voice: 'Unten liegt dein Dock — Apps, Navigation und mein Orb. Klick mich an, wenn du etwas brauchst.',
        target: { selector: '[data-testid="mora-dock"]', offsetY: -12 },
        accent: 'rgba(167,139,250,0.70)',
    },
];

const DEMO_APPEAR_DELAY_MS = 2200;
const DEFAULT_APPEAR_DELAY_MS = 3800;
const SESSION_SEEN_KEY = 'saimor_product_tour_session';

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

function isDemoEntryPath(activeMode: string): boolean {
    if (loadWebsiteEntryContext()) return true;
    if (isWebsiteEntryPreviewSession()) return true;
    return activeMode === 'visitor' || activeMode === 'personal_demo' || activeMode === 'private_preview';
}

function resolveAppearDelay(activeMode: string): number {
    return isDemoEntryPath(activeMode) ? DEMO_APPEAR_DELAY_MS : DEFAULT_APPEAR_DELAY_MS;
}

export const FirstRunTour: React.FC = () => {
    const activeMode = useNavStore((s) => s.activeMode);
    const coreMode = useNavStore((s) => s.coreMode);
    const user = useSessionStore((s) => s.user);
    const userSettings = useMemo(
        () => (user?.settings ?? {}) as Record<string, unknown>,
        [user?.settings],
    );

    const [dismissed, setDismissed] = useState(() => isProductTourDismissed(userSettings));
    const [active, setActive] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const steps = useMemo(() => HOME_STEPS, []);
    const syncUserSettings = useCallback(
        (updates: Record<string, unknown>) => queueAccountSettingsSync(updates),
        [],
    );

    const persistDismiss = useCallback(() => {
        markProductTourDismissed({ syncUserSettings });
        setDismissed(true);
        setActive(false);
    }, [syncUserSettings]);

    useEffect(() => {
        migrateProductTourDismissToServer(userSettings, syncUserSettings);
    }, [userSettings, syncUserSettings]);

    useEffect(() => {
        setDismissed(isProductTourDismissed(userSettings));
    }, [userSettings]);

    useEffect(() => {
        const onStateChange = () => setDismissed(isProductTourDismissed(userSettings));
        const onRestart = () => {
            setDismissed(false);
            setStepIdx(0);
            setDontShowAgain(false);
            if (coreMode === 'home') {
                setActive(true);
                markTourSeenThisSession();
            }
        };

        window.addEventListener(PRODUCT_TOUR_STATE_EVENT, onStateChange);
        window.addEventListener(PRODUCT_TOUR_RESTART_EVENT, onRestart);
        return () => {
            window.removeEventListener(PRODUCT_TOUR_STATE_EVENT, onStateChange);
            window.removeEventListener(PRODUCT_TOUR_RESTART_EVENT, onRestart);
        };
    }, [coreMode, userSettings]);

    useEffect(() => {
        if (dismissed) return;
        if (hasSeenTourThisSession()) return;
        if (coreMode !== 'home') return;

        const delay = resolveAppearDelay(activeMode);
        const t = window.setTimeout(() => {
            if (isProductTourDismissed(userSettings) || hasSeenTourThisSession()) return;
            setActive(true);
            markTourSeenThisSession();
        }, delay);

        return () => window.clearTimeout(t);
    }, [activeMode, coreMode, dismissed, userSettings]);

    useEffect(() => {
        if (!active) return;
        const step = steps[stepIdx];
        const el = document.querySelector(step.target.selector);
        if (el) setTargetRect(el.getBoundingClientRect());
        else setTargetRect(null);
    }, [active, stepIdx, steps]);

    const handleNext = () => {
        if (stepIdx < steps.length - 1) {
            setStepIdx(stepIdx + 1);
        }
    };

    const handleDismissPermanent = () => {
        persistDismiss();
    };

    const handleCloseSession = () => {
        setActive(false);
    };

    if (dismissed) return null;
    if (coreMode !== 'home') return null;
    if (!active) return null;

    const step = steps[stepIdx];
    const Icon = step.icon;
    const isLastStep = stepIdx === steps.length - 1;

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none fixed z-[8000]"
                style={{ right: '168px', bottom: '108px' }}
                data-testid="product-tour-card"
            >
                {targetRect && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pointer-events-none fixed rounded-2xl"
                        style={{
                            left: targetRect.left - 4,
                            top: targetRect.top - 4,
                            width: targetRect.width + 8,
                            height: targetRect.height + 8,
                            border: `1px solid ${step.accent.replace('0.70', '0.22')}`,
                            boxShadow: `0 0 24px ${step.accent.replace('0.70', '0.08')}`,
                        }}
                    />
                )}

                <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.26, delay: 0.04 }}
                    className="pointer-events-auto w-[min(320px,calc(100vw-2.5rem))]"
                >
                    <div
                        className="relative overflow-hidden rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.48)] backdrop-blur-[24px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(8,20,16,0.92), rgba(4,12,11,0.86))',
                            border: '1px solid rgba(124,58,237,0.28)',
                        }}
                    >
                        <span
                            className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                            style={{
                                background: step.accent.replace('0.70', '0.85'),
                                boxShadow: `0 0 8px ${step.accent.replace('0.70', '0.45')}`,
                            }}
                        />

                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                    style={{
                                        background: 'rgba(124,58,237,0.14)',
                                        border: '1px solid rgba(124,58,237,0.32)',
                                    }}
                                >
                                    <Icon size={14} className="text-emerald-300" strokeWidth={1.8} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/72">
                                        MÔRA
                                    </div>
                                    <h3 className="mt-0.5 text-[13px] font-medium leading-tight text-white/90">
                                        {step.title}
                                    </h3>
                                    <p className="mt-1.5 text-[12px] leading-snug text-white/58">
                                        {step.voice}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCloseSession}
                                    aria-label="Schließen"
                                    className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-white/28 transition-colors hover:bg-white/[0.05] hover:text-white/55"
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            <div className="mt-3 flex items-center gap-1.5">
                                {steps.map((s, i) => (
                                    <div
                                        key={s.id}
                                        className="rounded-full transition-all"
                                        style={{
                                            width: i === stepIdx ? 14 : 4,
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

                            <div className="mt-3.5 flex flex-col gap-2.5">
                                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/42">
                                    <input
                                        type="checkbox"
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-emerald-400"
                                    />
                                    Nicht mehr anzeigen
                                </label>

                                <div className="flex items-center justify-end gap-2">
                                    {dontShowAgain && (
                                        <button
                                            type="button"
                                            onClick={handleDismissPermanent}
                                            className="text-[10px] uppercase tracking-[0.14em] text-white/30 transition-colors hover:text-white/55"
                                        >
                                            Ausblenden
                                        </button>
                                    )}
                                    {!isLastStep ? (
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
                                            Weiter
                                            <ArrowRight size={11} />
                                        </button>
                                    ) : !dontShowAgain ? (
                                        <button
                                            type="button"
                                            onClick={handleDismissPermanent}
                                            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
                                            style={{
                                                background: step.accent.replace('0.70', '0.12'),
                                                border: `1px solid ${step.accent.replace('0.70', '0.30')}`,
                                                color: step.accent.replace('0.70', '0.92'),
                                            }}
                                        >
                                            Verstanden
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div
                            className="absolute"
                            style={{
                                right: 24,
                                bottom: -7,
                                width: 14,
                                height: 14,
                                background: 'linear-gradient(135deg, rgba(8,20,16,0.92), rgba(4,12,11,0.86))',
                                borderRight: '1px solid rgba(124,58,237,0.28)',
                                borderBottom: '1px solid rgba(124,58,237,0.28)',
                                transform: 'rotate(45deg)',
                            }}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FirstRunTour;
