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
import { useAccountStore } from '@/lib/auth/useAccount';
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';
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

// Interaction Layers
import { CursorAgent } from '@/components/mora/CursorAgent';
import { AgencyCursor } from '@/components/agency/AgencyCursor';
import { GhostOverlay } from '@/components/mora/GhostOverlay';
import { UserCursor } from '@/components/layout/UserCursor';

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
        orbState: storeOrbState,
        orbNotifications,
        activeCompanyId,
        companies,
        resetStore,
        isLoggingOut
    } = useMoraStore();
    const { logout } = useAccountStore();

    const activeCompany = companies.find(c => c.id === activeCompanyId);
    const role = user?.role || 'demo';

    // Local State
    const [isSleeping, setIsSleeping] = useState(false);
    const [isResonanceOpen, setIsResonanceOpen] = useState(false);
    const [isResonanceExpanded, setIsResonanceExpanded] = useState(false);
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

    // Hooks
    const apiOrbState = useAwareness();

    useShellEvents({
        onOpenResonance: useCallback(() => setIsResonanceOpen(true), [])
    });

    useRealtime(isBootstrapped);

    useKeyboardShortcuts({
        onToggleSpotlight: useCallback(() => setIsSpotlightOpen(prev => !prev), [])
    });

    // Cursor Agent Roaming
    useEffect(() => {
        if (isBootstrapped) {
            const timer = setTimeout(() => {
                setCursorAgent({ active: true, action: 'roam' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isBootstrapped, setCursorAgent]);

    // Handlers
    const handleUnlock = () => setIsSleeping(false);

    const handleLogout = () => {
        setIsSleeping(false);
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('mora_session');
        logout();
        resetStore();
        router.push('/');
    };

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
                companyName={activeCompany?.name || 'Workspace'}
            />
        );
    }

    // Main Shell
    return (
        <div className="relative w-full h-full overflow-hidden bg-black text-white select-none">

            {/* ================================================================
                LAYER 1: BACKGROUND
            ================================================================= */}

            {/* Stars */}
            <StarField warp={isSpotlightOpen} />

            {/* Forest Light Canopy (Sunlight + Aura) */}
            <ForestLightCanopy orbState={finalOrbState} demoMode={viewMode === 'demo'} />

            {/* Mycelium Neural Network */}
            <div className="fixed inset-0 z-0 opacity-40">
                <MyceliumOverlay />
            </div>

            {/* ================================================================
                LAYER 2: MAIN CONTENT
            ================================================================= */}

            <div className="relative z-10 w-full h-full flex items-stretch">

                {/* Company Indicator */}
                {activeCompany && (
                    <div className="fixed top-6 left-8 z-[100] flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-emerald-500/20 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
                        <span className="text-[10px] text-emerald-100 uppercase tracking-[0.2em] font-medium">
                            {activeCompany.name}
                        </span>
                    </div>
                )}

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

            {/* Resonance Room (Mora Chat) */}
            <ResonanceRoom
                isOpen={isResonanceOpen}
                onClose={() => setIsResonanceOpen(false)}
                onToggleExpand={() => setIsResonanceExpanded(!isResonanceExpanded)}
                isExpanded={isResonanceExpanded}
            />

            {/* Dock (Bottom Navigation) */}
            <Dock />

            {/* Node Detail Panel */}
            <NodeDetailPanel />

            {/* Spotlight (Cmd+K) */}
            <Spotlight
                isOpen={isSpotlightOpen}
                onClose={() => setIsSpotlightOpen(false)}
            />

            {/* Mora Orb */}
            <div id="mora-orb-anchor" className="fixed bottom-8 right-8 z-[500] pointer-events-auto">
                <MoraOrb
                    state={finalOrbState}
                    role={role === 'owner' || role === 'admin' ? 'admin' : 'member'}
                    demoMode={viewMode === 'demo'}
                    notifications={orbNotifications}
                    onClick={() => setIsResonanceOpen(prev => !prev)}
                />
            </div>

            {/* ================================================================
                LAYER 4: INTERACTION
            ================================================================= */}

            {!isLoggingOut && (
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
            )}

            {/* Logout Transition Overlay */}
            {isLoggingOut && (
                <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-xs uppercase tracking-[0.4em] text-emerald-400/80 mb-3">
                            Logging Out
                        </div>
                        <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent animate-pulse mx-auto" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoraShell;
