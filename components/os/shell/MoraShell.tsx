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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Store
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
import { useOperationalFlip } from '@/lib/hooks/useOperationalFlip';
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
import { ForestLightCanopy } from '@/components/visual/ForestLightCanopy';

// UI Components
import { Dock } from '@/components/mora/Dock';
import { ResonanceRoom } from '@/components/mora/ResonanceRoom';
import { Spotlight } from '@/components/mora/Spotlight';
import { KeyboardShortcutsOverlay } from '@/components/mora/KeyboardShortcutsOverlay';
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
import { CursorTrailEffect } from '@/components/effects/CursorTrailEffect';
import { UniverseControls, type ViewMode as UniverseViewMode } from '@/components/home/UniverseControls';
import { MyceliumDropfield } from '@/components/mora/MyceliumDropfield';

// V12: Connection Status, Quick Tips, Greeting & Stats
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { QuickTips } from '@/components/ui/QuickTips';
import { MoraGreeting } from '@/components/ui/MoraGreeting';
import { SystemStats } from '@/components/ui/SystemStats';

// V13: OS Features - Notification Center, Focus Mode, Quick Preview, Window Snapping, Memory Sidebar
import { QuickPreview } from '@/components/os/QuickPreview';
import { SnapPreview } from '@/components/os/SnapPreview';
import { MemorySidebar, useMemorySidebarShortcut } from '@/components/os/MemorySidebar';
import { useWindowSnapping, type SnapZone } from '@/lib/hooks/useWindowSnapping';
import { Upload, Sparkles } from 'lucide-react';

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

    type MyceliumDropVisualFile = {
        id: string;
        name: string;
        type: string;
        size: number;
    };

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
    const visiblePaneCount = usePaneStore((state) => state.panes.reduce((count, pane) => count + (pane.minimized ? 0 : 1), 0));
    const safeCompanies = React.useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);

    const activeCompany = safeCompanies.find(c => c.id === activeCompanyId);
    const role = user?.role || 'demo';
    const tenantId = user?.tenant_id;

    const filteredCompanies = React.useMemo(() => {
        if (!safeCompanies.length) return [];
        if (tenantId === TENANT_DEMO) {
            return safeCompanies.filter((c) => c.is_demo || c.tenant_id === TENANT_HQ);
        }
        if (viewMode === 'demo') {
            return safeCompanies.filter((c) => c.is_demo);
        }
        if (viewMode === 'workspace') {
            if (role === 'system_owner') {
                return safeCompanies.filter((c) => !c.is_demo);
            }
            return tenantId ? safeCompanies.filter((c) => c.tenant_id === tenantId) : safeCompanies;
        }
        if (role === 'system_owner') return safeCompanies;
        return tenantId ? safeCompanies.filter((c) => c.tenant_id === tenantId) : safeCompanies;
    }, [safeCompanies, viewMode, role, tenantId]);

    const activeCompanyForView = React.useMemo(() => {
        if (filteredCompanies.length === 0) return activeCompany;
        return filteredCompanies.find((c) => c.id === activeCompanyId) || filteredCompanies[0];
    }, [filteredCompanies, activeCompanyId, activeCompany]);

    const displayCompany = activeCompanyForView || activeCompany;
    const hasDemoCompany = safeCompanies.some((c) => c.is_demo);
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
    const [hasFullscreenPane, setHasFullscreenPane] = useState(false);
    const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
    const [isShellDropActive, setIsShellDropActive] = useState(false);
    const [myceliumDropBatch, setMyceliumDropBatch] = useState<{
        batchId: string;
        files: MyceliumDropVisualFile[];
    } | null>(null);
    const shellDropDepthRef = useRef(0);
    const fullscreenPaneIdsRef = useRef<Set<string>>(new Set());
    const pauseHeavyBackground = viewLevel !== 'core' || hasFullscreenPane || isResonanceOpen || isSpotlightOpen || isShortcutsOpen || visiblePaneCount > 1;

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

    // Hide dock while one or more panes are in fullscreen/maximized mode.
    useEffect(() => {
        const handleFullscreenChange = (event: Event) => {
            const detail = (event as CustomEvent<{ paneId?: string; isFullscreen?: boolean }>).detail;
            const paneId = detail?.paneId;
            if (!paneId) return;

            if (detail?.isFullscreen) {
                fullscreenPaneIdsRef.current.add(paneId);
            } else {
                fullscreenPaneIdsRef.current.delete(paneId);
            }
            setHasFullscreenPane(fullscreenPaneIdsRef.current.size > 0);
        };

        window.addEventListener('mora-pane-fullscreen-change', handleFullscreenChange);
        return () => window.removeEventListener('mora-pane-fullscreen-change', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const isDev = process.env.NODE_ENV === 'development';
        const hasParam = window.location.search.includes('diagnostics=1');
        setDiagnosticsEnabled(isDev || hasParam);
    }, []);

    // Hooks
    const apiOrbState = useAwareness();
    useMindloopStream(isBootstrapped && viewMode !== 'demo');

    useShellEvents({
        onOpenResonance: useCallback(() => setIsResonanceOpen(true), [])
    });

    useRealtime(isBootstrapped);
    useOperationalFlip();

    useKeyboardShortcuts({
        onToggleSpotlight: useCallback(() => setIsSpotlightOpen(prev => !prev), []),
        onOpenChat: useCallback(() => {
            openPane({ id: 'chat-main', type: 'chat', title: 'Mora', size: { width: 860, height: 680 } });
        }, [openPane]),
        onOpenFinder: useCallback(() => {
            openPane({ id: 'finder-main', type: 'finder', title: 'Finder', size: { width: 1280, height: 820 } });
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

    // Lift memory sidebar shortcut here so it stays active even when
    // MemorySidebar is conditionally unmounted (e.g. during fullscreen pane mode)
    useMemorySidebarShortcut();

    // Handlers
    const handleUnlock = () => setIsSleeping(false);

    const isFileDragEvent = useCallback((event: React.DragEvent | DragEvent) => {
        const types = Array.from(event.dataTransfer?.types || []);
        return types.includes('Files');
    }, []);

    const isLocalFileDropTarget = useCallback((target: EventTarget | null) => {
        return target instanceof Element && !!target.closest('[data-file-drop-zone="local"]');
    }, []);

    const resetShellDrop = useCallback(() => {
        shellDropDepthRef.current = 0;
        setIsShellDropActive(false);
    }, []);

    const handleShellDragEnter = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        shellDropDepthRef.current += 1;
        setIsShellDropActive(true);
    }, [isFileDragEvent, isLocalFileDropTarget]);

    const handleShellDragOver = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        if (!isShellDropActive) setIsShellDropActive(true);
    }, [isFileDragEvent, isLocalFileDropTarget, isShellDropActive]);

    const handleShellDragLeave = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        shellDropDepthRef.current = Math.max(0, shellDropDepthRef.current - 1);
        if (shellDropDepthRef.current === 0) {
            setIsShellDropActive(false);
        }
    }, [isFileDragEvent, isLocalFileDropTarget]);

    const handleShellDrop = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files || []);
        resetShellDrop();
        if (files.length === 0) return;

        const batchId = `mycelium-${Date.now()}`;
        setMyceliumDropBatch({
            batchId,
            files: files.map((file) => ({
                id: `${batchId}-${file.name}-${file.size}`,
                name: file.name,
                type: file.type,
                size: file.size,
            })),
        });
        openPane({
            id: 'scanner-main',
            type: 'scanner',
            title: 'Mycelium Intake',
            size: { width: 920, height: 640 },
            data: {
                source: 'mycelium',
                batchId,
                initialFiles: files,
            },
        });
    }, [isFileDragEvent, isLocalFileDropTarget, openPane, resetShellDrop]);

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
                    size: { width: 1080, height: 760 },
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
        <div
            className="relative w-full h-full overflow-hidden text-white select-none"
            onDragEnter={handleShellDragEnter}
            onDragOver={handleShellDragOver}
            onDragLeave={handleShellDragLeave}
            onDrop={handleShellDrop}
        >

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
            <StarField density="low" paused={pauseHeavyBackground} />

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

            {/* Mora Insight Popup — surfaces MindLoop insight events above the Dock */}
            <MoraInsightPopup
                insight={currentInsight}
                onConfirm={(insight) => confirmInsight(insight.id)}
                onDismiss={(insight) => dismissInsight(insight.id)}
            />

            {/* Dock (Bottom Navigation) */}
            {!hasFullscreenPane && <Dock />}

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
            {!hasFullscreenPane && <MemorySidebar />}

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
                            message={cursorAgent.message}
                            awareness={finalOrbState}
                            onActionComplete={(completedAction) => {
                                if (completedAction === 'return') {
                                    setCursorAgent({ active: false, action: 'idle', target: undefined, message: null });
                                }
                            }}
                        />

                        <AgencyCursor />
                        <CursorTrailEffect />
                        <GhostOverlay />
                        <UserCursor enabled={true} />
                    </>
                )
            }

            <MyceliumDropfield
                active={!!myceliumDropBatch}
                files={myceliumDropBatch?.files || []}
                onComplete={() => setMyceliumDropBatch(null)}
            />

            {/* Name Conflict Modal (409 UX) */}
            <NameConflictModal />

            {/* Dev-only intelligence diagnostics panel — hidden in prod unless ?diagnostics=1 */}
            {diagnosticsEnabled && <IntelligenceDiagnostics />}

            {isShellDropActive && (
                <div className="fixed inset-0 z-[950] pointer-events-none">
                    <div className="absolute inset-8 rounded-[28px] border border-emerald-400/30 bg-emerald-500/[0.06] backdrop-blur-sm shadow-[0_0_80px_rgba(16,185,129,0.12)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="max-w-xl mx-auto px-8 py-7 rounded-[28px] border border-emerald-400/25 bg-black/65 backdrop-blur-xl shadow-2xl text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/15">
                                <Upload className="h-8 w-8 text-emerald-300" />
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.28em] text-emerald-300/70 font-bold">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Mycelium Intake</span>
                            </div>
                            <h2 className="mt-3 text-2xl font-light tracking-[0.08em] text-white">
                                Dateien hier fallen lassen
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/65">
                                Mora nimmt die Dateien im Universe auf, bereitet Einordnungsvorschlaege vor
                                und fuehrt die bestaetigte Ablage spaeter im Dateibaum aus.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
