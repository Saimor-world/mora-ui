"use client";

import React, { useEffect, useState } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { Activity, Database, Brain, Zap, Shield, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OperatorStatus {
    timestamp: string;
    database: {
        total_nodes: number;
        total_events: number;
        total_folders: number;
    };
    events: {
        by_type: Record<string, number>;
        total: number;
    };
    promoted_nodes: {
        by_type: Record<string, number>;
        total: number;
    };
    scan_info: {
        last_scan_timestamp: string | null;
        last_scan_type: string | null;
        rate_limit_minutes: number;
    };
    detectors: {
        context_shift: { total_detected: number; last_run_result: string };
        potential_risk: { total_detected: number; last_run_result: string };
        related_objects_cluster: { total_detected: number };
    };
    embedding: {
        enabled: boolean;
        mode: string;
    };
    heartbeat?: {
        last_check_at: string;
        status: string;
        message: string;
    };
}

export const OperatorStatusPane: React.FC = () => {
    const [data, setData] = useState<OperatorStatus | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // Poll for status
    const fetchStatus = async () => {
        setLoading(true);
        try {
            const json = await coreGet("/v3/operator/status", { isOptional: true });
            if (json) {
                setData(json);
                setIsVisible(true);
            } else {
                // Hide if 403/404/500 (not in dev mode or not available)
                setIsVisible(false);
            }
        } catch (e) {
            // Silent fail - operator pane is optional developer UI
            // Don't spam console with network errors
            setIsVisible(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    if (!isVisible || !data) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#050d0a]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden text-xs text-emerald-50/80 font-mono w-80"
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-3 py-2 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" />
                        <span className="font-semibold text-emerald-400">INTELLIGENCE STATUS</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className={`p-1 hover:bg-white/10 rounded-full transition-all ${loading ? 'animate-spin' : ''}`}
                            onClick={(e) => { e.stopPropagation(); fetchStatus(); }}
                            title="Refresh Stats"
                        >
                            <RefreshCw size={12} />
                        </button>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="border-t border-white/10"
                        >
                            <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">

                                {/* 1. Database Stats */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                        <Database size={10} />
                                        <span className="uppercase tracking-wider text-[10px]">Database State</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 p-1.5 rounded border border-white/5">
                                            <div className="text-white">Dokumente</div>
                                            <div className="text-lg font-bold text-white">{data.database.total_nodes}</div>
                                        </div>
                                        <div className="bg-white/5 p-1.5 rounded border border-white/5">
                                            <div className="text-white">Events</div>
                                            <div className="text-lg font-bold text-white">{data.database.total_events}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Scan Info */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                        <Zap size={10} />
                                        <span className="uppercase tracking-wider text-[10px]">Intelligence Scan</span>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded border border-white/5 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Results found:</span>
                                            <span className="text-emerald-300">
                                                {data.scan_info.last_scan_timestamp
                                                    ? new Date(data.scan_info.last_scan_timestamp).toLocaleTimeString()
                                                    : 'None yet'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-white/40 italic">
                                            <span>
                                                {data.heartbeat
                                                    ? `System checked ${new Date(data.heartbeat.last_check_at).toLocaleTimeString()}`
                                                    : 'Syncing...'}
                                            </span>
                                            {data.heartbeat?.message && (
                                                <span className="text-right">{data.heartbeat.message}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Detectors */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                        <Shield size={10} />
                                        <span className="uppercase tracking-wider text-[10px]">Detectors</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {/* Clusters */}
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span>CLUSTERS</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/60">{data.detectors.related_objects_cluster.total_detected} total</span>
                                            </div>
                                        </div>
                                        {/* Context Shift */}
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span>CONTEXT SHIFT</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/60">{data.detectors.context_shift.last_run_result}</span>
                                            </div>
                                        </div>
                                        {/* Risk */}
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span>RISK SCAN</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/60">{data.detectors.potential_risk.last_run_result}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Promoted Documents (Impact) */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                        <Brain size={10} />
                                        <span className="uppercase tracking-wider text-[10px]">Intelligence Impact</span>
                                    </div>
                                    <div className="bg-emerald-900/10 p-2 rounded border border-emerald-500/20">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-emerald-400 font-bold">PROMOTED DOCUMENTS</span>
                                            <span className="text-emerald-300 font-mono text-lg">{data.promoted_nodes.total}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(data.promoted_nodes.by_type || {}).map(([type, count]) => (
                                                <span key={type} className="px-1.5 py-0.5 bg-emerald-500/10 rounded text-[9px] text-emerald-300 border border-emerald-500/10">
                                                    {type.replace('_', ' ')}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Embedding Status */}
                                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                                    <span className="text-white/40">EMBEDDING MODE</span>
                                    <span className={`px-1.5 py-0.5 rounded border ${data.embedding.mode === 'LIVE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {data.embedding.mode}
                                    </span>
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
