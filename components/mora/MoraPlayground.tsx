"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { useMoraStore } from "@/lib/store/moraState";
import { usePaneStore } from "@/lib/store/paneStore";
import { useHilToggle } from "@/lib/hooks/useHilToggle";
import MoraUpdatesFeed from "./MoraUpdatesFeed";
import { PlasmaOrb } from "./PlasmaOrb";

type FeedScope = "company" | "department";

interface MoraPlaygroundProps {
    scope: FeedScope;
    title?: string;
    compact?: boolean;
    className?: string;
}

const getOrbColor = (state: string, viewMode?: string) => {
    if (state === "alert") return "#ef4444";
    if (state === "thinking") return "#60a5fa";
    if (state === "focus") return "#22c55e";
    if (viewMode === "demo") return "#22d3ee";
    return "#34d399";
};

export const MoraPlayground: React.FC<MoraPlaygroundProps> = ({
    scope,
    title = "Mora Hub",
    compact = false,
    className
}) => {
    const orbState = useMoraStore((s) => s.orbState);
    const viewMode = useMoraStore((s) => s.viewMode);
    const { hilEnabled, setHilEnabled } = useHilToggle();
    const { openPane, getPane, minimizePane } = usePaneStore();
    const orbColor = getOrbColor(orbState, viewMode);

    const openChat = () => {
        openPane({
            id: "chat-main",
            type: "chat",
            title: "Mora",
            size: { width: 520, height: 700 }
        });
    };

    const openFinder = (showUpload?: boolean) => {
        openPane({
            id: "finder-main",
            type: "finder",
            title: "Finder",
            size: { width: 1200, height: 780 },
            data: showUpload ? { showUpload: true } : undefined
        });
        const hub = getPane("mora-hub");
        if (hub && !hub.minimized) {
            minimizePane("mora-hub");
        }
    };

    const openTeam = () => {
        openPane({
            id: "team-main",
            type: "team",
            title: "Team",
            size: { width: 840, height: 640 }
        });
    };

    const openSearch = () => {
        openPane({
            id: "search-main",
            type: "search",
            title: "Search",
            size: { width: 720, height: 520 }
        });
    };

    const openNotes = () => {
        openPane({
            id: "notes-main",
            type: "notes",
            title: "Notes",
            size: { width: 720, height: 560 }
        });
    };

    return (
        <div
            className={`flex h-full flex-col rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl ${compact ? "p-3" : "p-4"} ${className ?? ""}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-emerald-50">{title}</span>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/70">
                            Gedankenkern
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setHilEnabled(!hilEnabled)}
                    className={`text-[9px] px-2 py-1 rounded-full transition-colors ${hilEnabled
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                    title="Human-in-the-loop toggle"
                >
                    {hilEnabled ? "Apply w/ Confirm" : "Auto Apply"}
                </button>
            </div>

            <div className={`mt-3 flex flex-1 min-h-0 ${compact ? "flex-col" : "gap-3"}`}>
                <div className={`flex flex-col gap-3 ${compact ? "" : "w-[45%]"}`}>
                    <div className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] ${compact ? "p-3" : "p-4"}`}>
                        <button
                            type="button"
                            onClick={openChat}
                            className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                            title="Chat mit Mora oeffnen"
                        >
                            <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur-xl" />
                            <PlasmaOrb color={orbColor} state={orbState as any} size={compact ? 68 : 88} />
                        </button>
                        <div className="flex flex-1 flex-col gap-1">
                            <span className="text-xs uppercase tracking-[0.2em] text-white/40">Mora Status</span>
                            <span className="text-sm text-white/80">
                                {orbState === "thinking" ? "Analyzing signals" : orbState === "alert" ? "Attention needed" : "Listening & guiding"}
                            </span>
                            <span className="text-[10px] text-emerald-300/80">
                                Cursor-Arm aktiv - Fokus auf Kontext
                            </span>
                        </div>
                    </div>

                    <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
                        <button
                            onClick={openChat}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => openFinder(false)}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                        >
                            Finder
                        </button>
                        <button
                            onClick={() => openFinder(true)}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                        >
                            Upload
                        </button>
                        <button
                            onClick={openSearch}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                        >
                            Suche
                        </button>
                        <button
                            onClick={openTeam}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                        >
                            Team
                        </button>
                        <button
                            onClick={openNotes}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                        >
                            Notes
                        </button>
                    </div>
                </div>

                <div className={`flex-1 min-h-0 rounded-2xl border border-white/10 bg-black/30 ${compact ? "mt-3" : ""} p-3 flex flex-col`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/70">Was gibt es Neues?</span>
                        <span className="text-[9px] text-white/30">Scope: {scope}</span>
                    </div>
                    <div className="mt-2 flex-1 min-h-0">
                        <MoraUpdatesFeed
                            scope={scope}
                            title="Was gibt es Neues?"
                            maxEvents={compact ? 5 : 8}
                            compact
                            showHeader={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoraPlayground;
