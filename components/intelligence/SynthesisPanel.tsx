"use client";

import React, { useState, useEffect } from 'react';
import { fetchSynthesis, type SynthesisResponse } from '@/lib/api/mindloopClient';
import { Brain, TrendingUp, Activity, AlertTriangle, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntelligencePanelProps {
    visible?: boolean;
    onClose?: () => void;
}

export const SynthesisPanel: React.FC<IntelligencePanelProps> = ({ visible = true, onClose }) => {
    const [synthesis, setSynthesis] = useState<SynthesisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        const loadSynthesis = async () => {
            try {
                setIsLoading(true);
                const data = await fetchSynthesis();
                setSynthesis(data);
                setError(null);
            } catch (err: any) {
                console.error('SynthesisPanel: Failed to load', err);
                setError(err.message || 'Failed to load synthesis');
            } finally {
                setIsLoading(false);
            }
        };

        loadSynthesis();
        const interval = setInterval(loadSynthesis, 30000);
        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'high': return 'text-red-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-emerald-400';
            default: return 'text-gray-400';
        }
    };

    const getRiskBg = (level: string) => {
        switch (level) {
            case 'high': return 'bg-red-500/10 border-red-500/20';
            case 'medium': return 'bg-yellow-500/10 border-yellow-500/20';
            case 'low': return 'bg-emerald-500/10 border-emerald-500/20';
            default: return 'bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl pointer-events-auto"
                >
                    <div className="mx-4 rounded-2xl glass-panel border border-white/10 bg-[#050f0a]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <Brain size={18} className="text-mora-gold" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-emerald-50 tracking-wide">INTELLIGENCE SYNTHESIS</h3>
                                    <p className="text-[10px] text-emerald-500/50 uppercase tracking-wider">
                                        Active Mindloop Analysis
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 text-emerald-500/50 hover:text-emerald-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {isLoading && !synthesis && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                    <span className="text-xs text-emerald-500/50 tracking-widest uppercase">Synthesizing Data...</span>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-3">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            {synthesis && (
                                <div className="space-y-8">
                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center gap-1">
                                            <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Risk Level</div>
                                            <div className={`text-lg font-bold capitalize ${getRiskColor(synthesis?.summary?.risk_level ?? 'low')}`}>
                                                {synthesis?.summary?.risk_level ?? 'Unknown'}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center gap-1">
                                            <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Total Nodes</div>
                                            <div className="text-lg font-bold text-emerald-100">{synthesis?.summary?.total_nodes ?? 0}</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center gap-1">
                                            <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Events</div>
                                            <div className="text-lg font-bold text-emerald-100">{synthesis?.summary?.total_events ?? 0}</div>
                                        </div>
                                    </div>

                                    {/* Insights Section */}
                                    {synthesis?.insights && synthesis.insights.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400/80 uppercase tracking-widest">
                                                <Sparkles size={12} />
                                                Core Insights
                                            </div>
                                            <div className="grid gap-2">
                                                {synthesis.insights.map((insight, idx) => (
                                                    <div key={idx} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-sm text-emerald-100/90 leading-relaxed hover:bg-emerald-500/10 transition-colors">
                                                        {insight}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Risks Section */}
                                    {synthesis?.top_risks && synthesis.top_risks.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-medium text-red-400/80 uppercase tracking-widest">
                                                <AlertTriangle size={12} />
                                                Risk Factors
                                            </div>
                                            <div className="grid gap-2">
                                                {synthesis.top_risks.slice(0, 3).map((risk, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                                        <span className="text-sm text-emerald-100/90">{risk?.title ?? 'Unknown Risk'}</span>
                                                        <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded">
                                                            {risk?.risk_score?.toFixed?.(1) ?? '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Info */}
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-emerald-500/40">
                                        <span>Last Analysis: {synthesis?.summary?.last_activity ? new Date(synthesis.summary.last_activity).toLocaleTimeString() : '—'}</span>
                                        <span>Nodes: {synthesis?.summary?.total_nodes ?? 0}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
