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
        <div className="w-full h-full bg-[#050f0a]/80 backdrop-blur-xl border-t border-white/5 flex flex-col relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/4 w-1/2 h-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

            {/* Header / Status Line */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-mora-gold animate-pulse" />
                    <span className="text-xs font-medium text-emerald-100/70 tracking-widest uppercase">
                        Môra Intelligence Field
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-emerald-500/50 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <Activity size={12} />
                        <span>System Active</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Layers size={12} />
                        <span>Context: {activeFolderId ? 'Folder Focused' : 'Global'}</span>
                    </div>
                </div>
            </div>

            {/* Main Playfield Content */}
            <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">

                {/* Left: Context / Synthesis */}
                <div className="col-span-4 space-y-4">
                    <h3 className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-2">
                        Active Context
                    </h3>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                        <div className="flex items-start gap-3">
                            <Brain className="text-mora-gold mt-1 group-hover:scale-110 transition-transform" size={16} />
                            <div>
                                <div className="text-sm text-emerald-100 font-medium mb-1">
                                    {synthesis?.summary.risk_level === 'high' ? 'Attention Required' : 'System Nominal'}
                                </div>
                                <p className="text-xs text-emerald-100/60 leading-relaxed">
                                    {isLoading ? "Analyzing current context patterns..." :
                                        (synthesis?.summary.risk_level === 'high' ? 'Attention Required' : 'System Nominal')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Action Stream / Suggestions */}
                <div className="col-span-5 space-y-4">
                    <h3 className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-2">
                        Suggested Actions
                    </h3>
                    <div className="space-y-2">
                        {/* Generate Intelligence Report */}
                        <button
                            onClick={handleGenerateReport}
                            disabled={!activeFolderId || isGeneratingReport}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                {isGeneratingReport ? (
                                    <Activity size={14} className="text-mora-gold animate-spin" />
                                ) : (
                                    <FileText size={14} className="text-emerald-400" />
                                )}
                                <span className="text-xs text-emerald-100">
                                    {isGeneratingReport ? "Generating Report..." : "Generate Intelligence Report"}
                                </span>
                            </div>
                            {!isGeneratingReport && <ArrowRight size={12} className="text-emerald-500/50 group-hover:translate-x-1 transition-transform" />}
                        </button>

                        {/* Review Recent Uploads */}
                        <button
                            onClick={handleReviewUploads}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <Upload size={14} className="text-blue-400" />
                                <span className="text-xs text-emerald-100">Review Recent Uploads</span>
                            </div>
                            <ArrowRight size={12} className="text-emerald-500/50 group-hover:translate-x-1 transition-transform" />
                        </button>

                        {/* Show context hint if no folder selected */}
                        {!activeFolderId && (
                            <div className="p-3 rounded-lg bg-mora-gold/5 border border-mora-gold/20">
                                <p className="text-[10px] text-mora-gold/70 leading-relaxed">
                                    💡 Open a folder to enable intelligence actions
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Metrics / Visuals */}
                <div className="col-span-3 space-y-4">
                    <h3 className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-2">
                        Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                            <div className="text-lg font-bold text-emerald-100">{synthesis?.summary.total_nodes || 0}</div>
                            <div className="text-[10px] text-emerald-500/60 uppercase">Nodes</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center">
                            <div className="text-lg font-bold text-emerald-100">{synthesis?.summary.total_events || 0}</div>
                            <div className="text-[10px] text-emerald-500/60 uppercase">Events</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
