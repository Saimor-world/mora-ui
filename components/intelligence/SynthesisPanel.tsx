"use client";

import React, { useState, useEffect } from 'react';
import { fetchSynthesis, type SynthesisResponse } from '@/lib/api/mindloopClient';
import { Brain, TrendingUp, Activity, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export const SynthesisPanel: React.FC = () => {
    const [synthesis, setSynthesis] = useState<SynthesisResponse | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch synthesis on mount and every 30 seconds
    useEffect(() => {
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
        const interval = setInterval(loadSynthesis, 30000); // Refresh every 30s

        return () => clearInterval(interval);
    }, []);

    if (error && !synthesis) {
        return null; // Hide panel if initial load failed
    }

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

    if (!synthesis) {
        return (
            <div className="absolute top-6 right-6 z-40 pointer-events-auto">
                <div className="w-64 px-4 py-3 rounded-xl glass-panel border border-white/10 bg-[#050f0a]/90 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <Brain size={14} className="text-mora-gold animate-pulse" />
                        <span className="text-xs text-emerald-500/50">Loading Intelligence...</span>
                    </div>
                </div>
            </div>
        );
    }

    const { summary } = synthesis;

    return (
        <div className="absolute top-6 right-6 z-40 pointer-events-auto">
            <div className={`rounded-xl glass-panel border border-white/10 bg-[#050f0a]/90 backdrop-blur-md overflow-hidden transition-all duration-300 ${
                isExpanded ? 'w-80' : 'w-64'
            }`}>
                {/* Header */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Brain size={14} className="text-mora-gold" />
                        <span className="text-xs font-medium text-emerald-100 tracking-widest uppercase">
                            Intelligence
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${getRiskBg(summary.risk_level)} ${getRiskColor(summary.risk_level)}`}>
                            {summary.risk_level}
                        </div>
                        {isExpanded ? <ChevronUp size={12} className="text-emerald-500/50" /> : <ChevronDown size={12} className="text-emerald-500/50" />}
                    </div>
                </button>

                {/* Collapsed View - Stats */}
                {!isExpanded && (
                    <div className="px-4 py-3 border-t border-white/5 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Nodes</div>
                            <div className="text-lg font-bold text-emerald-100">{summary.total_nodes}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Events</div>
                            <div className="text-lg font-bold text-emerald-100">{summary.total_events}</div>
                        </div>
                    </div>
                )}

                {/* Expanded View - Detailed Info */}
                {isExpanded && (
                    <div className="px-4 py-3 border-t border-white/5 space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp size={10} />
                                    Nodes
                                </div>
                                <div className="text-lg font-bold text-emerald-100">{summary.total_nodes}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider flex items-center gap-1">
                                    <Activity size={10} />
                                    Events
                                </div>
                                <div className="text-lg font-bold text-emerald-100">{summary.total_events}</div>
                            </div>
                        </div>

                        {/* Active Clusters */}
                        {synthesis.active_clusters !== undefined && (
                            <div className="space-y-1">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Active Clusters</div>
                                <div className="text-sm text-emerald-100">{synthesis.active_clusters}</div>
                            </div>
                        )}

                        {/* Top Risks */}
                        {synthesis.top_risks && synthesis.top_risks.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    Top Risks
                                </div>
                                <div className="space-y-2">
                                    {synthesis.top_risks.slice(0, 3).map((risk, idx) => (
                                        <div key={idx} className="p-2 rounded-lg bg-white/5 border border-white/5">
                                            <div className="text-xs text-emerald-100 truncate">{risk.title}</div>
                                            <div className="text-[10px] text-emerald-500/50 mt-1">
                                                Score: {risk.risk_score.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Insights */}
                        {synthesis.insights && synthesis.insights.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-wider">Insights</div>
                                <div className="space-y-1">
                                    {synthesis.insights.slice(0, 3).map((insight, idx) => (
                                        <div key={idx} className="text-xs text-emerald-100/80 leading-relaxed">
                                            • {insight}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Last Activity */}
                        <div className="pt-2 border-t border-white/5">
                            <div className="text-[10px] text-emerald-500/50">
                                Last activity: {new Date(summary.last_activity).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
