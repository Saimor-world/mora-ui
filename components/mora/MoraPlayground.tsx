"use client";

import React, { useMemo } from "react";
import {
    MessageCircle,
    FolderOpen,
    Upload,
    Search,
    Users,
    StickyNote,
    Brain,
    Waves,
    Eye,
    Zap,
    Shield,
    Activity,
} from "lucide-react";
import { useNavStore } from "@/lib/store/navStore";
import { useOrbStore } from "@/lib/store/orbStore";
import { useDepartments } from "@/lib/queries/useDepartments";
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

// ═══════════════════════════════════════════════════════════════════════════
// ORB STATE → Dynamic Status Config
// ═══════════════════════════════════════════════════════════════════════════
const ORB_CONFIG: Record<string, {
    color: string;
    label: string;
    sublabel: string;
    icon: React.ElementType;
}> = {
    idle: {
        color: "#34d399",
        label: "Bereit",
        sublabel: "Warte auf Kontext",
        icon: Waves,
    },
    thinking: {
        color: "#60a5fa",
        label: "Analysiere",
        sublabel: "Signale werden verarbeitet",
        icon: Brain,
    },
    watch: {
        color: "#a78bfa",
        label: "Beobachte",
        sublabel: "Bereich wird gescannt",
        icon: Eye,
    },
    focus: {
        color: "#22c55e",
        label: "Fokus",
        sublabel: "Ordnerfokus aktiv",
        icon: Zap,
    },
    alert: {
        color: "#ef4444",
        label: "Achtung",
        sublabel: "Aktion erforderlich",
        icon: Shield,
    },
};

const getOrbConfig = (state: string, viewMode?: string) => {
    if (viewMode === "demo") {
        return {
            ...ORB_CONFIG.idle,
            color: "#22d3ee",
            label: "Beispiel",
            sublabel: "Demo-Instanz aktiv",
        };
    }
    return ORB_CONFIG[state] || ORB_CONFIG.idle;
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const MoraPlayground: React.FC<MoraPlaygroundProps> = ({
    scope,
    compact = false,
    className,
}) => {
    const orbState = useOrbStore((s) => s.orbState);
    const viewMode = useNavStore((s) => s.viewMode);
    const viewLevel = useNavStore((s) => s.viewLevel);
    const activeDepartmentId = useNavStore((s) => s.activeDepartmentId);
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const { hilEnabled, setHilEnabled } = useHilToggle();
    const { openPane, getPane, minimizePane } = usePaneStore();
    const safeDepartments = useMemo(() => (Array.isArray(departments) ? departments : []), [departments]);

    const orbConfig = getOrbConfig(orbState, viewMode);
    const StatusIcon = orbConfig.icon;

    // Dynamic context line
    const contextLine = useMemo(() => {
        const dept = safeDepartments.find((d) => d.id === activeDepartmentId);
        if (viewLevel === "folder") return dept ? `${dept.name} › Ordnerfokus` : "Ordnerfokus";
        if (viewLevel === "space") return dept ? `${dept.name} › Bereich` : "Bereich";
        if (viewLevel === "department") return dept?.name || "Abteilung";
        return viewMode === "demo" ? "Beispielsystem" : "Universe";
    }, [viewLevel, viewMode, safeDepartments, activeDepartmentId]);

    // ─── Pane Openers ───
    const openChat = () => {
        openPane({ id: "chat-main", type: "chat", title: "Mora", size: { width: 860, height: 680 } });
    };

    const openFinder = (showUpload?: boolean) => {
        openPane({
            id: "finder-main",
            type: "finder",
            title: "Finder",
            size: { width: 1280, height: 820 },
            data: showUpload ? { showUpload: true } : undefined,
        });
        const hub = getPane("mora-hub");
        if (hub && !hub.minimized) minimizePane("mora-hub");
    };

    const openTeam = () => {
        openPane({ id: "team-main", type: "team", title: "Team", size: { width: 840, height: 640 } });
    };

    const openSearch = () => {
        openPane({ id: "search-main", type: "search", title: "Suche", size: { width: 720, height: 520 } });
    };

    const openNotes = () => {
        openPane({ id: "notes-main", type: "notes", title: "Notizen", size: { width: 720, height: 560 } });
    };

    // ─── Actions ───
    const actions = [
        { id: "chat",    label: "Chat",    icon: MessageCircle, onClick: openChat },
        { id: "finder",  label: "Finder",  icon: FolderOpen,    onClick: () => openFinder(false) },
        { id: "upload",  label: "Upload",  icon: Upload,        onClick: () => openFinder(true) },
        { id: "search",  label: "Suche",   icon: Search,        onClick: openSearch },
        { id: "team",    label: "Team",    icon: Users,         onClick: openTeam },
        { id: "notes",   label: "Notizen", icon: StickyNote,    onClick: openNotes },
    ];

    return (
        <div className={`flex h-full flex-col overflow-hidden ${className ?? ""}`}>

            {/* ═══ ORB + STATUS ═══ */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] shrink-0">
                <button
                    type="button"
                    onClick={openChat}
                    className="relative rounded-full shrink-0 transition-opacity hover:opacity-80"
                    title="Chat mit Mora öffnen"
                >
                    <PlasmaOrb
                        color={orbConfig.color}
                        state={orbState as any}
                        size={compact ? 68 : 88}
                    />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" style={{ color: orbConfig.color }} />
                        <span className="text-[15px] font-light text-white/90">{orbConfig.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/38 truncate">{contextLine}</div>
                    <div className="mt-2.5">
                        <button
                            type="button"
                            onClick={() => setHilEnabled(!hilEnabled)}
                            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
                                hilEnabled
                                    ? "bg-emerald-500/12 border-emerald-500/22 text-emerald-300/80"
                                    : "bg-white/[0.03] border-white/10 text-white/32 hover:bg-white/[0.06] hover:text-white/55"
                            }`}
                        >
                            {hilEnabled ? "Bestätigung aktiv" : "Automatik"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══ LIVE-SIGNALE ═══ */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5 px-5 pt-3 pb-2 shrink-0">
                    <Activity className="h-3 w-3 text-emerald-400/50" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/28">Live-Signale</span>
                    <span className="ml-auto text-[9px] text-white/18">
                        {scope === "department" ? "Bereich" : "Kontext"}
                    </span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3">
                    <MoraUpdatesFeed
                        scope={scope}
                        title=""
                        maxEvents={compact ? 3 : 6}
                        compact
                        showHeader={false}
                        showHilToggle={false}
                    />
                </div>
            </div>

            {/* ═══ SCHNELLZUGRIFF ═══ */}
            <div className="border-t border-white/[0.06] px-5 py-3 shrink-0">
                <div className="text-[9px] uppercase tracking-[0.24em] text-white/22 mb-2.5">
                    Schnellzugriff
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.id}
                                type="button"
                                onClick={action.onClick}
                                className="flex items-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left transition-all hover:bg-white/[0.055] hover:border-white/[0.12]"
                            >
                                <Icon className="h-3.5 w-3.5 text-white/38 shrink-0" />
                                <span className="text-[11px] text-white/60">{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MoraPlayground;
