'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Home, MessageCircle, Link2, ArrowRight, X, type LucideIcon } from 'lucide-react';
import {
    isWelcomeTourDismissed,
    markWelcomeTourDismissed,
    migrateWelcomeTourDismissToServer,
    WELCOME_TOUR_RESTART_EVENT,
    WELCOME_TOUR_STATE_EVENT,
} from '@/lib/onboarding/welcomeTourStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { queueAccountSettingsSync } from '@/lib/userSettings/persistAccountSettings';

interface TourStep {
    id: string;
    icon: LucideIcon;
    titleDe: string;
    titleEn: string;
    voiceDe: string;
    voiceEn: string;
    target: { selector: string; offsetY?: number };
    accent: string;
}

const WELCOME_STEPS: TourStep[] = [
    {
        id: 'welcome',
        icon: Sparkles,
        titleDe: 'Willkommen bei Môra',
        titleEn: 'Welcome to Môra',
        voiceDe: 'Hallo! Ich bin Môra, deine KI-Begleiterin. Lass mich dir kurz zeigen, wie wir zusammenarbeiten.',
        voiceEn: 'Hello! I am Môra, your AI companion. Let me quickly show you how we work together.',
        target: { selector: '[data-testid="mora-orb"]', offsetY: -16 },
        accent: 'rgba(124,58,237,0.70)',
    },
    {
        id: 'home',
        icon: Home,
        titleDe: 'Dein Tag',
        titleEn: 'Your Day',
        voiceDe: 'Hier siehst du deinen Tag auf einen Blick — Termine, Aufgaben und wichtige Signale.',
        voiceEn: 'Here you see your day at a glance — appointments, tasks, and important signals.',
        target: { selector: '[data-testid="home-cockpit"]', offsetY: 8 },
        accent: 'rgba(52,211,153,0.70)',
    },
    {
        id: 'chat',
        icon: MessageCircle,
        titleDe: 'Sprich mit mir',
        titleEn: 'Talk to me',
        voiceDe: 'Sprich mit mir, z. B. „Was steht heute an?" oder „Zeig mir meine Mails".',
        voiceEn: 'Talk to me, e.g. "What\'s on today?" or "Show me my emails".',
        target: { selector: '[data-testid="mora-dock"]', offsetY: -12 },
        accent: 'rgba(103,232,249,0.70)',
    },
];

const APPEAR_DELAY_MS = 2800;
const SESSION_SEEN_KEY = 'saimor_welcome_tour_session';
const CARD_WIDTH = 340;
const CARD_ESTIMATED_HEIGHT = 260;
const CARD_MARGIN = 18;
const DOCK_RESERVED_HEIGHT = 112;

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
        // ignore
    }
}

function clamp(n: number, min: number, max: number): number {
    if (max < min) return min;
    return Math.min(max, Math.max(min, n));
}

function computeTourPlacement(
    stepId: string,
    targetRect: DOMRect | null,
    viewport: { width: number; height: number },
): TourPlacement {
    const maxLeft = viewport.width - CARD_WIDTH - CARD_MARGIN;
    const maxTop = viewport.height - DOCK_RESERVED_HEIGHT - CARD_ESTIMATED_HEIGHT;
    const fallback = {
        left: clamp(viewport.width / 2 - CARD_WIDTH / 2, CARD_MARGIN, maxLeft),
        top: clamp(viewport.height / 2 - CARD_ESTIMATED_HEIGHT / 2, CARD_MARGIN, maxTop),
    };

    if (!targetRect || viewport.width <= 0 || viewport.height <= 0) return fallback;

    if (stepId === 'chat') {
        return {
            left: clamp(targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2, CARD_MARGIN, maxLeft),
            top: clamp(targetRect.top - CARD_ESTIMATED_HEIGHT - 16, CARD_MARGIN, maxTop),
        };
    }

    if (stepId === 'welcome') {
        return {
            left: clamp(targetRect.left + targetRect.width / 2 - CARD_WIDTH / 2, CARD_MARGIN, maxLeft),
            top: clamp(targetRect.top - CARD_ESTIMATED_HEIGHT - 24, CARD_MARGIN, maxTop),
        };
    }

    return {
        left: clamp(CARD_MARGIN + 32, CARD_MARGIN, maxLeft),
        top: clamp(targetRect.top + 48, CARD_MARGIN, maxTop),
    };
}

