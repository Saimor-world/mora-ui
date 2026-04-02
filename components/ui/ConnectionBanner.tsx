"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useConnectionStatus } from '@/lib/hooks/useConnectionStatus';

/**
 * V12: Connection Banner
 *
 * Shows a subtle banner when backend is offline.
 * Allows user to retry connection.
 */
export const ConnectionBanner: React.FC = () => {
    const { status, isOffline, errorMessage, retry, lastConnected } = useConnectionStatus();

    // Don't show if connected
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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000]"
            >
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl shadow-lg">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20">
                        {status === 'offline' ? (
                            <WifiOff size={16} className="text-amber-400" />
                        ) : (
                            <AlertTriangle size={16} className="text-amber-400" />
                        )}
                    </div>

                    {/* Message */}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-amber-200">
                            {status === 'offline' ? 'Keine Verbindung' : 'Verbindungsfehler'}
                        </span>
                        <span className="text-[10px] text-amber-400/60">
                            {formatLastConnected()} • Demo-Modus aktiv
                        </span>
                    </div>

                    {/* Retry Button */}
                    <button
                        onClick={retry}
                        className="ml-2 p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors group"
                        title="Erneut verbinden"
                    >
                        <RefreshCw
                            size={14}
                            className="group-hover:rotate-180 transition-transform duration-500"
                        />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConnectionBanner;
