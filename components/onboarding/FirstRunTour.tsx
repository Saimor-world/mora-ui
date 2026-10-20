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
        voice: 'Signale, Widgets und der Pulse deiner Organisation.',
        target: { selector: '[data-testid="home-cockpit"]', offsetY: 8 },
        accent: 'rgba(214,168,72,0.70)',
    },
    {
        id: 'universe',
        icon: Compass,
        title: 'Universe',
        voice: 'Bereiche und Verbindungen als Raum.',
        target: { selector: '[data-testid="universe-toggle"]', offsetY: -8 },
        accent: 'rgba(214,168,72,0.70)',
    },
    {
        id: 'dock',
        icon: Sparkles,
        title: 'Dock',
        voice: 'Apps, Navigation und MÔRA. Klick den Stein, wenn du etwas brauchst.',
        target: { selector: '[data-testid="mora-dock"]', offsetY: -12 },
        accent: 'rgba(214,168,72,0.70)',
    },
];

const DEMO_APPEAR_DELAY_MS = 2200;
const DEFAULT_APPEAR_DELAY_MS = 3800;
const SESSION_SEEN_KEY = 'saimor_product_tour_session';
const CARD_WIDTH = 280;
const CARD_ESTIMATED_HEIGHT = 140;
const CARD_MARGIN = 16;
const DOCK_RESERVED_HEIGHT = 130;

interface TourPlacement {
    left: number;
    top: number;
}

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

function shouldAutoShowTour(activeMode: string): boolean {
    // Preview Home owns its own in-flow hint — never overlay that surface.
    if (activeMode === 'visitor' || activeMode === 'private_preview') return false;
    return isDemoEntryPath(activeMode);
}

function clamp(n: number, min: number, max: number): number {
    if (max < min) return min;
    return Math.min(max, Math.max(min, n));
}

function computeTourPlacement(
    _stepId: string,
    _targetRect: DOMRect | null,
    viewport: { width: number; height: number },
): TourPlacement {
    const isMobile = viewport.width < 640;
    const left = isMobile
        ? Math.max(CARD_MARGIN, (viewport.width - CARD_WIDTH) / 2)
        : clamp(viewport.width - CARD_WIDTH - CARD_MARGIN, CARD_MARGIN, viewport.width - CARD_WIDTH - CARD_MARGIN);
    const top = viewport.height - DOCK_RESERVED_HEIGHT - CARD_ESTIMATED_HEIGHT - 8;

    return { left, top: Math.max(CARD_MARGIN, top) };
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
    const [viewport, setViewport] = useState({ width: 0, height: 0 });

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
            if (coreMode === 'home' && activeMode !== 'visitor' && activeMode !== 'private_preview') {
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
    }, [activeMode, coreMode, userSettings]);

    useEffect(() => {
        if (dismissed) return;
        if (hasSeenTourThisSession()) return;
        if (coreMode !== 'home') return;
        if (!shouldAutoShowTour(activeMode)) return;

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
        const updateTarget = () => {
            const step = steps[stepIdx];
            const el = document.querySelector(step.target.selector);
            setViewport({ width: window.innerWidth, height: window.innerHeight });
            if (el) setTargetRect(el.getBoundingClientRect());
            else setTargetRect(null);
        };

        updateTarget();
        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);
        return () => {
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
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
    if (activeMode === 'visitor' || activeMode === 'private_preview') return null;
    if (!active) return null;

    const step = steps[stepIdx];
    const Icon = step.icon;
    const isLastStep = stepIdx === steps.length - 1;
    const placement = computeTourPlacement(step.id, targetRect, viewport);

    const GOLD = '#D6A848';
    const CREAM = 'rgba(247,244,233,';

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none fixed z-[8000]"
                style={{ left: placement.left, top: placement.top }}
                data-testid="product-tour-card"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.24, delay: 0.04 }}
                    className="pointer-events-auto"
                    style={{ width: CARD_WIDTH, maxWidth: 'calc(100vw - 2rem)' }}
                >
                    <div
                        className="relative overflow-hidden rounded-xl"
                        style={{
                            background: 'rgba(7,11,12,0.88)',
                            border: `0.5px solid rgba(214,168,72,0.28)`,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="p-3">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                    style={{
                                        background: `rgba(214,168,72,0.12)`,
                                        border: `0.5px solid rgba(214,168,72,0.28)`,
                                    }}
                                >
                                    <Icon size={13} style={{ color: GOLD }} strokeWidth={1.6} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            letterSpacing: '0.06em',
                                            color: GOLD,
                                        }}
                                    >
                                        MÔRA · {step.title}
                                    </p>
                                    <p
                                        className="mt-0.5"
                                        style={{
                                            fontSize: 12,
                                            lineHeight: 1.4,
                                            color: `${CREAM}0.72)`,
                                        }}
                                    >
                                        {step.voice}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCloseSession}
                                    aria-label="Schließen"
                                    className="shrink-0 rounded p-1 transition-colors"
                                    style={{ color: `${CREAM}0.35)` }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                    {steps.map((s, i) => (
                                        <div
                                            key={s.id}
                                            className="rounded-full transition-all"
                                            style={{
                                                width: i === stepIdx ? 12 : 4,
                                                height: 4,
                                                background: i === stepIdx
                                                    ? GOLD
                                                    : i < stepIdx
                                                        ? `rgba(214,168,72,0.4)`
                                                        : `${CREAM}0.12)`,
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <label
                                        className="flex cursor-pointer items-center gap-1.5"
                                        style={{ fontSize: 10, color: `${CREAM}0.45)` }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={dontShowAgain}
                                            onChange={(e) => setDontShowAgain(e.target.checked)}
                                            className="h-3 w-3 rounded border-white/20 bg-white/5"
                                            style={{ accentColor: GOLD }}
                                        />
                                        Nicht mehr
                                    </label>

                                    {!isLastStep ? (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
                                            style={{
                                                background: `rgba(214,168,72,0.15)`,
                                                border: `0.5px solid rgba(214,168,72,0.35)`,
                                                color: GOLD,
                                            }}
                                        >
                                            Weiter
                                            <ArrowRight size={10} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleDismissPermanent}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
                                            style={{
                                                background: `rgba(214,168,72,0.15)`,
                                                border: `0.5px solid rgba(214,168,72,0.35)`,
                                                color: GOLD,
                                            }}
                                        >
                                            Verstanden
                                        </button>
                                    )}
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
