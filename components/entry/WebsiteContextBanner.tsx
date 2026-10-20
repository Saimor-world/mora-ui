'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { clearWebsiteEntryActiveContext, loadWebsiteEntryContext } from '@/lib/websiteEntryStorage';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { toast } from 'sonner';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';

const DOSSIER_AUTO_OPEN_FLAG_PREFIX = 'saimor_dossier_auto_opened_';
const LEGACY_BANNER_AUTO_OPEN_FLAG_PREFIX = 'saimor_website_entry_auto_opened_';

const GOLD = '#D6A848';
const CREAM = '247,244,233';

/**
 * Optional dossier hint for HQ sessions that still carry a website-entry context.
 * Preview / visitor Home already owns this story — do not stack a second card there.
 * Never render empty placeholders such as "--" or "0".
 */
export function WebsiteContextBanner() {
    const [context, setContext] = useState<WebsiteEntryContext | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const openPane = usePaneStore((s) => s.openPane);
    const activeMode = useNavStore((s) => s.activeMode);

    useEffect(() => {
        if (activeMode === 'visitor' || activeMode === 'private_preview') {
            setIsVisible(false);
            return;
        }

        const stored = loadWebsiteEntryContext();
        if (!stored) return;

        const storedAt = stored.storedAt ? new Date(stored.storedAt).getTime() : 0;
        const now = Date.now();
        if (now - storedAt >= 1000 * 60 * 60 * 2) return;

        setContext(stored);

        const timer = setTimeout(() => {
            try {
                const identity = stored.id || stored.companyName;
                const autoOpenKeys = [
                    `${DOSSIER_AUTO_OPEN_FLAG_PREFIX}${identity}`,
                    `${LEGACY_BANNER_AUTO_OPEN_FLAG_PREFIX}${identity}`,
                ];
                if (autoOpenKeys.some((key) => window.localStorage.getItem(key))) return;
            } catch {
                // Best effort only.
            }
            setIsVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, [activeMode]);

    const hasRealScore = typeof context?.score === 'number';
    const docCount = context?.documents?.length ?? 0;
    const taskCount = context?.tasks?.length ?? 0;
    const hasWork = docCount > 0 || taskCount > 0;

    if (!context || !isVisible) return null;
    if (activeMode === 'visitor' || activeMode === 'private_preview') return null;

    const handleClear = () => {
        clearWebsiteEntryActiveContext();
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
        toast.success('Dossier im Arbeitsbereich geöffnet');
        setIsVisible(false);
    };

    const detailParts: string[] = [];
    if (hasRealScore) detailParts.push(`Score ${context.score}`);
    if (docCount > 0) detailParts.push(`${docCount} Dokument${docCount === 1 ? '' : 'e'}`);
    if (taskCount > 0) detailParts.push(`${taskCount} Aufgabe${taskCount === 1 ? '' : 'n'}`);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="fixed z-[1000] w-[min(420px,calc(100vw-2rem))]"
                style={{
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 112px)',
                }}
            >
                <div
                    className="relative overflow-hidden rounded-xl p-4"
                    style={{
                        background: 'rgba(7,11,12,0.88)',
                        border: '0.5px solid rgba(214,168,72,0.28)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p
                                style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: GOLD,
                                }}
                            >
                                Dossier
                            </p>
                            <h4
                                className="mt-1"
                                style={{
                                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                                    fontSize: 20,
                                    fontWeight: 400,
                                    color: `rgb(${CREAM})`,
                                }}
                            >
                                {context.companyName}
                            </h4>
                            <p
                                className="mt-1"
                                style={{
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    color: `rgba(${CREAM}, 0.62)`,
                                }}
                            >
                                {detailParts.length > 0
                                    ? `${detailParts.join(' · ')} bereit.`
                                    : hasWork
                                        ? 'Arbeitsobjekt bereit.'
                                        : 'Im Arbeitsbereich öffnen, wenn du tiefer einsteigen willst.'}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            aria-label="Hinweis schliessen"
                            className="shrink-0 rounded p-1"
                            style={{ color: `rgba(${CREAM}, 0.35)` }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                        <button
                            onClick={handleUseContext}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium"
                            style={{
                                background: 'rgba(214,168,72,0.16)',
                                border: '0.5px solid rgba(214,168,72,0.35)',
                                color: GOLD,
                            }}
                        >
                            Dossier öffnen
                            <ArrowRight size={12} />
                        </button>
                        <button
                            onClick={handleClear}
                            className="text-[12px]"
                            style={{ color: `rgba(${CREAM}, 0.45)` }}
                        >
                            Verwerfen
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
