"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';

/**
 * Shows a subtle banner when backend connectivity is degraded.
 * The wording adapts to public demo, local truth, and standard org surfaces.
 */
export const ConnectionBanner: React.FC = () => {
    const { status, retry, lastConnected } = useConnectionStatus();
    const surfaceProfile = useSurfaceProfile();

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
        ? (status === 'offline' ? 'Interne Instanz offline' : 'Interne Instanz gestoert')
        : status === 'offline'
            ? 'Keine Verbindung'
            : 'Verbindungsfehler';

    const surfaceLabel = surfaceProfile.isPublicDemoSurface
        ? 'Oeffentliche Demo-Instanz'
        : surfaceProfile.isLocalTruthSurface
            ? 'Lokaler Wahrheitsmodus'
            : 'Verbindung eingeschraenkt';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed top-4 left-1/2 z-[1000] -translate-x-1/2"
            >
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 shadow-lg backdrop-blur-xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                        {status === 'offline' ? (
                            <WifiOff size={16} className="text-amber-400" />
                        ) : (
                            <AlertTriangle size={16} className="text-amber-400" />
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-amber-200">{title}</span>
                        <span className="text-[10px] text-amber-400/60">
                            {formatLastConnected()} · {surfaceLabel}
                        </span>
                    </div>

                    <button
                        onClick={retry}
                        className="group ml-2 rounded-lg bg-amber-500/20 p-2 text-amber-300 transition-colors hover:bg-amber-500/30"
                        title="Erneut verbinden"
                    >
                        <RefreshCw
                            size={14}
                            className="transition-transform duration-500 group-hover:rotate-180"
                        />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConnectionBanner;
