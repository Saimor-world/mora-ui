"use client";

import React, { useState, useEffect } from "react";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { useMoraStore } from "@/lib/store/moraState";
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
    { id: "overview", label: "Ueberblick", icon: Sparkles },
    { id: "memory", label: "Erinnerungen", icon: Brain },
    { id: "stats", label: "Signale", icon: BarChart3 },
];

const TAB_DESCRIPTIONS: Record<HubSection, string> = {
    overview: "Kontext, Schnellaktionen und aktueller Arbeitsfokus.",
    memory: "Gespeicherte Erinnerungen, gelernte Fakten und Suchzugriff.",
    stats: "Live-Signale und operative Aktivitaet dieses Bereichs.",
};

/**
 * MORA CENTER PANE
 * Zentrale fuer Mora: Kontext, Erinnerungen und operative Signale.
 * Supports tab navigation: Overview, Memory, Stats
 */
export const MoraHubPane: React.FC<Props> = ({ id = "mora-hub", onClose, data }) => {
    const { removePane, minimizePane, focusPane, getPane, updatePane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);
    const isActive = usePaneStore((state) => state.activePaneId === id);
    const viewLevel = useMoraStore((s) => s.viewLevel);
    const activeCompanyId = useMoraStore((s) => s.activeCompanyId);
    const companies = useMoraStore((s) => s.companies);
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
                );
            case "overview":
            default:
                return (
                    <div className="h-full flex flex-col">
                        {ctx.isOperational === null ? null : ctx.isOperational ? (
                            <>
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
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 mx-6 mt-8 border border-amber-500/20 bg-amber-500/5 rounded-2xl text-center">
                                <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-amber-400/80">
                                    Setup Erforderlich
                                </p>
                                <p className="text-xs text-amber-200/50 max-w-[260px] leading-relaxed">
                                    Oeffne zuerst die Beispielinstanz oder einen Bereich, damit Mora operativ werden kann.
                                </p>
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
            title={<span className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Mora Center</span>}
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
                                ? "Local Truth"
                                : surfaceProfile.isPublicDemoSurface
                                    ? "Demo Mirror"
                                    : "Standard"}
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
                    <p className="mt-2 px-1 text-[11px] text-white/35">
                        {TAB_DESCRIPTIONS[activeSection]}
                    </p>
                </div>
                {renderContent()}
            </div>
        </GlassPanel>
    );
};

export default MoraHubPane;
