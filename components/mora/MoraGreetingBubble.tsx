'use client';

/**
 * MoraGreetingBubble — lightweight Môra presence surface.
 *
 * Two responsibilities:
 * 1. First-run: explain Môra as a proactive assistant, not a prompt box.
 * 2. Runtime: surface `mora.speaks` events as a compact contextual notice.
 *
 * Proactive events never auto-open chat. Conversation remains an explicit
 * user action from the notice when they want to go deeper.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleMore, Sparkles, X } from 'lucide-react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { isProductTourDismissed } from '@/lib/onboarding/productTourStore';
import {
    MORA_SPEAKS_EVENT,
    type MoraSpeakPayload,
} from '@/lib/queries/useMoraSpeaks';

const STORAGE_KEY = 'saimor_mora_greeted_v2';
const APPEAR_DELAY_MS = 1500;
const AUTO_DISMISS_MS = 9000;

export const MoraGreetingBubble: React.FC = () => {
    const user = useSessionStore((s) => s.user);
    const activeMode = useNavStore((s) => s.activeMode);
    const openPane = usePaneStore((s) => s.openPane);

    const [visible, setVisible] = useState(false);
    const [dismissing, setDismissing] = useState(false);
    const [proactive, setProactive] = useState<MoraSpeakPayload | null>(null);

    // First-run introduction: prove the assistant model instead of asking for a prompt.
    useEffect(() => {
        if (!user || typeof window === 'undefined') return;
        const settings = (user.settings ?? {}) as Record<string, unknown>;
        if (!isProductTourDismissed(settings)) return;
        const userKey = `${STORAGE_KEY}_${user.id ?? user.email ?? 'anon'}`;
        const alreadyGreeted = window.localStorage.getItem(userKey);
        if (alreadyGreeted) return;

        const showTimer = window.setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
        const dismissTimer = window.setTimeout(() => {
            setDismissing(true);
            window.localStorage.setItem(userKey, '1');
        }, APPEAR_DELAY_MS + AUTO_DISMISS_MS);

        return () => {
            window.clearTimeout(showTimer);
            window.clearTimeout(dismissTimer);
        };
    }, [user]);

    // Proactive system events: show in-place instead of forcing a conversation.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleSpeak = (event: Event) => {
            const payload = (event as CustomEvent<MoraSpeakPayload>).detail;
            if (!payload?.message) return;
            setDismissing(false);
            setProactive(payload);
            setVisible(true);
        };

        window.addEventListener(MORA_SPEAKS_EVENT, handleSpeak);
        return () => window.removeEventListener(MORA_SPEAKS_EVENT, handleSpeak);
    }, []);

    const rememberFirstRunDismissed = () => {
        if (!user || typeof window === 'undefined') return;
        const userKey = `${STORAGE_KEY}_${user.id ?? user.email ?? 'anon'}`;
        window.localStorage.setItem(userKey, '1');
    };

    const handleDismiss = () => {
        setDismissing(true);
        rememberFirstRunDismissed();
        window.setTimeout(() => {
            setVisible(false);
            setProactive(null);
            setDismissing(false);
        }, 220);
    };

    const handleConversation = () => {
        const initialMoraMessage = proactive?.message;
        openPane({
            id: 'mora-chat',
            type: 'chat',
            title: 'Môra',
            size: { width: 520, height: 660 },
            data: initialMoraMessage
                ? { initiatedFromProactiveNotice: true, initialMoraMessage }
                : { initiatedFromPresence: true },
        });
        handleDismiss();
    };

    const firstName = (() => {
        if (!user?.email) return null;
        const local = user.email.split('@')[0];
        return local.charAt(0).toUpperCase() + local.slice(1);
    })();

    if (activeMode === 'public_playground') return null;

    const isProactive = Boolean(proactive);
    const label = isProactive
        ? proactive?.tier === 'urgent'
            ? 'Môra · wichtig'
            : 'Môra'
        : 'Môra';

    const message = isProactive
        ? proactive!.message
        : firstName
            ? `Hi ${firstName}. Ich halte hier den Zusammenhang zusammen. Wenn etwas deine Aufmerksamkeit braucht oder ich Arbeit vorbereiten kann, melde ich mich.`
            : 'Ich halte hier den Zusammenhang zusammen. Wenn etwas deine Aufmerksamkeit braucht oder ich Arbeit vorbereiten kann, melde ich mich.';

    return (
        <AnimatePresence>
            {visible && !dismissing && (
                <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed z-[8000] pointer-events-auto"
                    style={{ right: '180px', bottom: '110px' }}
                    data-saimor-product="saimor-os"
                    data-saimor-surface="mora-presence"
                    data-mora-proactive={isProactive ? 'true' : 'false'}
                >
                    <div
                        className="relative flex items-start gap-3 rounded-[20px] border px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-[24px]"
                        style={{
                            maxWidth: 360,
                            background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.90))',
                            borderColor: proactive?.tier === 'urgent'
                                ? 'rgba(245,181,68,0.42)'
                                : 'rgba(124,58,237,0.30)',
                        }}
                    >
                        <span
                            className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                            style={{
                                background: proactive?.tier === 'urgent'
                                    ? 'rgba(245,181,68,0.9)'
                                    : 'rgba(124,58,237,0.85)',
                                boxShadow: proactive?.tier === 'urgent'
                                    ? '0 0 10px rgba(245,181,68,0.55)'
                                    : '0 0 8px rgba(124,58,237,0.6)',
                            }}
                        />

                        <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                                background: 'rgba(124,58,237,0.14)',
                                border: '1px solid rgba(124,58,237,0.32)',
                            }}
                        >
                            <Sparkles size={14} className="text-emerald-300" strokeWidth={1.8} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/72">
                                {label}
                            </div>
                            <div className="mt-1 text-[13px] leading-relaxed text-white/86">
                                {message}
                            </div>

                            {isProactive && (
                                <button
                                    type="button"
                                    onClick={handleConversation}
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-white/62 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white/88"
                                >
                                    <MessageCircleMore size={12} />
                                    Mit Môra sprechen
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="Schließen"
                            className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                        >
                            <X size={12} />
                        </button>

                        <div
                            className="absolute"
                            style={{
                                right: 28,
                                bottom: -7,
                                width: 14,
                                height: 14,
                                background: 'linear-gradient(135deg, rgba(8,20,16,0.94), rgba(4,12,11,0.90))',
                                borderRight: '1px solid rgba(124,58,237,0.30)',
                                borderBottom: '1px solid rgba(124,58,237,0.30)',
                                transform: 'rotate(45deg)',
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MoraGreetingBubble;
