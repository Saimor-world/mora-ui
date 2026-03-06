"use client";

import React, { useState, useEffect } from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { useMoraStore } from "@/lib/store/moraState";
import MoraPlayground from "@/components/mora/MoraPlayground";
import { MoraMemory, MemoryStats } from "@/components/mora/MoraMemory";
import { Sparkles, Brain, BarChart3 } from "lucide-react";
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';

type HubSection = "overview" | "memory" | "stats";

interface Props {
    id?: string;
    onClose?: () => void;
    data?: {
        activeSection?: HubSection;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const TABS: { id: HubSection; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "memory", label: "Memory", icon: Brain },
    { id: "stats", label: "Stats", icon: BarChart3 },
];

/**
 * MORA HUB PANE
 * Dedicated brain space for Mora: thoughts, actions, and context tools.
 * Supports tab navigation: Overview, Memory, Stats
 */
export const MoraHubPane: React.FC<Props> = ({ id = "mora-hub", onClose, data }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const viewLevel = useMoraStore((s) => s.viewLevel);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const companies = useMoraStore((s) => s.companies);
    const safeCompanies = Array.isArray(companies) ? companies : [];
    const resolvedCompanyId = activeCompanyId || safeCompanies[0]?.id || null;

    const ctx = useMoraContext();

    // Tab state - respects data.activeSection if provided
    const [activeSection, setActiveSection] = useState<HubSection>(
        data?.activeSection || "overview"
    );

    // Update section when pane data changes (e.g., opened with specific section)
    useEffect(() => {
        if (data?.activeSection && data.activeSection !== activeSection) {
            setActiveSection(data.activeSection);
        }
    }, [data?.activeSection]);

    const handleClose = () => {
        removePane(id);
        onClose?.();
    };

    // Responsive sizing - portrait optimized
    const width = pane?.size?.width ?? 560;
    const height = pane?.size?.height ?? 720;
    const isCompact = width < 500;

    // ─── Render Section Content ───
    const renderContent = () => {
        switch (activeSection) {
            case "memory":
                return (
                    <div className="h-full p-4 overflow-y-auto">
                        <MoraMemory
                            compact={isCompact}
                            showSearch={true}
                            showQueue={true}
                            showStats={!isCompact}
                            companyId={resolvedCompanyId}
                        />
                    </div>
                );
            case "stats":
                return (
                    <div className="h-full p-4 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-medium text-white/80">Mora Statistics (Live)</span>
                            </div>
                            {/* MR18: scope freshness — honest about staleness */}
                            {ctx.lastScopeUpdateAt && (
                                <p className="text-[10px] text-white/25 mb-4">
                                    Scope aktualisiert: {new Date(ctx.lastScopeUpdateAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            )}
                            <MemoryStats compact={isCompact} companyId={resolvedCompanyId} />
                        </div>
                    </div>
                );
            case "overview":
            default:
                return (
                    <div className="h-full flex flex-col">
                        {/* MR18: Mora context — always visible when scope is known */}
                        <div className="px-4 pt-3 pb-2 border-b border-white/5 shrink-0">
                            <MoraContextChip variant="hub" snapshot={ctx} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <MoraPlayground
                                scope={viewLevel === "department" ? "department" : "company"}
                                title=""
                                className="h-full"
                                compact={isCompact}
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <GlassPanel
            width={width}
            height={height}
            initialX={pane?.position?.x}
            initialY={pane?.position?.y}
            paneId={id}
            blurIntensity={24}
            opacity={0.9}
            borderRadius="xl"
            zIndex={pane?.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
            dimBackground={false}
            title={
                <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Mora Nexus</span>
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-0.5 bg-black/30 rounded-lg p-0.5 ml-2">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeSection === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSection(tab.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] transition-all duration-200 ${
                                        isActive
                                            ? "bg-emerald-500/20 text-emerald-300"
                                            : "text-white/40 hover:text-white/60 hover:bg-white/[0.05]"
                                    }`}
                                >
                                    <Icon className="h-3 w-3" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            }
            isActive={isActive}
            onFocus={() => focusPane(id)}
            onClose={handleClose}
            onMinimize={() => minimizePane(id)}
            onResize={(width, height) => updatePaneSize(id, width, height)}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            className="overflow-hidden"
        >
            <div className="h-full">
                {renderContent()}
            </div>
        </GlassPanel>
    );
};

export default MoraHubPane;
