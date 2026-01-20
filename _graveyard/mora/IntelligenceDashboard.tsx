"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Sparkles, Mic, RefreshCw } from 'lucide-react';
import { MoraCommand } from './MoraCommand';
import { useMoraStore } from '@/lib/store/moraState';
import { toast } from '@/lib/toast';

interface IntelligenceDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    orbState: string;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({
    isOpen,
    onClose,
    orbState
}) => {
    const {
        departments,
        spacesByDepartment,
        foldersBySpace,
        nodesByFolder,
        setOrbState,
        loadDepartments,
        activeCompanyId
    } = useMoraStore();

    // Stats calculations - TRUE COUNTS
    const planetCount = departments.length;
    const spaceCount = Object.values(spacesByDepartment).flat().length;
    const nebulaCount = Object.values(foldersBySpace).flat().length;
    const starCount = Object.values(nodesByFolder).flat().length;

    const handleReload = async () => {
        try {
            await loadDepartments(activeCompanyId || undefined);
            toast.success("Intelligence System reloaded");
        } catch (e: any) {
            toast.error("Reload failed");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed bottom-[140px] right-[48px] w-[420px] bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-0 z-[200] overflow-hidden shadow-2xl"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${orbState === 'idle' ? 'bg-emerald-400' : orbState === 'thinking' ? 'bg-blue-400 animate-pulse' : orbState === 'alert' ? 'bg-red-500' : 'bg-amber-400'}`} />
                            <h3 className="text-lg font-light text-white/90 tracking-wider">
                                MÔRA INTELLIGENCE
                            </h3>
                        </div>
                        <button
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                            onClick={onClose}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Agency Input */}
                    <div className="px-4 py-2 border-b border-white/5 bg-black/20">
                        <MoraCommand onSuccess={onClose} />
                    </div>

                    {/* Status Section */}
                    <div className="p-4 space-y-4">
                        {/* Universe Stats */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="text-xl font-light text-emerald-400">{planetCount}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 group-hover:text-emerald-400/60 transition-colors">Planets</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="text-xl font-light text-blue-400">{spaceCount}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 group-hover:text-blue-400/60 transition-colors">Moons</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="text-xl font-light text-purple-400">{nebulaCount}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 group-hover:text-purple-400/60 transition-colors">Nebulas</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="text-xl font-light text-amber-400">{starCount}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 group-hover:text-amber-400/60 transition-colors">Stars</div>
                            </div>
                        </div>

                        {/* AI State */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-white/[0.08] rounded-xl p-4 border border-white/10">
                            {/* Animated Background Pulse */}
                            <motion.div
                                className="absolute inset-0 bg-emerald-500/5"
                                animate={{ opacity: [0.1, 0.2, 0.1] }}
                                transition={{ duration: 4, repeat: Infinity }}
                            />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Neural Core Pulse</span>
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${orbState === 'thinking' ? 'text-blue-400 bg-blue-400/10' :
                                        orbState === 'alert' ? 'text-red-400 bg-red-400/10' :
                                            orbState === 'insight' ? 'text-amber-400 bg-amber-400/10' :
                                                'text-emerald-400 bg-emerald-400/10'
                                        }`}>
                                        {orbState.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-white/80 font-light leading-relaxed">
                                    {orbState === 'idle' && 'Digital cortex active. System awareness stabilized across all sectors. Awaiting intentional input.'}
                                    {orbState === 'thinking' && 'Neural pathways engaged. Synthesizing cross-sector data patterns for proactive optimization...'}
                                    {orbState === 'focus' && 'Cognitive resources channeled to active workspace. Contextual resonance maximized.'}
                                    {orbState === 'alert' && 'Critical variance detected. Behavioral anomalies identified in local departmental nodes.'}
                                    {orbState === 'insight' && 'Phase shift complete. New structural relationships identified via semantic knowledge mapping.'}
                                    {orbState === 'demo' && 'Demo Intelligence active. Showcasing autonomous cognition on sample data.'}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-2">
                            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                                <span>Priority Directives</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setOrbState('thinking');
                                        setTimeout(() => setOrbState('idle'), 3000);
                                        toast.success("Deep Analysis started");
                                    }}
                                    className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all text-left group"
                                >
                                    <Sparkles size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-white/70">Deep Analysis</span>
                                </button>
                                <button
                                    onClick={() => toast.info('Activating Voice Interface...')}
                                    className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all text-left group"
                                >
                                    <Mic size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-white/70">Voice Control</span>
                                </button>
                                <button
                                    onClick={handleReload}
                                    className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all text-left group"
                                >
                                    <RefreshCw size={14} className="text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
                                    <span className="text-xs text-white/70">Refresh Mind</span>
                                </button>
                                <div className="p-2.5 bg-white/[0.02] rounded-lg border border-white/5 flex items-center justify-center">
                                    <div className="text-[10px] text-white/20 uppercase tracking-widest">Locked: Opti-Flow</div>
                                </div>
                            </div>
                        </div>

                        {/* System Status */}
                        <div className="flex items-center gap-2 text-[10px] text-white/30 pt-3 border-t border-white/5 font-mono">
                            <Activity size={10} className="text-emerald-500/50" />
                            <span>MÔRA CORE CONNECTED</span>
                            <span className="ml-auto opacity-50 tracking-tighter">SECURE.256.TUNNEL</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
