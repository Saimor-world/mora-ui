"use client";

/**
 * MoraShell - Main OS Shell Component
 * ====================================
 *
 * This is the heart of SAIMÔR OS. All other components orbit around it.
 *
 * STRUCTURE:
 * 1. Background Layers (StarField, Mycelium, LivingBackground)
 * 2. Main Content (ViewPort - handles view routing)
 * 3. UI Overlays (Dock, Orb, Resonance, Spotlight, Intelligence)
 * 4. Interaction Layers (Cursors, Ghost)
 *
 * HOOKS (extracted for clarity):
 * - useAuthBootstrapper: Auth state
 * - useShellEvents: Event bus
 * - useAwareness: Orb state polling
 * - useRealtime: WebSocket connection
 * - useKeyboardShortcuts: Global shortcuts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Store
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
import { resetUserState } from '@/lib/hooks/useUser';
import type { OrbState } from '@/lib/api/awarenessClient';
import { TENANT_DEMO, TENANT_HQ } from '@/lib/constants/tenants';

// Shell Hooks
import {
    useShellEvents,
    useAwareness,
    useMindloopStream,
    useRealtime,
    useKeyboardShortcuts
} from '@/lib/hooks/shell';
import { realtime } from '@/lib/api/realtimeClient';

// Layout Components
import { ViewPort } from '@/components/layout/ViewPort';

// Background Layers
import { StarField } from '@/components/visual/StarField';
import { MoraLivingBackground } from '@/components/mora/MoraLivingBackground';
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlay';
import { ForestLightCanopy } from '@/components/visual/ForestLightCanopy';

// UI Components
import { Dock } from '@/components/mora/Dock';
import { ResonanceRoom } from '@/components/mora/ResonanceRoom';
import { Spotlight } from '@/components/mora/Spotlight';
import { KeyboardShortcutsOverlay } from '@/components/mora/KeyboardShortcutsOverlay';
import { NodeDetailPanel } from '@/components/organic/NodeDetailPanel';
import { LockScreen } from '@/components/auth/LockScreen';
import { MoraInsightPopup } from '@/components/mora/MoraInsightPopup';
import { useMindLoopInsights } from '@/lib/hooks/useMindLoopInsights';

// Premium Intelligence Layer
// Intelligence is shown through Mora Nexus and Dock command center.

// Interaction Layers
import { CursorAgent } from '@/components/mora/CursorAgent';
import { AgencyCursor } from '@/components/agency/AgencyCursor';
import { GhostOverlay } from '@/components/mora/GhostOverlay';
import { UserCursor } from '@/components/layout/UserCursor';
import { UniverseControls, type ViewMode as UniverseViewMode } from '@/components/home/UniverseControls';

// V12: Connection Status, Quick Tips, Greeting & Stats
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { QuickTips } from '@/components/ui/QuickTips';
import { MoraGreeting } from '@/components/ui/MoraGreeting';
import { SystemStats } from '@/components/ui/SystemStats';

// V13: OS Features - Notification Center, Focus Mode, Quick Preview, Window Snapping, Memory Sidebar
import { QuickPreview } from '@/components/os/QuickPreview';
import { SnapPreview } from '@/components/os/SnapPreview';
import { MemorySidebar } from '@/components/os/MemorySidebar';
import { useWindowSnapping, type SnapZone } from '@/lib/hooks/useWindowSnapping';

// Naming Conflict Modal (409 UX)
import NameConflictModal from '@/components/ui/NameConflictModal';
import { IntelligenceDiagnostics } from '@/components/dev/IntelligenceDiagnostics';

// =============================================================================
// LOADING SCREEN
// =============================================================================

const LoadingScreen: React.FC = () => (
    <div className="w-full h-screen bg-gradient-to-b from-[#0a1a14] to-[#030806] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
            {/* Pulsing Orb */}
            <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-4 rounded-full bg-emerald-400/30 animate-pulse" style={{ animationDuration: '1.5s' }} />
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-emerald-400/60 text-xs font-medium tracking-[0.4em] uppercase">
                    SAIMOR
                </span>
                <span className="text-white/20 text-[10px] tracking-[0.2em]">
                    Mora erwacht...
                </span>
            </div>
            {/* Loading bar */}
            <div className="w-32 h-[2px] rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-emerald-500/40 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
                    style={{
                        animation: 'loading 1.5s ease-in-out infinite',
                    }}
                />
            </div>
        </div>
        <style jsx>{`
            @keyframes loading {
                0% { width: 0%; margin-left: 0; }
                50% { width: 60%; margin-left: 20%; }
                100% { width: 0%; margin-left: 100%; }
            }
        `}</style>
    </div>
);