function getPreferredLanguage(): 'de' | 'en' {
    if (typeof navigator === 'undefined') return 'de';
    const lang = navigator.language || (navigator as any).userLanguage || 'de';
    return lang.toLowerCase().startsWith('en') ? 'en' : 'de';
}

export const WelcomeTour: React.FC = () => {
    const coreMode = useNavStore((s) => s.coreMode);
    const user = useSessionStore((s) => s.user);
    const openPane = usePaneStore((s) => s.openPane);
    const userSettings = useMemo(
        () => (user?.settings ?? {}) as Record<string, unknown>,
        [user?.settings],
    );
    const lang = useMemo(getPreferredLanguage, []);

    const [dismissed, setDismissed] = useState(() => isWelcomeTourDismissed(userSettings));
    const [active, setActive] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [showIntegrationOffer, setShowIntegrationOffer] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const steps = useMemo(() => WELCOME_STEPS, []);
    const syncUserSettings = useCallback(
        (updates: Record<string, unknown>) => queueAccountSettingsSync(updates),
        [],
    );

    const persistDismiss = useCallback(() => {
        markWelcomeTourDismissed({ syncUserSettings });
        setDismissed(true);
        setActive(false);
        setShowIntegrationOffer(false);
    }, [syncUserSettings]);

    useEffect(() => {
        migrateWelcomeTourDismissToServer(userSettings, syncUserSettings);
    }, [userSettings, syncUserSettings]);

    useEffect(() => {
        setDismissed(isWelcomeTourDismissed(userSettings));
    }, [userSettings]);

    useEffect(() => {
        const onStateChange = () => setDismissed(isWelcomeTourDismissed(userSettings));
        const onRestart = () => {
            setDismissed(false);
            setStepIdx(0);
            setShowIntegrationOffer(false);
            if (coreMode === 'home') {
                setActive(true);
                markTourSeenThisSession();
            }
        };

        window.addEventListener(WELCOME_TOUR_STATE_EVENT, onStateChange);
        window.addEventListener(WELCOME_TOUR_RESTART_EVENT, onRestart);
        return () => {
            window.removeEventListener(WELCOME_TOUR_STATE_EVENT, onStateChange);
            window.removeEventListener(WELCOME_TOUR_RESTART_EVENT, onRestart);
        };
    }, [coreMode, userSettings]);

    useEffect(() => {
        if (dismissed) return;
        if (hasSeenTourThisSession()) return;
        if (coreMode !== 'home') return;

        const t = window.setTimeout(() => {
            if (isWelcomeTourDismissed(userSettings) || hasSeenTourThisSession()) return;
            setActive(true);
            markTourSeenThisSession();
        }, APPEAR_DELAY_MS);

        return () => window.clearTimeout(t);
    }, [coreMode, dismissed, userSettings]);

    useEffect(() => {
        if (!active && !showIntegrationOffer) return;
        const updateTarget = () => {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
            if (showIntegrationOffer) {
                setTargetRect(null);
                return;
            }
            const step = steps[stepIdx];
            const el = document.querySelector(step.target.selector);
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
    }, [active, stepIdx, steps, showIntegrationOffer]);

    useEffect(() => {
        if (!active && !showIntegrationOffer) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                persistDismiss();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                if (showIntegrationOffer) {
                    persistDismiss();
                } else if (stepIdx < steps.length - 1) {
                    setStepIdx(stepIdx + 1);
                } else {
                    setShowIntegrationOffer(true);
                    setActive(false);
                }
            } else if (e.key === 'ArrowLeft' && stepIdx > 0 && !showIntegrationOffer) {
                setStepIdx(stepIdx - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [active, stepIdx, steps.length, showIntegrationOffer, persistDismiss]);

    useEffect(() => {
        if (active || showIntegrationOffer) {
            cardRef.current?.focus();
        }
    }, [active, showIntegrationOffer, stepIdx]);

    const handleNext = () => {
        if (stepIdx < steps.length - 1) {
            setStepIdx(stepIdx + 1);
        } else {
            setShowIntegrationOffer(true);
            setActive(false);
        }
    };

    const handleSkip = () => {
        persistDismiss();
    };

    const handleOpenIntegrations = () => {
        openPane({
            id: 'integrations-main',
            type: 'integrations',
            title: lang === 'de' ? 'Integrationen' : 'Integrations',
            size: { width: 860, height: 680 },
        });
        persistDismiss();
    };

    if (dismissed) return null;
    if (coreMode !== 'home') return null;

    if (showIntegrationOffer) {
        const centerLeft = viewport.width / 2 - CARD_WIDTH / 2;
        const centerTop = viewport.height / 2 - CARD_ESTIMATED_HEIGHT / 2;

        return (
            <AnimatePresence>
                <motion.div
                    key="integration-offer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.32 }}
                    className="pointer-events-none fixed inset-0 z-[8000]"
                >
                    <motion.div
                        ref={cardRef}
                        tabIndex={-1}
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.32, delay: 0.08 }}
                        className="pointer-events-auto focus:outline-none"
                        style={{
                            position: 'fixed',
                            left: clamp(centerLeft, CARD_MARGIN, viewport.width - CARD_WIDTH - CARD_MARGIN),
                            top: clamp(centerTop, CARD_MARGIN, viewport.height - CARD_ESTIMATED_HEIGHT - CARD_MARGIN),
                            width: CARD_WIDTH,
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="welcome-tour-integration-title"
                    >
                        <div
                            className="relative overflow-hidden rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.48)] backdrop-blur-[24px]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.88))',
                                border: '1px solid rgba(124,58,237,0.32)',
                            }}
                        >
                            <span
                                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                                style={{
                                    background: 'rgba(103,232,249,0.85)',
                                    boxShadow: '0 0 8px rgba(103,232,249,0.45)',
                                }}
                            />

                            <div className="p-5">
                                <div className="flex items-start gap-3">
                                    <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            background: 'rgba(103,232,249,0.14)',
                                            border: '1px solid rgba(103,232,249,0.32)',
                                        }}
                                    >
                                        <Link2 size={18} className="text-cyan-300" strokeWidth={1.8} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/72">
                                            MÔRA
                                        </div>
                                        <h3
                                            id="welcome-tour-integration-title"
                                            className="mt-0.5 text-[14px] font-medium leading-tight text-white/92"
                                        >
                                            {lang === 'de' ? 'Eine Sache noch...' : 'One more thing...'}
                                        </h3>
                                        <p className="mt-2 text-[12px] leading-snug text-white/60">
                                            {lang === 'de'
                                                ? 'Soll ich dich mit Kalender und Mail verbinden? So kann ich dir deinen Tag besser zeigen.'
                                                : 'Want me to connect your calendar and mail? This way I can better show you your day.'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSkip}
                                        aria-label={lang === 'de' ? 'Schließen' : 'Close'}
                                        className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-white/28 transition-colors hover:bg-white/[0.05] hover:text-white/55"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="mt-5 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSkip}
                                        className="text-[11px] uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-white/60"
                                    >
                                        {lang === 'de' ? 'Später' : 'Later'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleOpenIntegrations}
                                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all"
                                        style={{
                                            background: 'rgba(103,232,249,0.15)',
                                            border: '1px solid rgba(103,232,249,0.35)',
                                            color: 'rgba(103,232,249,0.95)',
                                        }}
                                    >
                                        {lang === 'de' ? 'Verbinden' : 'Connect'}
                                        <ArrowRight size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (!active) return null;

    const step = steps[stepIdx];
    const Icon = step.icon;
    const isLastStep = stepIdx === steps.length - 1;
    const placement = computeTourPlacement(step.id, targetRect, viewport);
    const title = lang === 'de' ? step.titleDe : step.titleEn;
    const voice = lang === 'de' ? step.voiceDe : step.voiceEn;

    return (
        <AnimatePresence>
            <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none fixed z-[8000]"
                style={{ left: placement.left, top: placement.top }}
                data-testid="welcome-tour-card"
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
                            border: `2px solid ${step.accent.replace('0.70', '0.50')}`,
                            boxShadow: `0 0 32px ${step.accent.replace('0.70', '0.25')}, inset 0 0 12px ${step.accent.replace('0.70', '0.10')}`,
                        }}
                    />
                )}

                <motion.div
                    ref={cardRef}
                    tabIndex={-1}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.26, delay: 0.04 }}
                    className="pointer-events-auto w-[min(340px,calc(100vw-2.5rem))] focus:outline-none"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`welcome-tour-title-${step.id}`}
                >
                    <div
                        className="relative overflow-hidden rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.48)] backdrop-blur-[24px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.88))',
                            border: '1px solid rgba(124,58,237,0.32)',
                        }}
                    >
                        <span
                            className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                            style={{
                                background: step.accent.replace('0.70', '0.85'),
                                boxShadow: `0 0 8px ${step.accent.replace('0.70', '0.45')}`,
                            }}
                        />

                        <div className="p-5">
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                    style={{
                                        background: 'rgba(124,58,237,0.14)',
                                        border: '1px solid rgba(124,58,237,0.32)',
                                    }}
                                >
                                    <Icon size={16} className="text-emerald-300" strokeWidth={1.8} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/72">
                                        {lang === 'de' ? `Schritt ${stepIdx + 1} von ${steps.length}` : `Step ${stepIdx + 1} of ${steps.length}`}
                                    </div>
                                    <h3
                                        id={`welcome-tour-title-${step.id}`}
                                        className="mt-0.5 text-[14px] font-medium leading-tight text-white/92"
                                    >
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-[12px] leading-snug text-white/60">
                                        {voice}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    aria-label={lang === 'de' ? 'Tour überspringen' : 'Skip tour'}
                                    className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-white/28 transition-colors hover:bg-white/[0.05] hover:text-white/55"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="mt-4 flex items-center gap-1.5">
                                {steps.map((s, i) => (
                                    <div
                                        key={s.id}
                                        className="rounded-full transition-all"
                                        style={{
                                            width: i === stepIdx ? 16 : 5,
                                            height: 5,
                                            background: i === stepIdx
                                                ? step.accent.replace('0.70', '0.75')
                                                : i < stepIdx
                                                    ? step.accent.replace('0.70', '0.35')
                                                    : 'rgba(255,255,255,0.12)',
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="text-[11px] uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-white/60"
                                >
                                    {lang === 'de' ? 'Überspringen' : 'Skip'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-all"
                                    style={{
                                        background: step.accent.replace('0.70', '0.15'),
                                        border: `1px solid ${step.accent.replace('0.70', '0.35')}`,
                                        color: step.accent.replace('0.70', '0.95'),
                                    }}
                                >
                                    {isLastStep
                                        ? (lang === 'de' ? 'Weiter' : 'Continue')
                                        : (lang === 'de' ? 'Weiter' : 'Next')}
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                        </div>

                        <div
                            className="absolute"
                            style={{
                                right: 28,
                                bottom: -8,
                                width: 16,
                                height: 16,
                                background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.88))',
                                borderRight: '1px solid rgba(124,58,237,0.32)',
                                borderBottom: '1px solid rgba(124,58,237,0.32)',
                                transform: 'rotate(45deg)',
                            }}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default WelcomeTour;
