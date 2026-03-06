"use client";

import React, { useMemo } from "react";
import { useMoraStore } from "@/lib/store/moraState";
import { useUser } from "@/lib/hooks/useUser";
import { usePlatformModifier } from "@/lib/hooks/usePlatformModifier";
import { Sparkles, AlertTriangle, Command } from "lucide-react";
import { motion } from "framer-motion";
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from './MoraContextChip';

interface Props {
    onOpenIntelligence?: () => void;
    isOpen?: boolean;
}

export const MoraIntelligenceBar: React.FC<Props> = ({ onOpenIntelligence, isOpen }) => {
    const { role } = useUser();
    const mod = usePlatformModifier();
    const orbState = useMoraStore((s) => s.orbState);
    const viewMode = useMoraStore((s) => s.viewMode);
    const coreError = useMoraStore((s) => s.coreError);
    const ctx = useMoraContext();

    const statusText = useMemo(() => {
        if (coreError) return "OFFLINE";
        if (orbState === "thinking") return "PROCESSING";
        if (orbState === "focus") return "ACTIVE";
        if (viewMode === "demo") return "DEMO";
        return "READY";
    }, [orbState, coreError, viewMode]);

    return (
        <div className="fixed bottom-4 left-6 z-40 w-full max-w-sm pointer-events-none">
            <div className="pointer-events-auto relative group">

                {/* Main Bar Container */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`relative backdrop-blur-xl border rounded-full p-2 pr-6 flex items-center gap-4 shadow-2xl shadow-black/50 transition-all duration-500 ${isOpen
                        ? 'bg-[#050d0a]/95 border-mora-gold/30 shadow-mora-gold/10'
                        : 'bg-[#050d0a]/80 border-white/5 group-hover:border-mora-gold/20'
                        }`}
                >

                    {/* Status Indicator (Compact - Orb is in MoraShell) */}
                    <div className="relative shrink-0">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <div className={`w-3 h-3 rounded-full transition-all ${orbState === 'thinking' ? 'bg-mora-gold animate-pulse' :
                                orbState === 'focus' ? 'bg-emerald-400' :
                                    coreError ? 'bg-red-400 animate-pulse' :
                                        'bg-emerald-500/50'
                                }`} />
                        </div>
                    </div>

                    {/* Context & Status Area */}
                    <div className="flex-1 flex flex-col justify-center min-w-0 gap-0.5 cursor-pointer" onClick={onOpenIntelligence}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${coreError ? 'text-red-400' : 'text-emerald-400'}`}>
                                Mora • {statusText}
                            </span>
                            {coreError && <AlertTriangle size={10} className="text-red-400 animate-pulse" />}
                        </div>
                        <MoraContextChip variant="bar" snapshot={ctx} />
                    </div>

                    {/* Actions / Indicators */}
                    <div className="flex items-center gap-3 pl-4 border-l border-white/5">
                        <button
                            onClick={onOpenIntelligence}
                            className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-white/10 text-mora-gold' : 'hover:bg-white/5 text-emerald-400/50 hover:text-mora-gold'
                                }`}
                            title="Open Intelligence Field"
                        >
                            <Sparkles size={18} />
                        </button>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500/40 font-mono" title={`Shortcut: ${mod} + K`}>
                            <Command size={10} />
                            <span>K</span>
                        </div>
                    </div>

                    {/* Decorative Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                </motion.div>

            </div>
        </div>
    );
};
