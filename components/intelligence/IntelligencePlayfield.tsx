"use client";

import React, { useEffect, useState } from 'react';
import { fetchSynthesis, runScan, type SynthesisResponse } from '@/lib/api/mindloopClient';
import { Brain, Sparkles, Activity, ArrowRight, Layers, FileText, Upload } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { toast } from '@/lib/toast';

export const IntelligencePlayfield: React.FC = () => {
    const { activeFolderId } = useMoraStore();
    const [synthesis, setSynthesis] = useState<SynthesisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchSynthesis();
                setSynthesis(data);
            } catch (e) {
                console.error("Failed to load synthesis", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
        // Poll every 15s (reduced frequency for performance)
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, [activeFolderId]);

    const handleGenerateReport = async () => {
        if (!activeFolderId) {
            toast.error("No folder selected. Please open a folder to generate a report.");
            return;
        }

        setIsGeneratingReport(true);
        try {
            const result = await runScan(activeFolderId);
            if (result?.report_node_id) {
                toast.success("Intelligence report generated successfully!");
                // Trigger tree reload to show new node
                const { loadTree, loadNodesForFolder } = useMoraStore.getState();
                await Promise.all([
                    loadTree(),
                    loadNodesForFolder(activeFolderId)
                ]);
            } else {
                toast.success("Intelligence scan completed.");
            }
        } catch (error: any) {
            console.error("Failed to generate report:", error);
            toast.error("Failed to generate intelligence report. Please try again.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleReviewUploads = async () => {
        toast.info("Upload review feature coming soon!");
        // Future: Navigate to recent uploads view or trigger upload analysis
    };

    return (
        <div className="w-full h-full bg-[#030806]/60 backdrop-blur-2xl border-l border-white/5 flex flex-col relative overflow-hidden transition-all duration-500">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-3/4 h-1/2 bg-emerald-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-mora-gold/5 blur-[100px] pointer-events-none" />

            {/* Header / Status Line */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-mora-gold animate-pulse relative z-10" />
                        <div className="absolute inset-0 bg-mora-gold/50 rounded-full blur-sm animate-ping" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-100/90 tracking-[0.2em] uppercase">
                        Môra Intelligence
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[9px] text-emerald-500/60 uppercase tracking-widest font-mono">
                    <div className="flex items-center gap-1.5">
                        <Activity size={10} />
                        <span>Active</span>
                    </div>
                </div>
            </div>

            {/* Main Playfield Content */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">

                {/* Section: Active Context */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-[0.2em] pl-1">
                        Neural Context
                    </h3>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 hover:border-emerald-500/20 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-mora-gold group-hover:scale-110 transition-transform duration-500">
                                <Brain size={18} />
                            </div>
                            <div>
                                <div className="text-sm text-emerald-50 font-medium mb-1 tracking-wide">
                                    {synthesis?.summary.risk_level === 'high' ? 'Attention Required' : 'System Nominal'}
                                </div>
                                <p className="text-xs text-emerald-100/50 leading-relaxed font-light">
                                    {isLoading ? "Analyzing neural patterns..." :
                                        (activeFolderId ? "Focused on local folder context." : "Monitoring global workspace state.")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Actions */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-[0.2em] pl-1">
                        Capabilities
                    </h3>
                    <div className="space-y-2">
                        {/* Generate Report Button */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={!activeFolderId || isGeneratingReport}
                            className="w-full relative overflow-hidden p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all group text-left"
                        >
                            <div className="absolute inset-0 bg-emerald-500/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out" />

                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {isGeneratingReport ? (
                                        <Activity size={16} className="text-mora-gold animate-spin" />
                                    ) : (
                                        <Sparkles size={16} className="text-emerald-400" />
                                    )}
                                    <span className="text-xs font-medium text-emerald-100 tracking-wide">
                                        {isGeneratingReport ? "Synthesizing..." : "Generate Intel Report"}
                                    </span>
                                </div>
                                {!isGeneratingReport && <ArrowRight size={14} className="text-emerald-500/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />}
                            </div>
                        </button>

                        {/* Review Uploads Button */}
                        <button
                            onClick={handleReviewUploads}
                            className="w-full p-4 rounded-xl bg-transparent border border-white/5 hover:bg-white/5 hover:border-white/10 cursor-pointer transition-all group text-left flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <Upload size={16} className="text-blue-400/80" />
                                <span className="text-xs font-medium text-emerald-100/80 tracking-wide">Review Uploads</span>
                            </div>
                            <ArrowRight size={14} className="text-emerald-500/30 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>

                    {!activeFolderId && (
                        <div className="px-4 py-3 rounded-lg bg-mora-gold/5 border border-mora-gold/10 flex items-center gap-3">
                            <div className="w-1 h-1 rounded-full bg-mora-gold animate-pulse" />
                            <p className="text-[10px] text-mora-gold/70 font-medium tracking-wide">
                                Select a folder to enable actions
                            </p>
                        </div>
                    )}
                </div>

                {/* Section: Metrics */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-[0.2em] pl-1">
                        System Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 group hover:bg-white/10 transition-colors">
                            <div className="text-2xl font-light text-emerald-50 group-hover:scale-110 transition-transform duration-300">
                                {synthesis?.summary.total_nodes || 0}
                            </div>
                            <div className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest">Nodes</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-1 group hover:bg-white/10 transition-colors">
                            <div className="text-2xl font-light text-emerald-50 group-hover:scale-110 transition-transform duration-300">
                                {synthesis?.summary.total_events || 0}
                            </div>
                            <div className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-widest">Events</div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Status Bar */}
            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-2 text-[10px] text-emerald-500/30 font-mono">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                    <span>MÔRA NEURAL CORE V3.0</span>
                </div>
            </div>
        </div>
    );
};
