"use client";

import React, { useMemo, useState } from "react";
import {
    Sparkles,
    MessageCircle,
    FolderOpen,
    Upload,
    Search,
    Users,
    StickyNote,
    Settings,
    Brain,
    Waves,
    Eye,
    Zap,
    Shield,
    Activity,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useMoraStore } from "@/lib/store/moraState";
import { usePaneStore } from "@/lib/store/paneStore";
import { useHilToggle } from "@/lib/hooks/useHilToggle";
import MoraUpdatesFeed from "./MoraUpdatesFeed";
import { PlasmaOrb } from "./PlasmaOrb";
import { MoraMemory } from "./MoraMemory";

type FeedScope = "company" | "department";

interface MoraPlaygroundProps {
    scope: FeedScope;
    title?: string;
    compact?: boolean;
    className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORB STATE → Dynamic Status Config
// ═══════════════════════════════════════════════════════════════════════════
const ORB_CONFIG: Record<string, {
    color: string;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    glowClass: string;
}> = {
    idle: {
        color: "#34d399",
        label: "Bereit",
        sublabel: "Warte auf Kontext",
        icon: Waves,
        glowClass: "shadow-emerald-500/20",
    },
    thinking: {
        color: "#60a5fa",
        label: "Analysiere",
        sublabel: "Signale werden verarbeitet",
        icon: Brain,
        glowClass: "shadow-blue-500/20",
    },
    watch: {
        color: "#a78bfa",
        label: "Beobachte",
        sublabel: "Sektor wird gescannt",
        icon: Eye,
        glowClass: "shadow-violet-500/20",
    },
    focus: {
        color: "#22c55e",
        label: "Fokus",
        sublabel: "Deep Dive aktiv",
        icon: Zap,
        glowClass: "shadow-green-500/20",
    },
    alert: {
        color: "#ef4444",
        label: "Achtung",
        sublabel: "Aktion erforderlich",
        icon: Shield,
        glowClass: "shadow-red-500/20",
    },
};

const getOrbConfig = (state: string, viewMode?: string) => {
    if (viewMode === "demo") {
        return {
            ...ORB_CONFIG.idle,
            color: "#22d3ee",
            label: "Demo",
            sublabel: "Sandbox aktiv",
            glowClass: "shadow-cyan-500/20",
        };
    }
    return ORB_CONFIG[state] || ORB_CONFIG.idle;
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════════════════
interface ActionDef {
    id: string;
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    color: string;
    onClick: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSE STATS GRID (merged from IntelligenceDashboard)
// ═══════════════════════════════════════════════════════════════════════════
const UniverseStatsGrid: React.FC = () => {
    const departments = useMoraStore((s) => s.departments);
    const spacesByDepartment = useMoraStore((s) => s.spacesByDepartment);
    const foldersBySpace = useMoraStore((s) => s.foldersBySpace);
    const nodesByFolder = useMoraStore((s) => s.nodesByFolder);

    const planetCount = departments.length;
    const spaceCount = Object.values(spacesByDepartment).flat().length;
    const nebulaCount = Object.values(foldersBySpace).flat().length;
    const starCount = Object.values(nodesByFolder).flat().length;

    const stats = [
        { label: "Planeten", count: planetCount, color: "emerald" },
        { label: "Monde", count: spaceCount, color: "blue" },
        { label: "Nebel", count: nebulaCount, color: "violet" },
        { label: "Sterne", count: starCount, color: "amber" },
    ];

    const colorClasses: Record<string, string> = {
        emerald: "text-emerald-400",
        blue: "text-blue-400",
        violet: "text-violet-400",
        amber: "text-amber-400",
    };

    return (
        <div className="grid grid-cols-4 gap-1.5">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.04] hover:bg-white/[0.06] transition-colors"
                >
                    <div className={`text-lg font-light ${colorClasses[stat.color]}`}>
                        {stat.count}
                    </div>
                    <div className="text-[8px] text-white/30 uppercase tracking-wider mt-0.5">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const MoraPlayground: React.FC<MoraPlaygroundProps> = ({
    scope,
    title = "Mora Nexus",
    compact = false,
    className,
}) => {
    const orbState = useMoraStore((s) => s.orbState);
    const viewMode = useMoraStore((s) => s.viewMode);
    const viewLevel = useMoraStore((s) => s.viewLevel);
    const cursorAgent = useMoraStore((s) => s.cursorAgent);
    const departments = useMoraStore((s) => s.departments);
    const activeDepartmentId = useMoraStore((s) => s.activeDepartmentId);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const { hilEnabled, setHilEnabled } = useHilToggle();
    const { openPane, getPane, minimizePane } = usePaneStore();
    const [showMemory, setShowMemory] = useState(false);

    const orbConfig = getOrbConfig(orbState, viewMode);
    const StatusIcon = orbConfig.icon;

    // Dynamic context line
    const contextLine = useMemo(() => {
        const dept = departments.find((d) => d.id === activeDepartmentId);
        if (viewLevel === "folder") return dept ? `${dept.name} › Deep Dive` : "Deep Dive";
        if (viewLevel === "space") return dept ? `${dept.name} › Sektor` : "Sektor";
        if (viewLevel === "department") return dept?.name || "Department";
        return viewMode === "demo" ? "Sandbox" : "Universe";
    }, [viewLevel, viewMode, departments, activeDepartmentId]);

    // Cursor Agent status
    const agentStatus = useMemo(() => {
        if (!cursorAgent.active) return null;
        const labels: Record<string, string> = {
            idle: "Standby",
            highlight: "Markiert Ziel",
            point: "Zeigt Kontext",
            roam: "Scannt Umgebung",
        };
        return labels[cursorAgent.action] || "Aktiv";
    }, [cursorAgent]);

    // ─── Pane Openers ───
    const openChat = () => {
        openPane({ id: "chat-main", type: "chat", title: "Mora", size: { width: 520, height: 700 } });
    };

    const openFinder = (showUpload?: boolean) => {
        openPane({
            id: "finder-main",
            type: "finder",
            title: "Finder",
            size: { width: 1200, height: 780 },
            data: showUpload ? { showUpload: true } : undefined,
        });
        const hub = getPane("mora-hub");
        if (hub && !hub.minimized) minimizePane("mora-hub");
    };

    const openTeam = () => {
        openPane({ id: "team-main", type: "team", title: "Team", size: { width: 840, height: 640 } });
    };

    const openSearch = () => {
        openPane({ id: "search-main", type: "search", title: "Search", size: { width: 720, height: 520 } });
    };

    const openNotes = () => {
        openPane({ id: "notes-main", type: "notes", title: "Notes", size: { width: 720, height: 560 } });
    };

    const openSettings = () => {
        openPane({ id: "settings-main", type: "settings", title: "Settings", size: { width: 720, height: 640 } });
    };

    // ─── Actions Grid ───
    const actions: ActionDef[] = [
        { id: "chat", label: "Chat", icon: MessageCircle, shortcut: "C", color: "emerald", onClick: openChat },
        { id: "finder", label: "Finder", icon: FolderOpen, shortcut: "F", color: "blue", onClick: () => openFinder(false) },
        { id: "upload", label: "Upload", icon: Upload, color: "violet", onClick: () => openFinder(true) },
        { id: "search", label: "Suche", icon: Search, shortcut: "S", color: "amber", onClick: openSearch },
        { id: "team", label: "Team", icon: Users, color: "pink", onClick: openTeam },
        { id: "notes", label: "Notes", icon: StickyNote, shortcut: "N", color: "cyan", onClick: openNotes },
    ];

    // Color map for tailwind classes
    const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
        emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", glow: "hover:shadow-emerald-500/20" },
        blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-300", glow: "hover:shadow-blue-500/20" },
        violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-300", glow: "hover:shadow-violet-500/20" },
        amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", glow: "hover:shadow-amber-500/20" },
        pink: { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-300", glow: "hover:shadow-pink-500/20" },
        cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-300", glow: "hover:shadow-cyan-500/20" },
    };

    return (
        <div
            className={`flex h-full flex-col rounded-2xl border border-white/[0.06] bg-gradient-to-b from-black/50 to-black/30 backdrop-blur-xl shadow-2xl overflow-hidden ${className ?? ""}`}
        >
            {/* ═══ HEADER ═══ */}
            <div className={`flex items-center justify-between gap-3 border-b border-white/[0.06] ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white/90 tracking-wide">{title}</span>
                        <span className="text-[9px] uppercase tracking-[0.25em] text-white/30">
                            {contextLine}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setHilEnabled(!hilEnabled)}
                        className={`text-[9px] px-2.5 py-1 rounded-full border transition-all duration-300 ${
                            hilEnabled
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                : "bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/[0.06]"
                        }`}
                        title="Human-in-the-loop toggle"
                    >
                        {hilEnabled ? "⚡ Confirm" : "Auto"}
                    </button>
                    <button
                        onClick={openSettings}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                        title="Settings"
                    >
                        <Settings className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div className={`flex flex-1 min-h-0 ${compact ? "flex-col" : "flex-row"}`}>
                {/* ─── LEFT: Orb + Actions ─── */}
                <div className={`flex flex-col ${compact ? "" : "w-[44%] border-r border-white/[0.06]"}`}>
                    {/* Orb Section */}
                    <div className={`flex items-center gap-3 ${compact ? "p-3" : "p-4"}`}>
                        <button
                            type="button"
                            onClick={openChat}
                            className={`relative rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-shadow duration-500 ${orbConfig.glowClass}`}
                            title="Chat mit Mora"
                        >
                            <PlasmaOrb
                                color={orbConfig.color}
                                state={orbState as any}
                                size={compact ? 64 : 80}
                            />
                        </button>
                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <StatusIcon className="h-3 w-3 flex-shrink-0" style={{ color: orbConfig.color }} />
                                <span className="text-xs font-medium text-white/90 truncate">
                                    {orbConfig.label}
                                </span>
                            </div>
                            <span className="text-[10px] text-white/40 truncate">
                                {orbConfig.sublabel}
                            </span>
                            {agentStatus && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <div className="h-1 w-1 rounded-full bg-violet-400 animate-pulse" />
                                    <span className="text-[9px] text-violet-300/70">
                                        Agent: {agentStatus}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Universe Stats (from IntelligenceDashboard) ─── */}
                    {!compact && (
                        <div className="px-4 pb-3">
                            <div className="text-[9px] uppercase tracking-[0.3em] text-white/20 mb-2">
                                Universe Übersicht
                            </div>
                            <UniverseStatsGrid />
                        </div>
                    )}

                    {/* ─── Quick Actions ─── */}
                    <div className={`flex-1 ${compact ? "px-3 pb-3" : "px-4 pb-4"}`}>
                        <div className="text-[9px] uppercase tracking-[0.3em] text-white/20 mb-2">
                            Quick Actions
                        </div>
                        <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-2"} gap-1.5`}>
                            {actions.map((action) => {
                                const c = colorMap[action.color] || colorMap.emerald;
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.id}
                                        onClick={action.onClick}
                                        className={`group relative flex items-center gap-2 rounded-xl border ${c.border} ${c.bg} px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.08] hover:shadow-lg ${c.glow} hover:scale-[1.02] active:scale-[0.98]`}
                                    >
                                        <Icon className={`h-3.5 w-3.5 ${c.text} transition-transform group-hover:scale-110`} />
                                        <span className="text-[11px] text-white/80 font-medium">
                                            {action.label}
                                        </span>
                                        {action.shortcut && (
                                            <span className="ml-auto text-[8px] text-white/20 font-mono bg-white/[0.04] px-1 py-0.5 rounded">
                                                {action.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT: Activity Feed ─── */}
                <div className={`flex-1 min-h-0 flex flex-col ${compact ? "border-t border-white/[0.06]" : ""}`}>
                    <div className={`flex items-center justify-between ${compact ? "px-3 pt-2" : "px-4 pt-3"}`}>
                        <div className="flex items-center gap-1.5">
                            <Activity className="h-3 w-3 text-emerald-400/60" />
                            <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                                Live Feed
                            </span>
                        </div>
                        <span className="text-[9px] text-white/20">
                            {scope === "department" ? "Sektor" : "Global"}
                        </span>
                    </div>
                    <div className={`flex-1 min-h-0 ${compact ? "p-2" : "p-3"}`}>
                        <MoraUpdatesFeed
                            scope={scope}
                            title="Activity"
                            maxEvents={compact ? 4 : (showMemory ? 3 : 6)}
                            compact
                            showHeader={false}
                            showHilToggle={false}
                        />
                    </div>

                    {/* ─── Memory Section (Collapsible) ─── */}
                    {!compact && (
                        <div className="border-t border-white/[0.06]">
                            <button
                                onClick={() => setShowMemory(!showMemory)}
                                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-1.5">
                                    <Brain className="h-3 w-3 text-violet-400/60" />
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                                        Gedächtnis
                                    </span>
                                </div>
                                {showMemory ? (
                                    <ChevronUp className="h-3 w-3 text-white/20" />
                                ) : (
                                    <ChevronDown className="h-3 w-3 text-white/20" />
                                )}
                            </button>
                            {showMemory && (
                                <div className="px-4 pb-3">
                                    <MoraMemory compact showStats={false} companyId={activeCompanyId} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ FOOTER: Status Bar ═══ */}
            <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div
                            className="h-1.5 w-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: orbConfig.color }}
                        />
                        <span className="text-[8px] text-white/25 font-mono uppercase">
                            {orbState}
                        </span>
                    </div>
                    {cursorAgent.active && (
                        <span className="text-[8px] text-violet-400/40 font-mono">
                            AGENT
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[8px] text-white/15 font-mono">
                        HIL:{hilEnabled ? "ON" : "OFF"}
                    </span>
                    <span className="text-[8px] text-white/15 font-mono">
                        {viewMode.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MoraPlayground;
