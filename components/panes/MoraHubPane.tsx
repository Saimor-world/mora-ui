"use client";

import React, { useState, useEffect } from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { useNavStore } from "@/lib/store/navStore";
import { useCompanies } from "@/lib/queries/useCompanies";
import MoraPlayground from "@/components/mora/MoraPlayground";
import MoraUpdatesFeed from "@/components/mora/MoraUpdatesFeed";
import { MoraMemory, MemoryStats } from "@/components/mora/MoraMemory";
import { Sparkles, Brain, BarChart3 } from "lucide-react";
import { useMoraContext } from '@/lib/mora/useMoraContext';
import { MoraContextChip } from '@/components/mora/MoraContextChip';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';

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
    { id: "overview", label: "Überblick", icon: Sparkles },
    { id: "memory", label: "Erinnerungen", icon: Brain },
    { id: "stats", label: "Signale", icon: BarChart3 },
];

const TAB_DESCRIPTIONS: Record<HubSection, string> = {
    overview: "Kontext, Schnellaktionen und aktueller Arbeitsfokus.",
    memory: "Gespeicherte Erinnerungen, gelernte Fakten und Suchzugriff.",
    stats: "Live-Signale und operative Aktivität dieses Bereichs.",
};

const SECTION_TITLES: Record<HubSection, string> = {
    overview: "Arbeitsfokus",
    memory: "Erinnerungsebenen",
    stats: "Signale und Aktivität",
};

/**
 * MORA CENTER PANE
 * Zentrale für Mora: Kontext, Erinnerungen und operative Signale.
 * Supports tab navigation: Overview, Memory, Stats
 */
