"use client";

/**
 * MindLoopTimeline
 *
 * A live-updating event feed that surfaces Mora's intelligence signals:
 * awareness, semantic clusters, risk detections, context shifts, and more.
 *
 * Features:
 * - Real-time polling (every 10s)
 * - Color-coded signal types
 * - Animated entry per event
 * - Compact / expanded modes
 */

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain,
    AlertTriangle,
    Layers,
    Zap,
    Eye,
    Link2,
    FilePlus,
    Edit3,
    Trash2,
    GitMerge,
    RefreshCw,
} from "lucide-react";
import { coreGet } from "@/lib/api/coreClient";

// ─── Types ───────────────────────────────────────────────────────────────────

type SignalType =
    | "awareness"
    | "semantic"
    | "risk"
    | "context_shift"
    | "cluster"
    | "create"
    | "edit"
    | "view"
    | "delete"
    | "link";

interface TimelineEvent {
    id: string;
    event_type: string;
    source?: string;
    signal_type?: SignalType;
    description?: string;
    entity_type?: string;
    entity_id?: string;
    severity?: number;
    created_at: string;
    payload?: Record<string, unknown>;
}

export interface MindLoopTimelineProps {
    /** Max events to display (default 15) */
    limit?: number;
    /** Polling interval in ms (default 10000) */
    pollInterval?: number;
    /** Compact single-line mode */
    compact?: boolean;
    /** Extra className for the container */
    className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG: Record<
    SignalType | "default",
    { icon: React.FC<any>; color: string; label: string; bg: string }
> = {
    awareness: {
        icon: Eye,
        color: "text-cyan-400",
        bg: "bg-cyan-500/10 border-cyan-500/20",
        label: "Awareness",
    },
    semantic: {
        icon: GitMerge,
        color: "text-purple-400",
        bg: "bg-purple-500/10 border-purple-500/20",
        label: "Semantik",
    },
    risk: {
        icon: AlertTriangle,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
        label: "Risiko",
    },
    context_shift: {
        icon: Zap,
        color: "text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/20",
        label: "Kontextwechsel",
    },
    cluster: {
        icon: Layers,
        color: "text-indigo-400",
        bg: "bg-indigo-500/10 border-indigo-500/20",
        label: "Cluster",
    },
    create: {
        icon: FilePlus,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        label: "Erstellt",
    },
    edit: {
        icon: Edit3,
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        label: "Bearbeitet",
    },
    view: {
        icon: Eye,
        color: "text-white/40",
        bg: "bg-white/5 border-white/10",
        label: "Angesehen",
    },
    delete: {
        icon: Trash2,
        color: "text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20",
        label: "Gelöscht",
    },
    link: {
        icon: Link2,
        color: "text-teal-400",
        bg: "bg-teal-500/10 border-teal-500/20",
        label: "Verknüpft",
    },
    default: {
        icon: Brain,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        label: "Signal",
    },
};

function resolveConfig(event: TimelineEvent) {
    const key =
        (event.signal_type as SignalType) ||
        (event.event_type as SignalType) ||
        "default";
    return SIGNAL_CONFIG[key] ?? SIGNAL_CONFIG.default;
}

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${Math.floor(hours / 24)} Tagen`;
}

function eventLabel(event: TimelineEvent): string {
    if (event.description) return event.description;
    const cfg = resolveConfig(event);
    const entity = event.entity_type ?? event.source ?? "";
    return entity ? `${cfg.label}: ${entity}` : cfg.label;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MindLoopTimeline({
    limit = 15,
    pollInterval = 10_000,
    compact = false,
    className = "",
}: MindLoopTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchEvents = useCallback(async () => {
        try {
            const data = await coreGet(
                `/v1/mindloop/events?limit=${limit}&order=desc`
            );
            if (data?.events) {
                setEvents(data.events as TimelineEvent[]);
                setLastRefresh(new Date());
                setError(null);
            }
        } catch (err) {
            setError("Verbindung fehlgeschlagen");
        } finally {
            setLoading(false);
        }
    }, [limit]);

    // Initial load + polling
    useEffect(() => {
        fetchEvents();
        const id = setInterval(fetchEvents, pollInterval);
        return () => clearInterval(id);
    }, [fetchEvents, pollInterval]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center py-8 ${className}`}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                    <Brain className="w-6 h-6 text-emerald-400/60" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase tracking-wider">
                    <Brain size={10} />
                    <span>Mind Loop</span>
                    {error && (
                        <span className="text-red-400/60 ml-1">· {error}</span>
                    )}
                </div>
                <button
                    onClick={() => { setLoading(true); fetchEvents(); }}
                    className="text-white/20 hover:text-white/50 transition-colors"
                    title="Aktualisieren"
                >
                    <RefreshCw size={10} />
                </button>
            </div>

            {/* Event list */}
            <AnimatePresence initial={false}>
                {events.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-6 text-white/20 text-xs"
                    >
                        Keine Events — Mora beobachtet...
                    </motion.div>
                ) : (
                    events.map((event, i) => {
                        const cfg = resolveConfig(event);
                        const Icon = cfg.icon;
                        const label = eventLabel(event);
                        const time = formatRelativeTime(event.created_at);

                        return (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                transition={{ delay: i * 0.03, duration: 0.2 }}
                            >
                                {compact ? (
                                    /* ── Compact row ── */
                                    <div
                                        className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${cfg.bg} transition-colors hover:brightness-125`}
                                    >
                                        <Icon size={11} className={`shrink-0 ${cfg.color}`} />
                                        <span className="flex-1 text-[11px] text-white/70 truncate">
                                            {label}
                                        </span>
                                        <span className="text-[10px] text-white/25 shrink-0">
                                            {time}
                                        </span>
                                    </div>
                                ) : (
                                    /* ── Full card ── */
                                    <div
                                        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${cfg.bg} transition-all hover:brightness-125 cursor-default group`}
                                    >
                                        {/* Icon badge */}
                                        <div
                                            className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.bg}`}
                                        >
                                            <Icon size={13} className={cfg.color} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white/80 leading-snug truncate group-hover:text-white transition-colors">
                                                {label}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span
                                                    className={`text-[9px] font-medium uppercase tracking-wide ${cfg.color}`}
                                                >
                                                    {cfg.label}
                                                </span>
                                                {event.severity != null && (
                                                    <>
                                                        <span className="text-white/10">·</span>
                                                        <span className="text-[9px] text-white/30">
                                                            Severity {(event.severity * 100).toFixed(0)}%
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Timestamp */}
                                        <span className="text-[10px] text-white/25 shrink-0 mt-0.5">
                                            {time}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </AnimatePresence>
        </div>
    );
}

export default MindLoopTimeline;
