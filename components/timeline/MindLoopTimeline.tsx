"use client";

import React, { useEffect, useState, useCallback } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    Clock,
    Zap,
    Mail,
    RefreshCw,
    Brain,
    CheckCircle,
    AlertCircle,
    Hourglass,
    FileCheck,
    Search
} from "lucide-react";

/**
 * P0-4: MindLoop Timeline - Production Timeline Pane
 *
 * Shows the chain of events for MÔRA's cognitive loop:
 * - Thought: LLM reasoning
 * - Proposal: Proposed actions
 * - Pending: Awaiting confirmation
 * - Approved: User confirmed
 * - Executed: Action completed
 * - Result: Final outcome
 *
 * Based on EventsViewer but enhanced for production use.
 */

// Event types that map to MindLoop states
type MindLoopEventType =
    | "thought"
    | "proposal"
    | "pending"
    | "approved"
    | "rejected"
    | "executed"
    | "result"
    | "email_commit"
    | "data_change"
    | "file_upload"
    | "node_created"
    | "confirmation";

interface TimelineEvent {
    id: number | string;
    created_at: string;
    event_type: MindLoopEventType | string;
    source: string;
    intent: string | null;
    message_id: string | null;
    trace_id?: string;
    summary?: string;
    entity_type?: string;
    entity_id?: string;
}

interface TimelineResponse {
    events: TimelineEvent[];
    count: number;
    limit: number;
    timestamp: string;
}

interface Props {
    companyId?: string;
    maxEvents?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    compact?: boolean;
}

