'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ShieldCheck, X } from 'lucide-react';
import { clearWebsiteEntryContext, loadWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { toast } from 'sonner';
import { usePaneStore } from '@/lib/store/paneStore';

export function WebsiteContextBanner() {
    const [context, setContext] = useState<WebsiteEntryContext | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const openPane = usePaneStore((s) => s.openPane);

    useEffect(() => {
        const stored = loadWebsiteEntryContext();
        if (!stored) return;

        const storedAt = stored.storedAt ? new Date(stored.storedAt).getTime() : 0;
        const now = Date.now();
        if (now - storedAt >= 1000 * 60 * 60 * 2) return;

        setContext(stored);
        const timer = setTimeout(() => {
            try {
                const autoOpenKey = `saimor_website_entry_auto_opened_${stored.id || stored.companyName}`;
                if (window.localStorage.getItem(autoOpenKey)) return;
            } catch {
                // Best effort only.
            }
            setIsVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    if (!context || !isVisible) return null;

    const handleClear = () => {
        clearWebsiteEntryContext();
        setIsVisible(false);
        toast.info('Website-Kontext wurde entfernt');
    };

    const handleUseContext = () => {
        openPane({
            id: 'website-dossier-current',
            type: 'website-dossier',
            title: `${context.companyName} Dossier`,
            size: { width: 1040, height: 720 },
            data: { context },
        });
        toast.success('Dossier im Workspace geöffnet');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-24 left-1/2 z-[1000] w-[min(540px,calc(100vw-2rem))] -translate-x-1/2"
            >
                <div className="relative overflow-hidden rounded-[24px] border border-emerald-400/25 bg-black/60 p-5 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                    <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-[60px]" />

                    <div className="relative flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/15 text-emerald-300">
                            <ShieldCheck size={24} />
                        </div>

                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/80">
                                    Website-Dossier
                                </p>
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="text-white/30 transition-colors hover:text-white"
                                    aria-label="Hinweis schliessen"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <h4 className="text-lg font-medium text-white">
                                {context.companyName} im HQ geladen
                            </h4>
                            <p className="text-sm leading-relaxed text-white/55">
                                Score {context.score ?? '--'}, {context.documents.length} Dokumente und {context.tasks.length} Aufgaben stehen als Arbeitsobjekt bereit.
                            </p>

                            <div className="flex items-center gap-3 pt-3">
                                <button
                                    onClick={handleUseContext}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-300"
                                >
                                    Dossier öffnen
                                    <ArrowRight size={14} />
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="text-[10px] uppercase tracking-widest text-white/30 transition-colors hover:text-white/50"
                                >
                                    Verwerfen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
