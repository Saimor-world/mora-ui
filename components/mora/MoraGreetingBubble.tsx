'use client';

/**
 * MoraGreetingBubble — first-visit welcome moment.
 *
 * Appears once per user (localStorage flag) when they first land in HQ.
 * A subtle floating chat bubble near the Mora orb in the bottom-right,
 * inviting them to ask Mora something. Auto-dismisses after 7s or on click.
 *
 * Why it matters: turns the silent OS into an active companion immediately
 * for first-time visitors. The orb is the soul of SAIMOR — this is its hello.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';

const STORAGE_KEY = 'saimor_mora_greeted_v1';
const APPEAR_DELAY_MS = 1500;
const AUTO_DISMISS_MS = 7000;

export const MoraGreetingBubble: React.FC = () => {
    const user = useSessionStore((s) => s.user);
    const activeMode = useNavStore((s) => s.activeMode);
    const [visible, setVisible] = useState(false);
    const [dismissing, setDismissing] = useState(false);

    useEffect(() => {
        if (!user || typeof window === 'undefined') return;
        const userKey = `${STORAGE_KEY}_${user.id ?? user.email ?? 'anon'}`;
        const alreadyGreeted = window.localStorage.getItem(userKey);
        if (alreadyGreeted) return;

        const showTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
        const dismissTimer = setTimeout(() => {
            setDismissing(true);
            window.localStorage.setItem(userKey, '1');
        }, APPEAR_DELAY_MS + AUTO_DISMISS_MS);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, [user]);

    const handleDismiss = () => {
        setDismissing(true);
        if (user && typeof window !== 'undefined') {
            const userKey = `${STORAGE_KEY}_${user.id ?? user.email ?? 'anon'}`;
            window.localStorage.setItem(userKey, '1');
        }
    };

    const firstName = (() => {
        if (!user?.email) return null;
        const local = user.email.split('@')[0];
        return local.charAt(0).toUpperCase() + local.slice(1);
    })();

    if (activeMode === 'public_playground') return null;

    return (
        <AnimatePresence>
            {visible && !dismissing && (
                <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed z-[8000] pointer-events-auto"
                    style={{
                        right: '180px',
                        bottom: '110px',
                    }}
                    onAnimationComplete={() => {
                        if (dismissing) setVisible(false);
                    }}
                >
                    <div
                        className="relative flex items-start gap-3 rounded-[20px] border px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-[24px]"
                        style={{
                            maxWidth: 320,
                            background: 'linear-gradient(135deg, rgba(8,20,16,0.92), rgba(4,12,11,0.86))',
                            borderColor: 'rgba(124,58,237,0.30)',
                        }}
                    >
                        {/* Smaragd glow accent */}
                        <span
                            className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                            style={{ background: 'rgba(124,58,237,0.85)', boxShadow: '0 0 8px rgba(124,58,237,0.6)' }}
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
                                Mora
                            </div>
                            <div className="mt-1 text-[13px] leading-snug text-white/86">
                                {firstName ? `Hi ${firstName}, ich bin Mora.` : 'Hi, ich bin Mora.'}
                                {' '}Frag mich was über deinen Tag.
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="Schließen"
                            className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                        >
                            <X size={12} />
                        </button>

                        {/* Pointer towards the orb (bottom-right) */}
                        <div
                            className="absolute"
                            style={{
                                right: 28,
                                bottom: -7,
                                width: 14,
                                height: 14,
                                background: 'linear-gradient(135deg, rgba(8,20,16,0.92), rgba(4,12,11,0.86))',
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
