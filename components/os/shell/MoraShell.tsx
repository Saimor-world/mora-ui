"use client";

/**
 * MoraShell - Main OS Shell Component
 * ====================================
 *
 * This is the heart of SAIMOR OS. All other components orbit around it.
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
import { useNavStore } from '@/lib/store/navStore';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { authLogout } from '@/lib/api/coreClient';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
import { useOperationalFlip } from '@/lib/hooks/useOperationalFlip';
import { resetUserState } from '@/lib/hooks/useUser';
import type { OrbState } from '@/lib/api/awarenessClient';
import { TENANT_DEMO } from '@/lib/constants/tenants';
import { filterCompaniesForSurface, getPrimaryOperationalCompany } from '@/lib/os/companySurfaceFilter';

// Shell Hooks
import {
    useShellEvents,
    useAwareness,
    useMindloopStream,
    useRealtime,
    useKeyboardShortcuts
} from '@/lib/hooks/shell';
import { useMoraExecutions } from '@/lib/hooks/useMoraExecutions';
import { ExecutionToast } from '@/components/mora/ExecutionToast';
import { WebsiteContextBanner } from '@/components/entry/WebsiteContextBanner';
import { realtime } from '@/lib/api/realtimeClient';

// Layout Components
import { ViewPort } from '@/components/layout/ViewPort';
import { useContextStore } from '@/lib/store/contextStore';
import { AdminHome } from '@/components/admin/AdminHome';

// Background Layers
import { StarField } from '@/components/visual/StarField';
import { NeuralGrid } from '@/components/visual/NeuralGrid';
import { MoraLivingBackground } from '@/components/mora/MoraLivingBackground';
import { ForestLightCanopy } from '@/components/visual/ForestLightCanopy';
import { AmbientDust } from '@/components/organic/AmbientDust';

// UI Components
import { Dock } from '@/components/mora/Dock';
import { MoraGreetingBubble } from '@/components/mora/MoraGreetingBubble';
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';
import { useMoraSpeaks } from '@/lib/queries/useMoraSpeaks';
// 1.0 gated (future-tier) — see docs/plans/2026-03-27-surface-hierarchy-1.0.md
// import { ResonanceRoom } from '@/components/mora/ResonanceRoom';
import { Spotlight } from '@/components/mora/Spotlight';
import { KeyboardShortcutsOverlay } from '@/components/mora/KeyboardShortcutsOverlay';
import { LockScreen } from '@/components/auth/LockScreen';
// 1.0 gated (future-tier: insight popup)
// import { MoraInsightPopup } from '@/components/mora/MoraInsightPopup';
// import { useMindLoopInsights } from '@/lib/hooks/useMindLoopInsights';

// Premium Intelligence Layer
// Intelligence is shown through Mora Nexus and Dock command center.

// Interaction Layers
// 1.0 gated (future-tier: agentic cursor effects)
// import { CursorAgent } from '@/components/mora/CursorAgent';
// import { AgencyCursor } from '@/components/agency/AgencyCursor';
// import { GhostOverlay } from '@/components/mora/GhostOverlay';
import { UserCursor } from '@/components/layout/UserCursor';
// import { CursorTrailEffect } from '@/components/effects/CursorTrailEffect';
import { UniverseControls, type ViewMode as UniverseViewMode } from '@/components/home/UniverseControls';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';
import { MyceliumDropfield } from '@/components/mora/MyceliumDropfield';
import { ShellBreadcrumb } from '@/components/os/shell/ShellBreadcrumb';
import { IdentityMedallion } from '@/components/os/shell/IdentityMedallion';

// V12: Connection Status, Quick Tips, Greeting & Stats
import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { QuickTips } from '@/components/ui/QuickTips';
import { MoraGreeting } from '@/components/ui/MoraGreeting';
import { SystemStats } from '@/components/ui/SystemStats';

// V13: OS Features - Notification Center, Focus Mode, Quick Preview, Window Snapping, Memory Sidebar
import { QuickPreview } from '@/components/os/QuickPreview';
import { SnapPreview } from '@/components/os/SnapPreview';
import { AmbientAudioController } from '@/components/os/AmbientAudioController';
import { InteractionAudioController } from '@/components/os/InteractionAudioController';
import { MoraPulsePanel } from '@/components/os/MoraPulsePanel';
import { TemporalAtmosphere } from '@/components/os/TemporalAtmosphere';
// 1.0 gated (future-tier: memory sidebar)
// import { MemorySidebar, useMemorySidebarShortcut } from '@/components/os/MemorySidebar';
import { useWindowSnapping, type SnapZone } from '@/lib/hooks/useWindowSnapping';
import { Upload, Sparkles, FolderOpen, History, X, Search, FileText, LayoutList, Music2 } from 'lucide-react';
import { NAVIGATION_RESULT_EVENT, openNavigationOutcome, type NavigationOutcome } from '@/lib/utils/searchOpen';
import {
    MYCELIUM_BATCH_COMPLETE_EVENT,
    MYCELIUM_REVIEW_READY_EVENT,
    type MyceliumShellSummary,
    // Work-session surface is promoted; shell banner remains optional until the stream is polished:
    // WORK_SESSION_PLAN_EVENT,
    // type WorkSessionShellSummary,
    // getSessionBodyText,
    // getSessionExtendedNote,
    // getSessionRunningSignal,
} from '@/lib/utils/moraExplanation';

// Naming Conflict Modal (409 UX)
import NameConflictModal from '@/components/ui/NameConflictModal';
import { IntelligenceDiagnostics } from '@/components/dev/IntelligenceDiagnostics';

// =============================================================================
// LOADING SCREEN
// =============================================================================

const LoadingScreen: React.FC = () => (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#1a1135] to-[#0d0921] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.14),rgba(13,9,33,0)_40%)]" />
        <div className="flex flex-col items-center gap-6">
            <div className="relative">
                <IdentityMedallion
                    name="Demo"
                    role="system_owner"
                    size={64}
                    className="drop-shadow-[0_0_24px_rgba(16,185,129,0.18)]"
                />
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-emerald-400/60 text-xs font-medium tracking-[0.4em] uppercase">
                    SAIMÔR OS
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-6">
            <div className="h-px w-[min(42rem,58vw)] bg-gradient-to-r from-transparent via-emerald-400/26 to-transparent" />
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
        <div className="w-full h-screen bg-gradient-to-b from-[#0d0921] to-[#080618] flex items-center justify-center">
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
                                Netzwerkverbindung pruefen und Seite neu laden
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 mt-1.5 shrink-0" />
                            <div className="text-xs text-white/40">
                                Haelt das Problem an, bitte Support kontaktieren
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

                <div className="text-[9px] text-white/15 tracking-[0.3em] uppercase">SAIMÔR OS • Mora Core</div>
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

    type ShellNavigationOutcome = NavigationOutcome & {
        timestamp: number;
    };

    // Auth
    const { isBootstrapped, authError } = useAuthBootstrapper();

    // Boot timeout: if the shell hasn't bootstrapped within 12 s, the backend is likely
    // unreachable. Surface a clear error instead of spinning indefinitely.
    const [bootTimedOut, setBootTimedOut] = useState(false);
    useEffect(() => {
        if (isBootstrapped) return;
        const timer = window.setTimeout(() => setBootTimedOut(true), 12_000);
        return () => window.clearTimeout(timer);
    }, [isBootstrapped]);

    // Store — migrated to new stores
    const user = useSessionStore((s) => s.user);
    const resetStore = useSessionStore((s) => s.resetStore);
    const isLoggingOut = useSessionStore((s) => s.isLoggingOut);
    const viewMode = useNavStore((s) => s.viewMode);
    const viewLevel = useNavStore((s) => s.viewLevel);
    const coreMode = useNavStore((s) => s.coreMode);
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const storeOrbState = useOrbStore((s) => s.orbState);
    const { data: companiesData = [] } = useCompanies();
    const companies = companiesData;
    const { logout } = useAccountStore();
    const { reset: resetPanes, openPane } = usePaneStore();
    const visiblePaneCount = usePaneStore((state) => state.panes.reduce((count, pane) => count + (pane.minimized ? 0 : 1), 0));
    const isAdminMode = useContextStore((s) => s.isAdminMode);
    const setAdminMode = useContextStore((s) => s.setAdminMode);
    const safeCompanies = React.useMemo(() => (Array.isArray(companies) ? companies : []), [companies]);

    const activeCompany = safeCompanies.find(c => c.id === activeCompanyId);
    const role = user?.role || 'demo';
    const tenantId = user?.tenant_id;
    const surfaceProfile = useSurfaceProfile();
    const websiteEntryContext = useWebsiteEntryContext();
    const isWebsiteEntrySurface = Boolean(websiteEntryContext);
    const isPublicDemoSurface = surfaceProfile.isPublicDemoSurface && !isWebsiteEntrySurface;

    const preferredSurfaceCompany = React.useMemo(
        () => getPrimaryOperationalCompany(safeCompanies),
        [safeCompanies]
    );

    const filteredCompanies = React.useMemo(() => {
        return filterCompaniesForSurface(safeCompanies, {
            surfaceProfile,
            role,
            tenantId,
            viewMode,
        });
    }, [safeCompanies, surfaceProfile, viewMode, role, tenantId]);

    const activeCompanyForView = React.useMemo(() => {
        if (filteredCompanies.length === 0) return activeCompany;
        return filteredCompanies.find((c) => c.id === activeCompanyId) || filteredCompanies[0];
    }, [filteredCompanies, activeCompanyId, activeCompany]);

    const displayCompany = React.useMemo(() => {
        const baseCompany = activeCompanyForView || activeCompany;
        
        // If we have a website context, it should dominate the UI experience in demo mode
        if (websiteEntryContext?.companyName) {
            const contextId = websiteEntryContext.id || 'current-scan';
            const previewTenant = `tenant-preview-${contextId}`;
            
            if (!baseCompany || baseCompany.is_demo || baseCompany.id.includes('demo')) {
                return {
                    id: `scan-${contextId}`,
                    tenant_id: user?.tenant_id && user.tenant_id !== TENANT_DEMO ? user.tenant_id : previewTenant,
                    owner_id: user?.id || 'demo-user',
                    name: websiteEntryContext.companyName,
                    slug: websiteEntryContext.companyName.toLowerCase().replaceAll(' ', '-'),
                    description: websiteEntryContext.summary || `Personalisiertes Dossier für ${websiteEntryContext.companyName}`,
                    logo_url: null,
                    settings: null,
                    is_demo: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            }

            // If we're logged in with a real company but came from a scan, merge the names
            return {
                ...baseCompany,
                name: websiteEntryContext.companyName,
            };
        }
        
        return baseCompany;
    }, [activeCompany, activeCompanyForView, user?.id, user?.tenant_id, websiteEntryContext]);
    const displayCompanies = React.useMemo(() => {
        if (!displayCompany || !websiteEntryContext?.companyName) return filteredCompanies;
        return [
            displayCompany,
            ...filteredCompanies.filter((company) => company.id !== displayCompany.id),
        ];
    }, [displayCompany, filteredCompanies, websiteEntryContext?.companyName]);
    const hasDemoCompany = safeCompanies.some((c) => c.is_demo);
    const visibleModes = React.useMemo<UniverseViewMode[]>(() => {
        if (isPublicDemoSurface) {
            return hasDemoCompany ? ['demo'] : ['workspace'];
        }
        if (surfaceProfile.isLocalTruthSurface || surfaceProfile.isHqSurface) {
            // Single-deployment surfaces: workspace only — no demo mode clutter.
            return ['workspace'];
        }
        if (role === 'system_owner') {
            return hasDemoCompany ? ['owner', 'workspace', 'demo'] : ['owner', 'workspace'];
        }
        return hasDemoCompany ? ['workspace', 'demo'] : ['workspace'];
    }, [role, hasDemoCompany, isPublicDemoSurface, surfaceProfile.isLocalTruthSurface, surfaceProfile.isHqSurface]);
    const scopeLabel = React.useMemo(() => {
        if (viewLevel === 'company') return 'Portfolio';
        if (viewLevel === 'core') return 'Universe';
        if (viewLevel === 'department') return 'Department';
        if (viewLevel === 'space') return 'Space';
        if (viewLevel === 'folder') return 'Folder';
        return 'Universe';
    }, [viewLevel]);
    const workspaceTabLabel = surfaceProfile.workspaceTabLabel;

    useEffect(() => {
        if (!isPublicDemoSurface || !hasDemoCompany || viewMode === 'demo') return;
        useNavStore.getState().setViewMode('demo');
    }, [isPublicDemoSurface, hasDemoCompany, viewMode]);

    useEffect(() => {
        const isSingleCompanySurface = surfaceProfile.isLocalTruthSurface || surfaceProfile.isHqSurface;
        if (!isSingleCompanySurface || !safeCompanies.length) return;

        if (viewMode !== 'workspace') {
            useNavStore.getState().setViewMode('workspace');
        }

        if (preferredSurfaceCompany && activeCompanyId !== preferredSurfaceCompany.id) {
            useNavStore.getState().setActiveCompany(preferredSurfaceCompany.id);
        }
    }, [activeCompanyId, preferredSurfaceCompany, safeCompanies.length, surfaceProfile.isHqSurface, surfaceProfile.isLocalTruthSurface, viewMode]);

    useEffect(() => {
        if (isPublicDemoSurface && isAdminMode) {
            setAdminMode(false);
        }
    }, [isPublicDemoSurface, isAdminMode, setAdminMode]);

    const effectiveAdminMode = isAdminMode && !isPublicDemoSurface;

    // Local State
    const [isSleeping, setIsSleeping] = useState(false);
    // 1.0 gated: ResonanceRoom state removed (future-tier surface)
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [activeSnapZone, setActiveSnapZone] = useState<SnapZone>(null);
    const [hasFullscreenPane, setHasFullscreenPane] = useState(false);
    const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
    // Drop state machine — mutually exclusive phases prevent drift between two old booleans.
    // idle: no drag in progress.  dragging: files held over shell.  batch_ready: dropped.
    const [shellDrop, setShellDrop] = useState<
        | { phase: 'idle' }
        | { phase: 'dragging' }
        | { phase: 'batch_ready'; batchId: string; files: MyceliumDropVisualFile[] }
    >({ phase: 'idle' });
    const isShellDropActive = shellDrop.phase === 'dragging';
    const myceliumDropBatch  = shellDrop.phase === 'batch_ready' ? shellDrop : null;
    const [myceliumSummary, setMyceliumSummary] = useState<MyceliumShellSummary | null>(null);
    // workSessionSummary — banner wiring is still parked; pane opening is live through work-session.
    const [navigationOutcome, setNavigationOutcome] = useState<ShellNavigationOutcome | null>(null);
    const shellDropDepthRef = useRef(0);
    const fullscreenPaneIdsRef = useRef<Set<string>>(new Set());
    const activeSnapZoneRef = useRef<SnapZone>(null);
    const isUniverseExploreSurface = viewLevel === 'core' && coreMode === 'explore';
    const pauseHeavyBackground = viewLevel !== 'core' || hasFullscreenPane || isSpotlightOpen || isShortcutsOpen || visiblePaneCount > 1;

    // Window Snapping
    const windowSnapping = useWindowSnapping();
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
                activeSnapZoneRef.current = zone;
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
            const snapZone = activeSnapZoneRef.current;
            if (paneId && snapZone) {
                applySnap(paneId, snapZone);
            }
            activeSnapZoneRef.current = null;
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
    }, [detectSnapZone, applySnap]);

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

    useEffect(() => {
        const handleMyceliumReview = (event: Event) => {
            const detail = (event as CustomEvent<MyceliumShellSummary>).detail;
            if (!detail) return;
            setMyceliumSummary(detail);
        };
        window.addEventListener(MYCELIUM_REVIEW_READY_EVENT, handleMyceliumReview as EventListener);
        return () => window.removeEventListener(MYCELIUM_REVIEW_READY_EVENT, handleMyceliumReview as EventListener);
    }, []);

    useEffect(() => {
        const handleMyceliumComplete = (event: Event) => {
            const detail = (event as CustomEvent<MyceliumShellSummary>).detail;
            if (!detail) return;
            setMyceliumSummary(detail);
        };
        window.addEventListener(MYCELIUM_BATCH_COMPLETE_EVENT, handleMyceliumComplete as EventListener);
        return () => window.removeEventListener(MYCELIUM_BATCH_COMPLETE_EVENT, handleMyceliumComplete as EventListener);
    }, []);

    useEffect(() => {
        const handleNavigationResult = (event: Event) => {
            const detail = (event as CustomEvent<NavigationOutcome>).detail;
            if (!detail) return;
            setNavigationOutcome({
                ...detail,
                timestamp: Date.now(),
            });
        };
        window.addEventListener(NAVIGATION_RESULT_EVENT, handleNavigationResult as EventListener);
        return () => window.removeEventListener(NAVIGATION_RESULT_EVENT, handleNavigationResult as EventListener);
    }, []);

    // WORK_SESSION_PLAN_EVENT listener — parked until the shell banner is product-polished.

    // Hooks
    const apiOrbState = useAwareness();
    useMindloopStream(isBootstrapped);

    useShellEvents({});

    useRealtime(isBootstrapped);
    useMoraExecutions(isBootstrapped); // P4: realtime execution events → window bus + orb
    useMoraSpeaks(); // Sprint 2: urgent KAIROS signals → auto-open chat with proactive message
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
        // 1.0 gated: Terminal, MoraHub, Memory shortcuts disabled (future-tier)
        onGoHome: useCallback(() => {
            useNavStore.getState().navigateToCore();
        }, []),
        onOpenAmbient: useCallback(() => {
            useNavStore.getState().navigateToAmbient();
        }, []),
        onOpenLarry: useCallback(() => {
            window.open('https://dash.saimor.world', '_blank');
        }, []),
        onCloseTopPane: useCallback(() => {
            const { panes, removePane: rp } = usePaneStore.getState();
            const visiblePanes = panes.filter(p => !p.minimized);
            if (visiblePanes.length > 0) {
                rp(visiblePanes[visiblePanes.length - 1].id);
            }
        }, []),
        onShowShortcuts: useCallback(() => setIsShortcutsOpen(prev => !prev), []),
    });

    // 1.0 gated: useMemorySidebarShortcut() removed with MemorySidebar

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
        setShellDrop({ phase: 'idle' });
    }, []);

    const handleShellDragEnter = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        shellDropDepthRef.current += 1;
        setShellDrop({ phase: 'dragging' });
    }, [isFileDragEvent, isLocalFileDropTarget]);

    const handleShellDragOver = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        if (shellDrop.phase !== 'dragging') setShellDrop({ phase: 'dragging' });
    }, [isFileDragEvent, isLocalFileDropTarget, shellDrop.phase]);

    const handleShellDragLeave = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        shellDropDepthRef.current = Math.max(0, shellDropDepthRef.current - 1);
        if (shellDropDepthRef.current === 0) {
            setShellDrop({ phase: 'idle' });
        }
    }, [isFileDragEvent, isLocalFileDropTarget]);

    const handleShellDrop = useCallback((event: React.DragEvent) => {
        if (!isFileDragEvent(event) || isLocalFileDropTarget(event.target)) return;
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files || []);
        resetShellDrop();
        if (files.length === 0) return;

        const batchId = `mycelium-${Date.now()}`;
        setShellDrop({
            phase: 'batch_ready',
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

    const handleLogout = async () => {
        setIsSleeping(false);
        await authLogout();
        clearClientSessionArtifacts();
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

    const reopenNavigationOutcome = useCallback((outcome: ShellNavigationOutcome) => {
        openNavigationOutcome(outcome, openPane);
    }, [openPane]);

    // Computed
    const finalOrbState: OrbState = viewMode === 'demo'
        ? 'demo'
        : (storeOrbState === 'idle' && apiOrbState !== 'idle'
            ? apiOrbState
            : (storeOrbState || apiOrbState));
    const primaryMyceliumRoute = myceliumSummary?.routes.length === 1 ? myceliumSummary.routes[0] : null;

    // ==========================================================================
    // RENDER
    // ==========================================================================

    // Loading
    if (authError) {
        return <ErrorScreen message={authError} />;
    }

    if (!isBootstrapped) {
        if (bootTimedOut) {
            return (
                <ErrorScreen message="CORE-Backend antwortet nicht. Starte den Server neu (bash scripts/start-local-truth.sh) oder prüfe deine Netzwerkverbindung." />
            );
        }
        return <LoadingScreen />;
    }

    // Lock Screen
    if (isSleeping) {
        return (
            <LockScreen
                onUnlock={handleUnlock}
                onLogout={handleLogout}
                userName={user?.name || localStorage.getItem('last_user_name') || 'Benutzer'}
                companyName={displayCompany?.name || surfaceProfile.fallbackCompanyName}
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
            <AmbientAudioController />
            <InteractionAudioController />
            {/* MoraPulsePanel hidden — ambient context lives in HomeSurface now */}

            {/* V12: Connection Status, Quick Tips, Greeting & Stats */}
            <ConnectionBanner />
            <QuickTips />
            <MoraGreeting />
            <SystemStats />

            {/* ================================================================
                LAYER 1: BACKGROUND
            ================================================================= */}

            {/* Cosmic Dawn Foundation — deep indigo void */}
            <div
                className="fixed inset-0 z-[-10]"
                style={{
                    background: 'radial-gradient(ellipse 140% 80% at 50% 0%, hsl(248 45% 12%) 0%, hsl(248 48% 7%) 55%, hsl(248 52% 4%) 100%)',
                }}
            />
            <MoraLivingBackground />
            <TemporalAtmosphere paused={pauseHeavyBackground} />

            {/* Background Layers */}
            {!isUniverseExploreSurface && <ForestLightCanopy orbState={finalOrbState} demoMode={viewMode === 'demo'} />}
            <StarField
                density={isUniverseExploreSurface ? 'low' : viewLevel === 'core' ? 'medium' : 'medium'}
                opacity={0.97}
                paused={pauseHeavyBackground}
            />

            {/* Neural Grid — Tesla-style tech texture, reacts to Mora state */}
            <NeuralGrid active={!pauseHeavyBackground} state={finalOrbState} />

            {/* Ambient Dust — floating emerald particles for depth */}
            <AmbientDust
                count={32}
                color="rgba(16, 185, 129, 0.07)"
                sizeRange={[0.8, 2.5]}
                durationRange={[18, 36]}
                opacity={0.28}
            />

            {/* ================================================================
                LAYER 2: MAIN CONTENT
            ================================================================= */}

            <div className="relative z-10 w-full h-full flex items-stretch">

                {/* Universe ViewMode / Context Switches */}
                <UniverseControls
                    viewMode={viewMode}
                    setViewMode={(mode) => {
                        useNavStore.getState().setViewMode(mode);
                    }}
                    activeCompany={displayCompany}
                    companies={displayCompanies}
                    onSwitchCompany={(id) => useNavStore.getState().setActiveCompany(id)}
                    visibleModes={visibleModes}
                    workspaceLabel={websiteEntryContext ? 'Dossier' : workspaceTabLabel}
                    scopeLabel={scopeLabel}
                    disableContextSwitch={isPublicDemoSurface || Boolean(websiteEntryContext)}
                    companyCountLabel={websiteEntryContext ? 'Dossier' : surfaceProfile.isPublicDemoSurface ? 'Demo' : undefined}
                    isWebsiteEntryContext={Boolean(websiteEntryContext)}
                    contextLabelOverride={websiteEntryContext ? 'Dossier' : undefined}
                    contextSubtitleOverride={websiteEntryContext ? 'Website-Check im HQ' : undefined}
                />

                {!hasFullscreenPane && (
                    <div className="pointer-events-auto absolute right-8 top-32 z-[48] hidden items-center gap-2 lg:flex">
                        <button
                            type="button"
                            onClick={() => setIsSpotlightOpen(true)}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/12 bg-cyan-100/[0.045] text-cyan-50/62 shadow-[0_14px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[18px] transition-all hover:border-cyan-200/28 hover:bg-cyan-200/[0.09] hover:text-cyan-50"
                            title="Suche öffnen"
                            aria-label="Suche öffnen"
                        >
                            <Search size={17} strokeWidth={1.6} />
                        </button>
                        <button
                            type="button"
                            onClick={() => openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 }, data: { section: 'audio' } })}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-200/12 bg-violet-100/[0.045] text-violet-50/62 shadow-[0_14px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-[18px] transition-all hover:border-violet-200/28 hover:bg-violet-200/[0.09] hover:text-violet-50"
                            title="Audio öffnen"
                            aria-label="Audio öffnen"
                        >
                            <Music2 size={17} strokeWidth={1.6} />
                        </button>
                    </div>
                )}

                {/* Shell-level breadcrumb — visible inside dept/space/folder layers */}

                {/* ViewPort - Routes to Universe/Department/Space/Folder */}
                <div className="flex-1 relative h-full w-full">
                    <div className="pointer-events-none absolute left-6 bottom-28 z-30">
                        <ShellBreadcrumb />
                    </div>
                    {effectiveAdminMode ? (
                        <AdminHome />
                    ) : (
                        <ViewPort />
                    )}

                    {/* Bottom Gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none z-10" />
                </div>
            </div>

            {/* ================================================================
                LAYER 3: UI OVERLAYS
            ================================================================= */}

            {/* Resonance Room — 1.0 gated (future-tier surface) */}

            {/* MoraInsightPopup — 1.0 gated (future-tier: insight events surface) */}

            {/* Dock (Bottom Navigation) */}
            {!hasFullscreenPane && <Dock />}

            {/* First-visit Mora greeting (one-time, localStorage-gated) */}
            {!hasFullscreenPane && <MoraGreetingBubble />}

            {/* First-run tour: 3-step spotlight, appears 9s after first login */}
            {!hasFullscreenPane && <FirstRunTour />}

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

            {/* Memory Sidebar — 1.0 gated (future-tier surface) */}

            {/* === PREMIUM INTELLIGENCE LAYER === */}
            {/*
             * V11 CLEANUP: Removed MoraIntelligenceBar + MoraThoughtStream
             * Status is now shown next to the Orb (see below)
             * Intelligence Dashboard merged into Mora Nexus Pane
             */}

            {/* Mora controls are integrated in Dock command center. */}

            {/* ================================================================
                LAYER 4: INTERACTION
            ================================================================= */}

            {/* Cursor effects — CursorAgent, AgencyCursor, CursorTrailEffect, GhostOverlay: 1.0 gated (future-tier) */}
            {!isLoggingOut && <UserCursor enabled={true} />}

            <MyceliumDropfield
                active={shellDrop.phase === 'batch_ready'}
                files={myceliumDropBatch?.files || []}
                onComplete={() => setShellDrop({ phase: 'idle' })}
            />

            {navigationOutcome && !isShellDropActive && (
                <div className={`fixed left-1/2 z-[928] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 ${myceliumSummary ? 'bottom-[17.5rem]' : 'bottom-24'}`}>
                    <div className="rounded-[24px] border border-cyan-400/18 bg-black/70 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
                        <div className="flex items-start gap-4 px-5 py-4">
                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-500/12">
                                {navigationOutcome.targetType === 'search' ? (
                                    <Search className="h-5 w-5 text-cyan-200" />
                                ) : navigationOutcome.targetType === 'node' ? (
                                    <FileText className="h-5 w-5 text-cyan-200" />
                                ) : (
                                    <FolderOpen className="h-5 w-5 text-cyan-200" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70 font-semibold">
                                            Mora zeigt dir
                                        </div>
                                        <div className="mt-1 text-sm text-white/82">
                                            {navigationOutcome.message}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNavigationOutcome(null)}
                                        className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                                        aria-label="Navigationshinweis schließen"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {(navigationOutcome.label || navigationOutcome.path) && (
                                    <div className="mt-3 rounded-2xl border border-cyan-400/12 bg-black/18 px-3.5 py-3">
                                        {navigationOutcome.label && (
                                            <div className="text-sm text-white/84">
                                                {navigationOutcome.label}
                                            </div>
                                        )}
                                        {navigationOutcome.path && (
                                            <div className="mt-1 text-xs leading-relaxed text-white/50">
                                                {navigationOutcome.path}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => reopenNavigationOutcome(navigationOutcome)}
                                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/14 px-3.5 py-2 text-[11px] font-medium text-cyan-50 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/22"
                                    >
                                        {navigationOutcome.targetType === 'search' ? <Search size={13} /> : navigationOutcome.targetType === 'node' ? <FileText size={13} /> : <FolderOpen size={13} />}
                                        {navigationOutcome.targetType === 'search'
                                            ? 'Suche öffnen'
                                            : navigationOutcome.targetType === 'node'
                                                ? 'Datei öffnen'
                                                : 'Im Finder öffnen'}
                                    </button>
                                    {navigationOutcome.targetType === 'node' && navigationOutcome.folderId && (
                                        <button
                                            type="button"
                                            onClick={() => openNavigationOutcome({
                                                ...navigationOutcome,
                                                targetType: 'folder',
                                                title: 'Ordner geöffnet',
                                                message: `Ich habe ${navigationOutcome.label || 'den Zielordner'} im Finder geöffnet.`,
                                                nodeId: undefined,
                                                folderId: navigationOutcome.folderId,
                                            }, openPane)}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                                        >
                                            <FolderOpen size={13} />
                                            Im Zielordner öffnen
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {myceliumSummary && !isShellDropActive && (
                <div className="fixed bottom-24 left-1/2 z-[930] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2">
                    <div className="rounded-[24px] border border-emerald-400/18 bg-black/70 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
                        <div className="flex items-start gap-4 px-5 py-4">
                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/12">
                                {myceliumSummary.phase === 'review' ? (
                                    <Upload className="h-5 w-5 text-emerald-300" />
                                ) : (
                                    <Sparkles className="h-5 w-5 text-emerald-300" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/70 font-semibold">
                                            Mora zeigt dir
                                        </div>
                                        <div className="mt-1 text-sm text-white/82">
                                            {myceliumSummary.phase === 'review'
                                                ? `${myceliumSummary.pending || myceliumSummary.total} ${myceliumSummary.total === 1 ? 'Datei wartet' : 'Dateien warten'} auf Einordnung. Mora hat einen Zielvorschlag vorbereitet.`
                                                : `${myceliumSummary.confirmed || 0} eingeordnet, ${myceliumSummary.rejected || 0} verworfen.${myceliumSummary.total > 1
                                                    ? ` ${myceliumSummary.total} Dateien wurden im Intake-Lauf bearbeitet.`
                                                    : ' 1 Datei wurde im Intake-Lauf bearbeitet.'}`}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMyceliumSummary(null)}
                                        className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                                        aria-label="Mycelium summary schließen"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {myceliumSummary.routes.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {myceliumSummary.routes.slice(0, 3).map((route) => (
                                            <div
                                                key={`${route.path}:${route.folderId || 'unknown'}`}
                                                className="rounded-full border border-emerald-400/12 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100/85"
                                            >
                                                {route.path || 'Unbekannter Pfad'}
                                            </div>
                                        ))}
                                        {myceliumSummary.routes.length > 3 && (
                                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/45">
                                                +{myceliumSummary.routes.length - 3} weitere Ziele
                                            </div>
                                        )}
                                    </div>
                                )}

                                {myceliumSummary.primaryFile?.routeExplanation?.reason && (
                                    <div className="mt-3 rounded-2xl border border-emerald-400/12 bg-black/18 px-3.5 py-3">
                                        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/65 font-semibold">
                                            {myceliumSummary.phase === 'review' ? 'Warum dieser Vorschlag' : 'Warum dort'}
                                        </div>
                                        {myceliumSummary.primaryFile.routeExplanation.headline && (
                                            <div className="mt-1 text-sm text-white/82">
                                                {myceliumSummary.primaryFile.routeExplanation.headline}
                                            </div>
                                        )}
                                        <div className="mt-1 text-xs leading-relaxed text-white/56">
                                            {myceliumSummary.primaryFile.routeExplanation.reason}
                                        </div>
                                        {myceliumSummary.primaryFile.routeExplanation.learning_summary && (
                                            <div className="mt-2 text-[11px] leading-relaxed text-emerald-100/60">
                                                {myceliumSummary.primaryFile.routeExplanation.learning_summary}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {myceliumSummary.phase === 'complete' && primaryMyceliumRoute?.folderId && (
                                        <button
                                            type="button"
                                            onClick={() => openPane({
                                                id: 'finder-main',
                                                type: 'finder',
                                                title: 'Finder',
                                                size: { width: 1280, height: 820 },
                                                data: {
                                                    folderId: primaryMyceliumRoute.folderId,
                                                    companyId: myceliumSummary.companyId || undefined,
                                                },
                                            })}
                                            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/14 px-3.5 py-2 text-[11px] font-medium text-emerald-100 transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/22"
                                        >
                                            <FolderOpen size={13} />
                                            Im Zielordner öffnen
                                        </button>
                                    )}
                                    {myceliumSummary.phase === 'complete' && myceliumSummary.primaryFile?.nodeId && (
                                        <button
                                            type="button"
                                            onClick={() => openNavigationOutcome({
                                                title: 'Datei geöffnet',
                                                message: `Ich habe ${myceliumSummary.primaryFile?.name || 'das Dokument'} geöffnet.`,
                                                targetType: 'node',
                                                label: myceliumSummary.primaryFile?.name || 'Dokument',
                                                companyId: myceliumSummary.companyId || undefined,
                                                folderId: myceliumSummary.primaryFile?.folderId,
                                                nodeId: myceliumSummary.primaryFile?.nodeId,
                                                source: 'search',
                                            }, openPane)}
                                            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/14 px-3.5 py-2 text-[11px] font-medium text-emerald-100 transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/22"
                                        >
                                            <FileText size={13} />
                                            Datei öffnen
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => openPane({
                                            id: 'scanner-main',
                                            type: 'scanner',
                                            title: 'Mycelium Intake',
                                            size: { width: 920, height: 640 },
                                            data: {
                                                source: 'mycelium',
                                                batchId: myceliumSummary.batchId,
                                            },
                                        })}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                                    >
                                        <Sparkles size={13} />
                                        Einordnung ansehen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openPane({
                                            id: 'actions-main',
                                            type: 'actions',
                                            title: 'Action Center',
                                            size: { width: 920, height: 680 },
                                        })}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                                    >
                                        <History size={13} />
                                        Verlauf ansehen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WorkSession banner — parked while the promoted work-session pane carries the product surface
            {workSessionSummary && !isShellDropActive && (
                <div className={`fixed left-1/2 z-[929] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 ${myceliumSummary ? 'bottom-[31rem]' : navigationOutcome ? 'bottom-[14.5rem]' : 'bottom-24'}`}>
                    {(() => {
                        const isRunning = workSessionSummary.state === 'running';
                        const isWaiting = workSessionSummary.state === 'waiting_confirmation';
                        const isDone    = workSessionSummary.state === 'done';
                        const runningSignal = isRunning ? getSessionRunningSignal(workSessionSummary) : null;
                        return (
                    <div className={`rounded-[24px] border bg-black/70 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden ${isRunning ? 'border-blue-400/28' : isWaiting ? 'border-amber-400/28' : isDone ? 'border-white/8' : 'border-violet-400/18'}`}>
                        <div className="flex items-start gap-4 px-5 py-4">
                            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/12">
                                <LayoutList className="h-5 w-5 text-violet-200" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className={`text-[11px] uppercase tracking-[0.24em] font-semibold ${isRunning ? 'text-blue-200/70' : isWaiting ? 'text-amber-200/70' : isDone ? 'text-white/30' : 'text-violet-200/70'}`}>
                                            {isRunning ? 'Läuft gerade' : isWaiting ? 'Freigabe erforderlich' : isDone ? 'Abgeschlossen' : 'Mora zeigt dir'}
                                        </div>
                                        {isRunning && (
                                            <div className="mb-2 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400/80 animate-pulse shrink-0" />
                                                    <span className="text-sm text-white/78">
                                                        {runningSignal?.primaryText}
                                                    </span>
                                                </div>
                                                {runningSignal?.secondaryText && (
                                                    <div className="ml-[14px] mt-1 text-[11px] text-white/38">
                                                        {runningSignal.secondaryText}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {isWaiting && (
                                            <div className="flex items-center gap-2 mb-2 mt-1 px-3 py-2 rounded-lg border border-amber-400/14 bg-amber-500/[0.06]">
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-400/80 shrink-0" />
                                                <div>
                                                    <span className="text-sm text-amber-100/75">
                                                        {workSessionSummary.next_message
                                                            ?? workSessionSummary.pending_confirmation_title
                                                            ?? 'Mora wartet auf deine Entscheidung'}
                                                    </span>
                                                    {workSessionSummary.next_label && (
                                                        <div className="text-[10px] text-amber-200/50 mt-0.5">
                                                            {workSessionSummary.next_label}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {!isRunning && !isWaiting && (
                                            <div className="mt-1 text-sm text-white/82">
                                                <span>{getSessionBodyText(workSessionSummary)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setWorkSessionSummary(null)}
                                        className="rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                                        aria-label="Arbeitsplan-Hinweis schließen"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                <div className="mt-3 rounded-2xl border border-violet-400/12 bg-black/18 px-3.5 py-3">
                                    <div className="text-sm text-white/84">
                                        {workSessionSummary.title}
                                    </div>
                                    {workSessionSummary.summary && (
                                        <div className="mt-1 text-xs leading-relaxed text-white/56">
                                            {workSessionSummary.summary}
                                        </div>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {workSessionSummary.scope?.view_level && (
                                            <div className="rounded-full border border-violet-400/12 bg-violet-500/10 px-3 py-1 text-[11px] text-violet-100/85">
                                                {workSessionSummary.scope.view_level}
                                            </div>
                                        )}
                                        {typeof workSessionSummary.stats?.read_steps === 'number' && (
                                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/55">
                                                Lesen {workSessionSummary.stats.read_steps}
                                            </div>
                                        )}
                                        {typeof workSessionSummary.stats?.write_steps === 'number' && (
                                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/55">
                                                Schreiben {workSessionSummary.stats.write_steps}
                                            </div>
                                        )}
                                        {(workSessionSummary.stats?.pending_confirmations || 0) > 0 && (
                                            <div className="rounded-full border border-amber-400/15 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-100/85">
                                                Freigaben {workSessionSummary.stats?.pending_confirmations}
                                            </div>
                                        )}
                                    </div>
                                    {workSessionSummary.transparencyNote && (
                                        <div className="mt-3 text-[11px] leading-relaxed text-white/42">
                                            {workSessionSummary.transparencyNote}
                                        </div>
                                    )}
                                    {(() => {
                                        const note = getSessionExtendedNote(workSessionSummary);
                                        return note ? (
                                            <div className="mt-2 text-[11px] leading-relaxed text-violet-200/45">
                                                {note}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openPane({
                                            id: `work-session-${workSessionSummary.planId}`,
                                            type: 'work-session',
                                            title: workSessionSummary.title || 'Arbeitsplan',
                                            size: { width: 900, height: 700 },
                                            data: { plan_id: workSessionSummary.planId },
                                        })}
                                        className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/14 px-3.5 py-2 text-[11px] font-medium text-violet-50 transition-colors hover:border-violet-300/35 hover:bg-violet-500/22"
                                    >
                                        <LayoutList size={13} />
                                        Arbeitsplan öffnen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openPane({
                                            id: 'actions-main',
                                            type: 'actions',
                                            title: 'Action Center',
                                            size: { width: 920, height: 680 },
                                        })}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-medium text-white/72 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                                    >
                                        <History size={13} />
                                        Verlauf ansehen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                        );
                    })()}
                </div>
            )} */}

            {/* Website context banner (surfaced from landing page check) */}
            <WebsiteContextBanner />

            {/* Name Conflict Modal (409 UX) */}
            <NameConflictModal />

            {/* Dev-only intelligence diagnostics panel -- hidden in prod unless ?diagnostics=1 */}
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
                                und führt die bestätigte Ablage später im Dateibaum aus.
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
            {/* P4: Execution toast for off-screen pane actions */}
            <ExecutionToast />
        </div>
    );
};

export default MoraShell;