// =============================================================================
// ERROR SCREEN
// =============================================================================

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => {
    const [retrying, setRetrying] = React.useState(false);

    const handleRetry = () => {
        setRetrying(true);
        setTimeout(() => window.location.reload(), 1500);
    };

    return (
        <div className="w-full h-screen bg-gradient-to-b from-[#0a0f0d] to-[#030806] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center px-6 max-w-lg">
                {/* Error Orb */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-red-500/5 border border-red-500/20 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="absolute -inset-4 rounded-full bg-red-500/5 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
                </div>

                <div className="space-y-2">
                    <div className="text-red-400/80 text-xs tracking-[0.4em] uppercase font-medium">
                        Verbindung unterbrochen
                    </div>
                    <div className="text-white/60 text-sm leading-relaxed">
                        {message}
                    </div>
                </div>

                {/* Help Section */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 w-full space-y-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Diagnose</div>
                    <div className="space-y-2 text-left">
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                API-Endpunkt: <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400/70 font-mono text-[10px]">{process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || process.env.NEXT_PUBLIC_CORE_API_URL || 'api.saimor.world'}</code>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                Netzwerkverbindung prüfen und Seite neu laden
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                Hält das Problem an, bitte Support kontaktieren
                            </div>
                        </div>
                    </div>
                </div>

                {/* Retry Button */}
                <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/80 text-xs tracking-[0.15em] uppercase hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-wait"
                >
                    {retrying ? 'Verbinde...' : 'Erneut verbinden'}
                </button>

                <div className="text-[9px] text-white/15 tracking-[0.3em] uppercase">SAIMOR OS • Mora Core</div>
            </div>
        </div>
    );
};

// =============================================================================
// MAIN SHELL COMPONENT
// =============================================================================

export const MoraShell: React.FC = () => {
    const router = useRouter();

    // Auth
    const { isBootstrapped, authError } = useAuthBootstrapper();

    // Store
    const {
        user,
        setCursorAgent,
        cursorAgent,
        viewMode,
        viewLevel,
        orbState: storeOrbState,
        orbNotifications,
        activeCompanyId,
        companies,
        resetStore,
        isLoggingOut
    } = useMoraStore();
    const { logout } = useAccountStore();
    const { reset: resetPanes, openPane } = usePaneStore();

    const activeCompany = companies.find(c => c.id === activeCompanyId);
    const role = user?.role || 'demo';
    const tenantId = user?.tenant_id;

    const filteredCompanies = React.useMemo(() => {
        if (!companies.length) return [];
        if (viewMode === 'demo') {
            return companies.filter((c) => c.is_demo);
        }
        if (viewMode === 'workspace') {
            if (tenantId === TENANT_DEMO) {
                return companies.filter((c) => c.tenant_id === TENANT_HQ);
            }
            if (role === 'system_owner') {
                return companies.filter((c) => !c.is_demo);
            }
            return tenantId ? companies.filter((c) => c.tenant_id === tenantId) : companies;
        }
        if (role === 'system_owner') return companies;
        return tenantId ? companies.filter((c) => c.tenant_id === tenantId) : companies;
    }, [companies, viewMode, role, tenantId]);

    const activeCompanyForView = React.useMemo(() => {
        if (filteredCompanies.length === 0) return activeCompany;
        return filteredCompanies.find((c) => c.id === activeCompanyId) || filteredCompanies[0];
    }, [filteredCompanies, activeCompanyId, activeCompany]);

    const displayCompany = activeCompanyForView || activeCompany;
    const hasDemoCompany = companies.some((c) => c.is_demo);
    const visibleModes = React.useMemo<UniverseViewMode[]>(() => {
        if (role === 'system_owner') {
            return hasDemoCompany ? ['owner', 'workspace', 'demo'] : ['owner', 'workspace'];
        }
        return hasDemoCompany ? ['workspace', 'demo'] : ['workspace'];
    }, [role, hasDemoCompany]);
    const scopeLabel = React.useMemo(() => {
        if (viewLevel === 'company') return 'Portfolio';
        if (viewLevel === 'core') return 'Universe';
        if (viewLevel === 'department') return 'Department';
        if (viewLevel === 'space') return 'Space';
        if (viewLevel === 'folder') return 'Folder';
        return 'Universe';
    }, [viewLevel]);
    const workspaceTabLabel = 'Workspace';

    // Local State
    const [isSleeping, setIsSleeping] = useState(false);
    const [isResonanceOpen, setIsResonanceOpen] = useState(false);
    const [isResonanceExpanded, setIsResonanceExpanded] = useState(false);
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [activeSnapZone, setActiveSnapZone] = useState<SnapZone>(null);

    // Window Snapping
    const windowSnapping = useWindowSnapping();
    const { currentInsight, confirmInsight, dismissInsight } = useMindLoopInsights();
    // Destructure stable callbacks so the effect below doesn't fire on every render.
    // (The whole windowSnapping object is a new reference each render even though the
    //  underlying functions are stable after the cfg useMemo fix.)
    const { detectSnapZone, applySnap } = windowSnapping;

    // Global snap detection during pane dragging
    useEffect(() => {
        let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

        const handlePaneDragStart = () => {
            mouseMoveHandler = (e: MouseEvent) => {
                const zone = detectSnapZone(e.clientX, e.clientY);
                setActiveSnapZone(zone);
            };
            window.addEventListener('mousemove', mouseMoveHandler);
        };

        const handlePaneDragEnd = (e: Event) => {
            if (mouseMoveHandler) {
                window.removeEventListener('mousemove', mouseMoveHandler);
                mouseMoveHandler = null;
            }
            const customEvent = e as CustomEvent;
            const { paneId } = customEvent.detail || {};
            if (paneId && activeSnapZone) {
                applySnap(paneId, activeSnapZone);
            }
            setActiveSnapZone(null);
        };

        window.addEventListener('mora-pane-drag-start', handlePaneDragStart);
        window.addEventListener('mora-pane-drag-end', handlePaneDragEnd);

        return () => {
            window.removeEventListener('mora-pane-drag-start', handlePaneDragStart);
            window.removeEventListener('mora-pane-drag-end', handlePaneDragEnd);
            if (mouseMoveHandler) {
                window.removeEventListener('mousemove', mouseMoveHandler);
            }
        };
    }, [detectSnapZone, applySnap, activeSnapZone]);

    // EFFECT: Clear panes when ViewMode changes
    useEffect(() => {
        resetPanes();
    }, [viewMode, resetPanes]);

    // Hooks
    const apiOrbState = useAwareness();
    useMindloopStream(isBootstrapped && viewMode !== 'demo');

    useShellEvents({
        onOpenResonance: useCallback(() => setIsResonanceOpen(true), [])
    });

    useRealtime(isBootstrapped);

    useKeyboardShortcuts({
        onToggleSpotlight: useCallback(() => setIsSpotlightOpen(prev => !prev), []),
        onOpenChat: useCallback(() => {
            openPane({ id: 'chat-main', type: 'chat', title: 'Mora', size: { width: 520, height: 620 } });
        }, [openPane]),
        onOpenFinder: useCallback(() => {
            openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1200, height: 780 } });
        }, [openPane]),
        onOpenNotes: useCallback(() => {
            openPane({ id: 'notes-main', type: 'notes', title: 'Notes', size: { width: 720, height: 560 } });
        }, [openPane]),
        onOpenSettings: useCallback(() => {
            openPane({ id: 'settings-main', type: 'settings', title: 'Settings', size: { width: 720, height: 640 } });
        }, [openPane]),
        onOpenTerminal: useCallback(() => {
            openPane({ id: 'terminal-main', type: 'terminal', title: 'Terminal', size: { width: 850, height: 600 } });
        }, [openPane]),
        onGoHome: useCallback(() => {
            useMoraStore.getState().navigateToCore();
        }, []),
        onOpenMoraHub: useCallback(() => {
            openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora Nexus', size: { width: 640, height: 540 } });
        }, [openPane]),
        onOpenMemory: useCallback(() => {
            openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Memory', size: { width: 640, height: 540 }, data: { activeSection: 'memory' } });
        }, [openPane]),
        onCloseTopPane: useCallback(() => {
            const { panes, removePane: rp } = usePaneStore.getState();
            const visiblePanes = panes.filter(p => !p.minimized);
            if (visiblePanes.length > 0) {
                rp(visiblePanes[visiblePanes.length - 1].id);
            }
        }, []),
        onShowShortcuts: useCallback(() => setIsShortcutsOpen(prev => !prev), []),
    });

    // Handlers
    const handleUnlock = () => setIsSleeping(false);

    const handleLogout = () => {
        setIsSleeping(false);
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('mora_session');
        realtime.disconnect(); // close WS before clearing session
        logout();
        resetUserState();
        resetStore();
        resetPanes();
        router.push('/');
    };

    // EFFECT: External AI Actions (from CursorBridge)
    useEffect(() => {
        const handlePaneAction = (event: any) => {
            const { action, type, data } = event.detail;
            if (action === 'open') {
                openPane({
                    id: `${type}-main`,
                    type: type as any,
                    title: type.charAt(0).toUpperCase() + type.slice(1),
                    size: { width: 900, height: 600 },
                    data: data || {}
                });
            }
        };

        window.addEventListener('mora-pane-action', handlePaneAction);
        return () => window.removeEventListener('mora-pane-action', handlePaneAction);
    }, [openPane]);

    // Computed
    const finalOrbState: OrbState = viewMode === 'demo'
        ? 'demo'
        : (storeOrbState === 'idle' && apiOrbState !== 'idle'
            ? apiOrbState
            : (storeOrbState || apiOrbState));

    // ==========================================================================
    // RENDER
    // ==========================================================================

    // Loading
    if (authError) {
        return <ErrorScreen message={authError} />;
    }

    if (!isBootstrapped) {
        return <LoadingScreen />;
    }

    // Lock Screen
    if (isSleeping) {
        return (
            <LockScreen
                onUnlock={handleUnlock}
                onLogout={handleLogout}
                userName={user?.name || localStorage.getItem('last_user_name') || 'Benutzer'}
                companyName={displayCompany?.name || 'Workspace'}
            />
        );
    }

    // Main Shell
    return (
        <div className="relative w-full h-full overflow-hidden text-white select-none">

            {/* V12: Connection Status, Quick Tips, Greeting & Stats */}
            <ConnectionBanner />
            <QuickTips />
            <MoraGreeting />
            <SystemStats />

            {/* ================================================================
                LAYER 1: BACKGROUND
            ================================================================= */}

            {/* Deep Void Foundation + Living Background */}
            <div className="fixed inset-0 bg-black z-[-10]" />
            <MoraLivingBackground />

            {/* Background Layers */}
            <ForestLightCanopy orbState={finalOrbState} demoMode={viewMode === 'demo'} />
            <StarField {...({ density: 'medium' } as any)} />
            <MyceliumOverlay />

            {/* ================================================================
                LAYER 2: MAIN CONTENT
            ================================================================= */}

            <div className="relative z-10 w-full h-full flex items-stretch">

                {/* Universe ViewMode / Context Switches */}
                <UniverseControls
                    viewMode={viewMode}
                    setViewMode={(mode) => {
                        useMoraStore.getState().setViewMode(mode);
                    }}
                    activeCompany={displayCompany}
                    companies={filteredCompanies}
                    onSwitchCompany={(id) => useMoraStore.getState().setActiveCompany(id)}
                    visibleModes={visibleModes}
                    workspaceLabel={workspaceTabLabel}
                    scopeLabel={scopeLabel}
                />

                {/* ViewPort - Routes to Universe/Department/Space/Folder */}
                <div className="flex-1 relative h-full w-full">
                    <ViewPort />

                    {/* Bottom Gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none z-10" />
                </div>
            </div>

            {/* ================================================================
                LAYER 3: UI OVERLAYS
            ================================================================= */}

            {/* Resonance Room */}
            <ResonanceRoom
                isOpen={isResonanceOpen}
                onClose={() => setIsResonanceOpen(false)}
                onToggleExpand={() => setIsResonanceExpanded(!isResonanceExpanded)}
                isExpanded={isResonanceExpanded}
            />

            {/* Node Detail Panel — renders whenever activeNode is set (click node in FolderLayer) */}
            <NodeDetailPanel />

            {/* Mora Insight Popup — surfaces MindLoop insight events above the Dock */}
            <MoraInsightPopup
                insight={currentInsight}
                onConfirm={(insight) => confirmInsight(insight.id)}
                onDismiss={(insight) => dismissInsight(insight.id)}
            />

            {/* Dock (Bottom Navigation) */}
            <Dock />

            {/* Spotlight (Cmd+K) */}
            <Spotlight
                isOpen={isSpotlightOpen}
                onClose={() => setIsSpotlightOpen(false)}
            />

            {/* Keyboard Shortcuts Overlay (?) */}
            <KeyboardShortcutsOverlay
                isOpen={isShortcutsOpen}
                onClose={() => setIsShortcutsOpen(false)}
            />

            {/* Quick Preview (Space bar on selected items) */}
            <QuickPreview />

            {/* Window Snap Preview (when dragging near edges) */}
            <SnapPreview zone={activeSnapZone} visible={activeSnapZone !== null} />

            {/* Memory Sidebar (Cmd+Shift+M) */}
            <MemorySidebar />

            {/* ═══ PREMIUM INTELLIGENCE LAYER ═══ */}
            {/*
             * V11 CLEANUP: Removed MoraIntelligenceBar + MoraThoughtStream
             * Status is now shown next to the Orb (see below)
             * Intelligence Dashboard merged into Mora Nexus Pane
             */}

            {/* Mora controls are integrated in Dock command center. */}

            {/* ================================================================
                LAYER 4: INTERACTION
            ================================================================= */}

            {
                !isLoggingOut && (
                    <>
                        <CursorAgent
                            active={cursorAgent.active}
                            action={cursorAgent.action}
                            target={cursorAgent.target}
                            awareness={finalOrbState}
                            onActionComplete={() => setCursorAgent({ active: false, action: 'idle' })}
                        />

                        <AgencyCursor />
                        <GhostOverlay />
                        <UserCursor enabled={true} />
                    </>
                )
            }

            {/* Name Conflict Modal (409 UX) */}
            <NameConflictModal />

            {/* Dev-only intelligence diagnostics panel — hidden in prod unless ?diagnostics=1 */}
            <IntelligenceDiagnostics />

            {/* Logout Transition Overlay */}
            {
                isLoggingOut && (
                    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-xl flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-xs uppercase tracking-[0.4em] text-emerald-400/80 mb-3">
                                Logging Out
                            </div>
                            <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent animate-pulse mx-auto" />
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default MoraShell;