export const MindLoopTimeline: React.FC<Props> = ({
    companyId,
    maxEvents = 50,
    autoRefresh = true,
    refreshInterval = 10000,
    compact = false,
}) => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [lastCheck, setLastCheck] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);

    // P2: Optimistic Events (Ephemeral)
    interface OptimisticEvent extends TimelineEvent {
        pkg_status: 'executing' | 'failed' | 'complete';
    }
    const [optimisticEvents, setOptimisticEvents] = useState<OptimisticEvent[]>([]);

    useEffect(() => {
        const handleAgencyUpdate = (e: CustomEvent<any>) => {
            const detail = e.detail; // Types are in ActionRegistry, simple cast here

            if (detail.status === 'start') {
                const newEvent: OptimisticEvent = {
                    id: detail.actionId || detail.proposalId || `opt-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    event_type: detail.type === 'proposal' ? 'thought' : 'navigate', // Map to existing types
                    source: 'Optimistic',
                    intent: detail.intent,
                    message_id: detail.proposalId,
                    trace_id: detail.proposalId,
                    summary: detail.intent, // Use intent as summary
                    entity_type: detail.type,
                    pkg_status: 'executing'
                };

                setOptimisticEvents(prev => [newEvent, ...prev]);
            } else if (detail.status === 'complete' || detail.status === 'failed') {
                // Remove ephemeral event on completion (backend will provide persistent record)
                // Or mark as done briefly before removal?
                // Decision: Remove immediately to avoid duplication with real event coming via poll.
                const targetId = detail.actionId || detail.proposalId;
                setOptimisticEvents(prev => prev.filter(e => e.id !== targetId));
            }
        };

        window.addEventListener('mora:agency-update', handleAgencyUpdate as EventListener);
        return () => window.removeEventListener('mora:agency-update', handleAgencyUpdate as EventListener);
    }, []);

    const fetchEvents = useCallback(async () => {
        // ... (existing fetch logic) ...
        // ...


        setLoading(true);
        setError(null);
        try {
            // Try mindloop events first, fallback to operator events
            let url = `/v1/mindloop/events?limit=${maxEvents}`;
            if (companyId) {
                url += `&company_id=${companyId}`;
            }

            let res: TimelineResponse;
            try {
                res = await coreGet(url);
            } catch {
                // Fallback to operator events
                res = await coreGet(`/v1/operator/events?limit=${maxEvents}`);
            }

            if (res?.events) {
                setEvents(res.events);
                setLastCheck(res.timestamp || new Date().toISOString());
            }
        } catch (err: any) {
            console.error("[MindLoopTimeline] Error:", err);
            setError(err.message || "Failed to fetch events");
        } finally {
            setLoading(false);
        }
    }, [maxEvents, companyId]);

    // Initial fetch
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchEvents, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchEvents]);

    const formatTime = (iso: string) => {
        try {
            const date = new Date(iso);
            return date.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        } catch {
            return iso;
        }
    };

    const formatDate = (iso: string) => {
        try {
            const date = new Date(iso);
            return date.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
            });
        } catch {
            return "";
        }
    };

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case "thought":
                return <Brain className="w-3.5 h-3.5 text-purple-400" />;
            case "proposal":
                return <FileCheck className="w-3.5 h-3.5 text-blue-400" />;
            case "pending":
            case "confirmation":
                return <Hourglass className="w-3.5 h-3.5 text-yellow-400" />;
            case "approved":
                return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
            case "rejected":
                return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
            case "executed":
                return <Zap className="w-3.5 h-3.5 text-orange-400" />;
            case "result":
                return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
            case "email_commit":
                return <Mail className="w-3.5 h-3.5 text-blue-400" />;
            case "data_change":
            case "node_created":
                return <Zap className="w-3.5 h-3.5 text-orange-400" />;
            case "file_upload":
                return <FileCheck className="w-3.5 h-3.5 text-emerald-400" />;
            default:
                return <Activity className="w-3.5 h-3.5 text-gray-400" />;
        }
    };

    const getEventColor = (eventType: string) => {
        switch (eventType) {
            case "thought":
                return "border-l-purple-500";
            case "proposal":
                return "border-l-blue-500";
            case "pending":
            case "confirmation":
                return "border-l-yellow-500";
            case "approved":
                return "border-l-emerald-500";
            case "rejected":
                return "border-l-red-500";
            case "executed":
                return "border-l-orange-500";
            case "result":
                return "border-l-emerald-600";
            default:
                return "border-l-gray-500";
        }
    };

    const getEventLabel = (eventType: string) => {
        // P1-A: Semantic Mapping (Technical -> Business)
        const labels: Record<string, string> = {
            // Core States
            thought: "Analyzing Request",
            proposal: "Strategy Proposed",
            pending: "Awaiting Approval",
            confirmation: "Safety Check",
            approved: "Authorizing",
            rejected: "Action Declined",
            executed: "Completed",
            result: "Outcome Verified",

            // Data Actions
            email_commit: "Sending Correspondence",
            data_change: "Updating Records",
            file_upload: "Ingesting Document",
            node_created: "Knowledge Base Updated",

            // Tool/Action Mappings (Common)
            search_rag: "Recalling Company Memory",
            search_web: "External Research",
            navigate: "Refocusing View",
            read_document: "Analyzing Content",

            // Fallbacks
            navigate_department: "Focusing Department",
            navigate_space: "Entering Space",
            open_pane: "Opening Workspace"
        };
        return labels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // P2: Merge Optimistic + Real
    const allEvents = [...optimisticEvents, ...events];
    const filteredEvents = filterType
        ? allEvents.filter((e) => e.event_type === filterType)
        : allEvents;

    // Group events by trace_id for visual linking
    const traceIds = new Set(events.filter((e) => e.trace_id).map((e) => e.trace_id));

    return (
        <div className="h-full flex flex-col bg-[#050a08]/80 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-50">MindLoop Timeline</span>
                    <span className="text-[10px] text-emerald-500/60 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                        {filteredEvents.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchEvents}
                        disabled={loading}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`}
                        />
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                <button
                    onClick={() => setFilterType(null)}
                    className={`text-[10px] px-2 py-1 rounded-full transition-colors ${filterType === null
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                >
                    All
                </button>
                {["thought", "proposal", "pending", "approved", "executed", "result"].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`text-[10px] px-2 py-1 rounded-full transition-colors whitespace-nowrap ${filterType === type
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                            }`}
                    >
                        {getEventLabel(type)}
                    </button>
                ))}
            </div>

            {/* Last check timestamp */}
            {lastCheck && (
                <div className="px-4 py-2 border-b border-white/5 bg-emerald-500/5">
                    <div className="flex items-center gap-2 text-[10px] text-emerald-500/60">
                        <Clock className="w-3 h-3" />
                        <span>Last update: {formatTime(lastCheck)}</span>
                        {loading && <span className="animate-pulse">•</span>}
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="px-4 py-3 bg-red-500/10 text-red-400 text-xs">{error}</div>
            )}

            {/* Timeline Events */}
            <div className="flex-1 overflow-y-auto p-3">
                {filteredEvents.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500 text-xs flex flex-col items-center gap-2">
                        <Search className="w-6 h-6 opacity-30" />
                        <span>No events found</span>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {filteredEvents.map((event, i) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: i * 0.02 }}
                            className={`relative pl-4 pb-4 border-l-2 ${getEventColor(event.event_type)} ml-2`}
                        >
                            {/* Timeline dot */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#050a08] flex items-center justify-center">
                                {getEventIcon(event.event_type)}
                            </div>

                            {/* Event card */}
                            <div
                                className={`ml-2 p-3 rounded-xl border transition-colors group ${(event as OptimisticEvent).pkg_status === 'executing'
                                        ? 'bg-white/[0.04] border-white/10 animate-pulse' // P2 Polish: Subtle, neutral "thinking" state
                                        : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5'
                                    } ${compact ? "py-2" : ""}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-[10px] font-semibold uppercase tracking-wide ${event.event_type === "approved"
                                                ? "text-emerald-400"
                                                : event.event_type === "rejected"
                                                    ? "text-red-400"
                                                    : "text-emerald-50"
                                                }`}
                                        >
                                            {getEventLabel(event.event_type)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] text-gray-500 tabular-nums">
                                        <span>{formatDate(event.created_at)}</span>
                                        <span>{formatTime(event.created_at)}</span>
                                    </div>
                                </div>

                                {/* Summary or intent */}
                                {(event.summary || event.intent) && (
                                    <p className="mt-1.5 text-xs text-gray-300 line-clamp-2">
                                        {event.summary || event.intent}
                                    </p>
                                )}

                                {/* P1-A: Contextual Details (Technical info hidden by default) */}
                                <div className="mt-2 flex flex-col gap-2">
                                    {/* Primary Context (Always Visible) */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                            {event.source === 'system' ? 'Môra Core' : event.source}
                                        </span>
                                        {event.entity_type && event.entity_id && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                                                {event.entity_type}
                                            </span>
                                        )}
                                    </div>

                                    {/* Technical Details (On Hover/Focus) */}
                                    <div className="hidden group-hover:flex items-center gap-2 flex-wrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {event.trace_id && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
                                                #{event.trace_id.slice(0, 8)}
                                            </span>
                                        )}
                                        {event.message_id && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 truncate max-w-[80px]">
                                                msg:{event.message_id.slice(0, 8)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer - Trace ID summary */}
            {traceIds.size > 0 && (
                <div className="px-4 py-2 border-t border-white/10 text-[9px] text-gray-500">
                    {traceIds.size} active trace{traceIds.size > 1 ? "s" : ""} in view
                </div>
            )}
        </div>
    );
};

export default MindLoopTimeline;
