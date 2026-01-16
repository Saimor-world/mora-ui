"use client";

import React, { useEffect, useState, useCallback } from "react";
import { coreGet } from "@/lib/api/coreClient";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Clock, Zap, Mail, RefreshCw } from "lucide-react";

interface EventItem {
    id: number;
    created_at: string;
    event_type: string;
    source: string;
    intent: string | null;
    message_id: string | null;
}

interface EventsResponse {
    events: EventItem[];
    count: number;
    limit: number;
    timestamp: string;
}

/**
 * EventsViewer - Dev panel showing latest mindloop events
 * 
 * Toggle with Shift+E or programmatically
 * Shows: timestamp, event_type, source, intent, message_id
 */
export const EventsViewer: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [lastCheck, setLastCheck] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res: EventsResponse = await coreGet("/v1/operator/events?limit=25");
            if (res?.events) {
                setEvents(res.events);
                setLastCheck(res.timestamp);
            }
        } catch (err: any) {
            console.error("[EventsViewer] Error:", err);
            setError(err.message || "Failed to fetch events");
        } finally {
            setLoading(false);
        }
    }, []);

    // Keyboard shortcut: Shift+E
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key.toLowerCase() === "e") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Fetch on open
    useEffect(() => {
        if (isOpen) {
            fetchEvents();
        }
    }, [isOpen, fetchEvents]);

    // Auto-refresh every 10s when open
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(fetchEvents, 10000);
        return () => clearInterval(interval);
    }, [isOpen, fetchEvents]);

    const formatTime = (iso: string) => {
        try {
            const date = new Date(iso);
            return date.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
        } catch {
            return iso;
        }
    };

    const getSourceIcon = (source: string) => {
        switch (source) {
            case "email_commit":
                return <Mail className="w-3 h-3 text-blue-400" />;
            case "data_change":
                return <Zap className="w-3 h-3 text-orange-400" />;
            default:
                return <Activity className="w-3 h-3 text-emerald-400" />;
        }
    };

    if (!isOpen) {
        return (
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-36 right-6 z-40 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 hover:border-emerald-500/30 transition-colors"
                title="Open Events Viewer (Shift+E)"
            >
                <Activity className="w-4 h-4 text-emerald-400" />
            </motion.button>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="fixed right-4 bottom-4 top-4 w-[380px] z-50 bg-[#050a08]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-50">System Events</span>
                        <span className="text-[10px] text-emerald-500/60 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                            {events.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchEvents}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            title="Close (Shift+E)"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Last check timestamp */}
                {lastCheck && (
                    <div className="px-4 py-2 border-b border-white/5 bg-emerald-500/5">
                        <div className="flex items-center gap-2 text-[10px] text-emerald-500/60">
                            <Clock className="w-3 h-3" />
                            <span>Last check: {formatTime(lastCheck)}</span>
                            {loading && <span className="animate-pulse">•</span>}
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="px-4 py-3 bg-red-500/10 text-red-400 text-xs">
                        {error}
                    </div>
                )}

                {/* Events list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {events.length === 0 && !loading && (
                        <div className="text-center py-8 text-gray-500 text-xs">
                            No events found
                        </div>
                    )}

                    {events.map((event, i) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-3 mb-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {getSourceIcon(event.source)}
                                    <span className="text-[10px] font-medium text-emerald-50 uppercase tracking-wide">
                                        {event.event_type}
                                    </span>
                                </div>
                                <span className="text-[9px] text-gray-500 tabular-nums">
                                    {formatTime(event.created_at)}
                                </span>
                            </div>

                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                    {event.source}
                                </span>
                                {event.intent && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                        {event.intent}
                                    </span>
                                )}
                                {event.message_id && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 truncate max-w-[100px]">
                                        {event.message_id.slice(0, 12)}...
                                    </span>
                                )}
                            </div>

                            <div className="mt-1 text-[8px] text-gray-600">
                                ID: {event.id}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/10 text-[9px] text-gray-500">
                    Press <kbd className="px-1 py-0.5 bg-white/5 rounded mx-1">Shift+E</kbd> to toggle
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default EventsViewer;
