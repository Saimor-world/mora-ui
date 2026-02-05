"use client";

/**
 * MoraShell - Main OS Shell Component
 * ====================================
 *
 * This is the heart of SAIMÔR OS. All other components orbit around it.
 *
 * STRUCTURE:
 * 1. Background Layers (StarField, Mycelium)
 * 2. Main Content (ViewPort - handles view routing)
 * 3. UI Overlays (Dock, Orb, Resonance, Spotlight)
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
import { usePaneStore } from '@/lib/store/paneStore'; // Added PaneStore
import { useAccountStore } from '@/lib/auth/useAccount';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
import { resetUserState } from '@/lib/hooks/useUser';
import type { OrbState } from '@/lib/api/awarenessClient';

// Shell Hooks
import {
    useShellEvents,
    useAwareness,
    useRealtime,
    useKeyboardShortcuts
} from '@/lib/hooks/shell';

// Layout Components
import { ViewPort } from '@/components/layout/ViewPort';

// Background Layers
import { StarField } from '@/components/visual/StarField';
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlay';
import { ForestLightCanopy } from '@/components/visual/ForestLightCanopy';

// UI Components
import { Dock } from '@/components/mora/Dock';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { ResonanceRoom } from '@/components/mora/ResonanceRoom';
import { Spotlight } from '@/components/mora/Spotlight';
import { NodeDetailPanel } from '@/components/organic/NodeDetailPanel';
import { LockScreen } from '@/components/auth/LockScreen';
// MemberFocusPane removed from shell; Mora Hub opens via Orb only

// Interaction Layers
import { CursorAgent } from '@/components/mora/CursorAgent';
import { AgencyCursor } from '@/components/agency/AgencyCursor';
import { GhostOverlay } from '@/components/mora/GhostOverlay';
import { UserCursor } from '@/components/layout/UserCursor';
import { UniverseControls } from '@/components/home/UniverseControls';

// =============================================================================
// LOADING SCREEN
// =============================================================================

const LoadingScreen: React.FC = () => (
    <div className="w-full h-screen bg-[#030806] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-emerald-500/50 text-sm font-light tracking-wider uppercase">
                INITIALISIERUNG...
            </span>
        </div>
    </div>
);

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="w-full h-screen bg-[#030806] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="text-red-400 text-xs tracking-[0.3em] uppercase">Core offline</div>
            <div className="text-white/70 text-sm max-w-md">{message}</div>
            <div className="text-white/40 text-xs">
                Start core: <span className="font-mono">python run.py</span>
            </div>
        </div>
    </div>
);

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
    const { reset: resetPanes, openPane, getPane, removePane } = usePaneStore(); // Pane Controls

      const activeCompany = companies.find(c => c.id === activeCompanyId);
      const role = user?.role || 'demo';
      const tenantId = user?.tenant_id;

      const filteredCompanies = React.useMemo(() => {
          if (!companies.length) return [];
          if (viewMode === 'demo') {
              return companies.filter((c) => c.is_demo);
          }
          if (viewMode === 'workspace') {
              if (tenantId === 'tenant-demo') {
                  return companies.filter((c) => c.tenant_id === 'tenant-saimor-hq');
              }
              if (role === 'system_owner') {
                  return companies.filter((c) => !c.is_demo);
              }
              return tenantId ? companies.filter((c) => c.tenant_id === tenantId) : companies;
          }
          // owner mode (system owner sees all, others see their tenant)
          if (role === 'system_owner') return companies;
          return tenantId ? companies.filter((c) => c.tenant_id === tenantId) : companies;
      }, [companies, viewMode, role, tenantId]);

      const activeCompanyForView = React.useMemo(() => {
          if (filteredCompanies.length === 0) return activeCompany;
          return filteredCompanies.find((c) => c.id === activeCompanyId) || filteredCompanies[0];
      }, [filteredCompanies, activeCompanyId, activeCompany]);

      const displayCompany = activeCompanyForView || activeCompany;

    // Local State
    const [isSleeping, setIsSleeping] = useState(false);
    const [isResonanceOpen, setIsResonanceOpen] = useState(false);
    const [isResonanceExpanded, setIsResonanceExpanded] = useState(false);
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

    // EFFECT: Clear panes when ViewMode changes (e.g. Workspace <-> Owner Dashboard)
    // This prevents "pollution" of sessions as requested by user.
    useEffect(() => {
        resetPanes();
    }, [viewMode, resetPanes]);

    // Hooks
    const apiOrbState = useAwareness();

    useShellEvents({
        onOpenResonance: useCallback(() => setIsResonanceOpen(true), [])
    });

    useRealtime(isBootstrapped);

    useKeyboardShortcuts({
        onToggleSpotlight: useCallback(() => setIsSpotlightOpen(prev => !prev), [])
    });

    // ... (cursor agent effect)

    // Handlers
    const handleUnlock = () => setIsSleeping(false);

    const handleLogout = () => {
        setIsSleeping(false);
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('mora_session');
        logout();
        resetUserState();
        resetStore();
        resetPanes();
        router.push('/');
    };

    // Orb Click Handler - Mora Hub only (no auto chat)
    const handleOrbClick = () => {
        const existing = getPane('mora-hub');
        if (existing) {
            removePane('mora-hub');
            return;
        }

        // Ensure only the hub opens (no auto chat pane)
        const chatPane = getPane('chat-main');
        if (chatPane) {
            removePane('chat-main');
        }

        const hubSize = { width: 520, height: 760 };
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const margin = 24;
        const x = Math.max(margin, windowWidth - hubSize.width - 64);
        const y = Math.max(margin, windowHeight - hubSize.height - 140);

        openPane({
            id: 'mora-hub',
            type: 'mora-hub',
            title: 'Mora',
            size: hubSize,
            position: { x, y }
        });
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
        : (storeOrbState || apiOrbState);

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

            {/* ================================================================
                LAYER 1: BACKGROUND
            ================================================================= */}

            {/* 1. Deep Void Foundation */}
            <div className="fixed inset-0 bg-black z-[-10]" />

            {/* 1. BACKGROUND LAYERS */}
            {/* V10.7: ForestLightCanopy now handles stars and constellations. StarField disabled for calmness. */}
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
                  />

                {/* Company Indicator (Simplified fallback or removed if Controls are active) */}

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

            {/* Resonance Room (Visible ONLY if manually triggered via other means, effectively replaced by Chat Pane for Orb click) */}
            <ResonanceRoom
                isOpen={isResonanceOpen}
                onClose={() => setIsResonanceOpen(false)}
                onToggleExpand={() => setIsResonanceExpanded(!isResonanceExpanded)}
                isExpanded={isResonanceExpanded}
            />

            {/* Dock (Bottom Navigation) - Primary navigation */}
            <Dock />

            {/* ... */}

            {/* Spotlight (Cmd+K) */}
            <Spotlight
                isOpen={isSpotlightOpen}
                onClose={() => setIsSpotlightOpen(false)}
            />

            {/* Mora Orb */}
            <div id="mora-system-hub" className="fixed bottom-16 right-16 z-[500] pointer-events-auto flex flex-col items-end gap-4 overflow-visible">
                <MoraOrb
                    state={finalOrbState}
                    role={role === 'owner' || role === 'admin' ? 'admin' : 'member'}
                    demoMode={viewMode === 'demo'}
                    notifications={orbNotifications}
                    onClick={handleOrbClick}
                />
            </div>

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

            {/* Logout Transition Overlay */}
            {
                isLoggingOut && (
                    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-xs uppercase tracking-[0.4em] text-emerald-400/80 mb-3">
                                Logging Out
                            </div>
                            <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent animate-pulse mx-auto" />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MoraShell;