export const MoraHubPane: React.FC<Props> = ({ id = "mora-hub", onClose, data }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const { viewLevel, activeCompanyId } = useNavStore();
    const { data: companies = [] } = useCompanies();
    const safeCompanies = Array.isArray(companies) ? companies : [];
    const resolvedCompanyId = activeCompanyId || safeCompanies[0]?.id || null;
    const surfaceProfile = useSurfaceProfile();

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
    }, [activeSection, data?.activeSection]);

    const switchSection = (section: HubSection) => {
        setActiveSection(section);
        updatePane(id, {
            data: {
                ...(pane?.data || {}),
                activeSection: section,
            },
        });
    };

    const handleClose = () => {
        removePane(id);
        onClose?.();
    };

    // Responsive sizing - portrait optimized
    const width = pane?.size?.width ?? 560;
    const height = pane?.size?.height ?? 720;
    const isCompact = width < 500;

    const renderSectionHeader = (section: HubSection) => (
        <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/32">
                        {TABS.find((tab) => tab.id === section)?.label}
                    </p>
                    <p className="mt-1 text-sm text-white/82">{SECTION_TITLES[section]}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                    {surfaceProfile.isLocalTruthSurface ? "Interne Instanz" : surfaceProfile.isPublicDemoSurface ? "Demo-Spiegel" : "Standardmodus"}
                </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/38">
                {TAB_DESCRIPTIONS[section]}
            </p>
        </div>
    );

    // ─── Render Section Content ───
    const renderContent = () => {
        switch (activeSection) {
            case "memory":
                return (
                    <div className="flex h-full flex-col">
                        {renderSectionHeader("memory")}
                        <div className="h-full overflow-y-auto p-4">
                            <MoraMemory
                                compact={isCompact}
                                showSearch={true}
                                showQueue={true}
                                showStats={!isCompact}
                                companyId={resolvedCompanyId}
                            />
                        </div>
                    </div>
                );
            case "stats":
                return (
                    <div className="flex h-full flex-col">
                        {renderSectionHeader("stats")}
                        <div className="h-full overflow-y-auto p-4">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-medium text-white/80">Mora-Signale</span>
                            </div>
                            {/* MR18: scope freshness — honest about staleness */}
                            {ctx.lastScopeUpdateAt && (
                                <p className="text-[10px] text-white/25 mb-4">
                                    Scope aktualisiert: {new Date(ctx.lastScopeUpdateAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            )}
                            <MemoryStats compact={isCompact} companyId={resolvedCompanyId} />
                            <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
                                <MoraUpdatesFeed
                                    scope={viewLevel === "department" ? "department" : "company"}
                                    title="Live-Signale"
                                    maxEvents={isCompact ? 5 : 8}
                                    compact={isCompact}
                                    showHilToggle={false}
                                    className="min-h-[260px]"
                                />
                            </div>
                        </div>
                        </div>
                    </div>
                );
            case "overview":
            default:
                return (
                    <div className="h-full flex flex-col">
                        {renderSectionHeader("overview")}
                        {ctx.isOperational ? (
                            <>
                                {/* Context chip — always visible when scope is known */}
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
                            </>
                        ) : (
                            /* Gentle idle state — not a warning, just a waiting room */
                            <div className="flex flex-col h-full overflow-y-auto">
                                <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
                                    {/* Ora orb placeholder */}
                                    <div className="relative flex h-16 w-16 items-center justify-center">
                                        <div className="absolute inset-0 rounded-full bg-emerald-500/[0.07] blur-xl" />
                                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/15 bg-[linear-gradient(180deg,rgba(16,185,129,0.06),rgba(16,185,129,0.02))]">
                                            <Sparkles size={22} className="text-emerald-400/50" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white/70">Mora wartet</p>
                                        <p className="mt-1.5 text-[12px] leading-relaxed text-white/35 max-w-[240px]">
                                            Öffne einen Bereich oder eine Instanz — dann wird Mora hier aktiv.
                                        </p>
                                    </div>
                                    {/* Quick-jump hints */}
                                    <div className="w-full space-y-2 text-left">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Schnellzugriff</p>
                                        <button
                                            type="button"
                                            onClick={() => switchSection("memory")}
                                            className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/12 hover:bg-white/[0.05]"
                                        >
                                            <Brain className="h-4 w-4 shrink-0 text-white/35" />
                                            <div>
                                                <p className="text-[12px] font-medium text-white/65">Erinnerungen</p>
                                                <p className="text-[10px] text-white/30">Was Mora bisher gelernt hat</p>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => switchSection("stats")}
                                            className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/12 hover:bg-white/[0.05]"
                                        >
                                            <BarChart3 className="h-4 w-4 shrink-0 text-white/35" />
                                            <div>
                                                <p className="text-[12px] font-medium text-white/65">Signale</p>
                                                <p className="text-[10px] text-white/30">Live-Aktivität der Instanz</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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
            title={<span className="normal-case text-[11px] tracking-[0.22em] text-emerald-300/80">Mora Center</span>}
            isActive={isActive}
            onFocus={() => focusPane(id)}
            onClose={handleClose}
            onMinimize={() => minimizePane(id)}
            onResize={(width, height) => updatePaneSize(id, width, height)}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            className="overflow-hidden"
        >
            <div className="flex h-full flex-col">
                <div className="border-b border-white/[0.06] px-4 py-3">
                    <div className="mb-3 flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${
                            surfaceProfile.isLocalTruthSurface
                                ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"
                                : surfaceProfile.isPublicDemoSurface
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                    : "border-white/10 bg-white/[0.04] text-white/55"
                        }`}>
                            {surfaceProfile.isLocalTruthSurface
                                ? "Interne Instanz"
                                : surfaceProfile.isPublicDemoSurface
                                    ? "Demo-Spiegel"
                                    : "Standardmodus"}
                        </span>
                        <span className="text-[11px] text-white/35">
                            {surfaceProfile.isLocalTruthSurface
                                ? "Diese Sicht folgt der internen Instanzwahrheit."
                                : surfaceProfile.isPublicDemoSurface
                                    ? "Diese Sicht spiegelt die kuratierte Demo-Instanz."
                                    : "Diese Sicht folgt dem Standardmodus der Organisation."}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-black/25 p-1">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isTabActive = activeSection === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => switchSection(tab.id)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] transition-all ${
                                        isTabActive
                                            ? "bg-emerald-500/18 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
                                            : "text-white/45 hover:bg-white/[0.05] hover:text-white/72"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                {renderContent()}
            </div>
        </GlassPanel>
    );
};

export default MoraHubPane;
