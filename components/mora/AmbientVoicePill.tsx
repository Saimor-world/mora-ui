"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Volume2, ShieldCheck } from 'lucide-react';
import { openVoiceOverlay } from '@/lib/os/openVoiceOverlay';
import { usePaneStore } from '@/lib/store/paneStore';

export function AmbientVoicePill() {
    const [isListening, setIsListening] = useState(false);
    const [ambientMessage, setAmbientMessage] = useState<string | null>("MÔRA ist wach und hört zu...");
    const openPane = usePaneStore((s) => s.openPane);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAmbientMessage("100% Systeme aktiv · Bereit für Sprache oder Befehle");
        }, 6000);
        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        openVoiceOverlay();
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 pointer-events-auto">
            <motion.button
                onClick={handleClick}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-3 px-4 py-2 rounded-full border border-white/15 bg-black/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] transition-all"
            >
                <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300">
                    <span className="absolute inset-0 rounded-full animate-ping bg-cyan-400/20" />
                    <Mic size={14} className="group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/90">MÔRA Ambient</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                {ambientMessage && (
                    <span className="hidden md:inline-block text-[11px] text-white/50 pl-2 border-l border-white/10 font-mono truncate max-w-[320px]">
                        {ambientMessage}
                    </span>
                )}
            </motion.button>
        </div>
    );
}
