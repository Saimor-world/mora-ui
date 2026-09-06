"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';

export const ConnectionBanner: React.FC = () => {
    const { status, retry, lastConnected } = useConnectionStatus();
    const surfaceProfile = useSurfaceProfile();
    const websiteEntryContext = useWebsiteEntryContext();

    // Security-Check handoffs are intentionally a constrained preview surface.
    // Showing a global amber connectivity warning here competes with the dossier
    // handoff and makes the preview look broken even though live integrations are
    // deliberately outside this first-run context.
    if (websiteEntryContext) {
        return null;
    }

    if (status === 'connected' || status === 'connecting') {
        return null;
    }

    const formatLastConnected = () => {
        if (!lastConnected) return 'Nie verbunden';
        const diff = Date.now() - lastConnected.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Gerade eben';
        if (minutes < 60) return `Vor ${minutes} Min.`;
        return `Vor ${Math.floor(minutes / 60)} Std.`;
    };

    const title = surfaceProfile.isLocalTruthSurface
        ? (status === 'offline' ? 'Interne Instanz offline' : 'Interne Instanz gestört')
        : status === 'offline'
            ? 'Keine Verbindung'
            : 'Verbindungsfehler';

    const surfaceLabel = surfaceProfile.isPublicDemoSurface
        ? 'Oeffentliche Demo-Instanz'
        : surfaceProfile.isLocalTruthSurface
            ? 'Interne Instanz'
            : 'Verbindung eingeschränkt';

    const helperText = surfaceProfile.isLocalTruthSurface
        ? 'Prüfe Core, lokale Integrationen und Modelle. Diese Oberfläche ist für die echte Arbeitslogik gedacht.'
        : surfaceProfile.isPublicDemoSurface
            ? 'Die Demo spiegelt nur den stabilen Stand. Lokale Regeln und Integrationen liegen ausserhalb dieser Instanz.'
            : 'Die Organisation ist erreichbar, aber der aktuelle Datenpfad ist gestört.';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed left-1/2 top-4 z-[1000] w-[min(92vw,680px)] -translate-x-1/2"
            >
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 shadow-lg backdrop-blur-xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                        {status === 'offline' ? (
                            <WifiOff size={16} className="text-amber-400" />
                        ) : (
                            <AlertTriangle size={16} className="text-amber-400" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-amber-200">{title}</span>
                            <span className="rounded-full border border-amber-400/15 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-100/70">
                                {surfaceLabel}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-300/65">
                            Letzte stabile Verbindung: {formatLastConnected()}
                        </p>
                        <p className="mt-1 max-w-[480px] text-[11px] leading-relaxed text-amber-100/50">
                            {helperText}
                        </p>
                    </div>

                    <button
                        onClick={retry}
                        className="group ml-2 rounded-xl border border-amber-400/15 bg-amber-500/20 px-3 py-2 text-amber-200 transition-colors hover:bg-amber-500/30"
                        title="Erneut verbinden"
                    >
                        <span className="inline-flex items-center gap-2 text-[11px] font-medium">
                            <RefreshCw
                                size={14}
                                className="transition-transform duration-500 group-hover:rotate-180"
                            />
                            Erneut prüfen
                        </span>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConnectionBanner;
