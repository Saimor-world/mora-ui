'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, X } from 'lucide-react';
import type { MailArrivalPrompt } from '@/lib/store/mailPromptStore';

interface MoraMailToastProps {
    prompt: MailArrivalPrompt;
    onOpen: () => void;
    onDismiss: () => void;
    onShowAll: () => void;
}

export function MoraMailToast({
    prompt,
    onOpen,
    onDismiss,
    onShowAll,
}: MoraMailToastProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="absolute bottom-full right-0 z-[500] mb-4 w-[360px] overflow-hidden rounded-2xl border border-sky-300/20 bg-[#060a10]/94 shadow-[0_28px_90px_rgba(0,0,0,0.55),0_0_60px_rgba(56,189,248,0.12)] backdrop-blur-2xl"
            role="status"
            aria-live="polite"
        >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/45 to-transparent" />
            <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200/20 bg-sky-300/12 text-sky-100">
                            <Mail size={15} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-sky-100/48">Neue E-Mail</p>
                            <p className="mt-0.5 text-xs text-sky-50/78">MÔRA fragt nach</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/8 hover:text-white/65"
                        aria-label="Mail-Hinweis später zeigen"
                    >
                        <X size={14} />
                    </button>
                </div>

                <p className="text-sm font-medium leading-tight text-white/90">{prompt.from}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/56">{prompt.subject}</p>
                <p className="mt-2 text-xs text-sky-100/62">Soll ich die Mail lesen?</p>

                <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={onShowAll}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] text-white/45 transition-colors hover:bg-white/7 hover:text-white/75"
                    >
                        <Mail size={12} />
                        Alle Signale
                    </button>
                    <button
                        type="button"
                        onClick={onOpen}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200/20 bg-sky-300/12 px-3 py-2 text-[11px] font-medium text-sky-50 transition-colors hover:bg-sky-300/18"
                    >
                        Ja, öffnen
                        <ArrowRight size={12} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
