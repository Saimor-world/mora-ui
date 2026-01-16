"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlay';
import { ViewPort } from './ViewPort';
import { ChatDock } from '@/components/ui/ChatDock';
import { ContextRail } from '@/components/layout/ContextRail';
import { NodeDetailPanel } from '@/components/organic/NodeDetailPanel';
import { IntelligencePlayfield } from '@/components/intelligence/IntelligencePlayfield';
import { Dock } from '@/components/mora/Dock';
import { PaneManager } from '@/components/mora/PaneManager';
import { LockScreen } from '@/components/auth/LockScreen';

import { ResonanceRoom } from '@/components/mora/ResonanceRoom';
import { Spotlight } from '@/components/mora/Spotlight';
import { useMoraStore } from '@/lib/store/moraState';
import { motion, AnimatePresence } from 'framer-motion';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { CursorAgent } from '@/components/mora/CursorAgent';
import { IntelligenceDashboard } from '@/components/mora/IntelligenceDashboard';
import { NeuralGrid } from '@/components/visual/NeuralGrid';
import { UserCursor } from '@/components/layout/UserCursor';
import { useUser } from '@/lib/hooks/useUser';
import { fetchAwarenessPulse, type OrbState } from '@/lib/api/awarenessClient';



/**
 * MoraShell - Main Application Shell
 *
 * MASTERBIBEL compliant:
 * - No redundant landing screens (WelcomeScreen handles auth)
 * - Direct workspace access after authentication
 * - Orb is rendered at the Shell level (bottom-right, fixed) for persistence across views
 */
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';

export const MoraShell: React.FC = () => {
    const router = useRouter();
    const { isBootstrapped } = useAuthBootstrapper(); // Phase 1: Real Auth Required!
    const { activeNode, user } = useMoraStore();
    const [isSleeping, setIsSleeping] = useState(false);
    const [isResonanceOpen, setIsResonanceOpen] = useState(false);
    const [isResonanceExpanded, setIsResonanceExpanded] = useState(false);
    const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
    const [stars, setStars] = useState<Array<{
        id: number;
        cx: string;
        cy: string;
        r: number;
        fill: string;
        filter?: string;
    }>>([]);

    const {
        viewMode,
        orbState: storeOrbState,
        orbNotifications,
        setOrbState,
        activeCompanyId,
        cursorAgent,
        setCursorAgent
    } = useMoraStore();
    const { role } = useUser();

    const [apiOrbState, setApiOrbState] = useState<OrbState>('idle');
    const [showIntelligence, setShowIntelligence] = useState(false);

    // Generate stars client-side only to avoid hydration mismatch
    useEffect(() => {
        const generatedStars = Array.from({ length: 40 }, (_, i) => ({
            id: i,
            cx: `${Math.random() * 100}%`,
            cy: `${Math.random() * 100}%`,
            r: Math.random() * 1.5 + 0.5,
            fill: "#10B981",
            filter: "url(#glow-shell)"
        }));
        setStars(generatedStars);
    }, []);

    // Sleep handler - show lockscreen overlay (session stays active!)
    const handleSleep = () => {
        setIsSleeping(true);
    };

    // Unlock handler
    const handleUnlock = () => {
        setIsSleeping(false);
    };

    // Logout handler
    const handleLogout = () => {
        setIsSleeping(false);
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('mora_session');
        router.push('/');
    };

    // Spotlight keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSpotlightOpen(prev => !prev);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                e.preventDefault();
                setShowIntelligence(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Awareness pulse polling with exponential backoff
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;
        let interval = 15000; // Start at 15s
        const maxInterval = 120000; // Max 2 minutes

        const loadAwareness = async () => {
            try {
                const pulse = await fetchAwarenessPulse();
                if (isMounted) {
                    setApiOrbState(pulse.state);
                    interval = 15000; // Reset on success
                }
            } catch (error) {
                // Apply backoff on error
                interval = Math.min(interval * 1.5, maxInterval);
            }
            if (isMounted) {
                timeoutId = setTimeout(loadAwareness, interval);
            }
        };
        timeoutId = setTimeout(loadAwareness, 2000);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    // Cursor Agent Roaming Logic
    useEffect(() => {
        if (isBootstrapped) {
            const timer = setTimeout(() => {
                setCursorAgent({ active: true, action: 'roam' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isBootstrapped]);


    // ❌ REMOVED: AUTO-OPEN MAIL
    // This was a CRITICAL security issue - opened owner's Gmail for ALL users!
    // Mail must be opened manually via Dock. Backend blocks non-owners anyway.

    useEffect(() => {
        const handleAIAction = (e: CustomEvent) => {
            const { type, targetId, duration } = e.detail;
            if (type === 'highlight' && targetId) {
                const el = document.getElementById(targetId) || document.querySelector(`[data-agency-id="${targetId}"]`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    setCursorAgent({
                        active: true,
                        action: 'highlight',
                        target: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
                    });
                    setTimeout(() => {
                        setCursorAgent({ action: 'roam', target: undefined });
                    }, duration || 3000);
                }
            }
        };
        window.addEventListener('mora-ai-action' as any, handleAIAction as any);
        return () => window.removeEventListener('mora-ai-action' as any, handleAIAction as any);
    }, []);

    const finalOrbState = (viewMode === 'demo' ? 'demo' : (storeOrbState || apiOrbState)) as OrbState;


    // CRITICAL: Don't render anything until auth is ready
    // This prevents 401 errors from components that try to fetch before token is available
    if (!isBootstrapped) {
        return (
            <div className="w-full h-screen bg-[#030806] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-emerald-500/50 text-sm font-light tracking-wider uppercase">
                        INITIALISIERUNG...
                    </span>
                </div>
            </div>
        );
    }

    // Show LockScreen overlay when sleeping
    if (isSleeping) {
        return (
            <LockScreen
                onUnlock={handleUnlock}
                onLogout={handleLogout}
                userName={user?.name || (typeof window !== 'undefined' ? localStorage.getItem('last_user_name') : null) || 'Benutzer'}
                companyName={'SAIMÔR'}
                companyLogo={undefined}
            />
        );
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">

            {/* 1. LAYER: Neural Scanning Grid (Tesla/SpaceX Style) */}
            <div className="fixed inset-0 w-screen h-screen z-0">
                <NeuralGrid state={finalOrbState} />
            </div>

            {/* 2. LAYER: Ambient Stars & Floating Particles */}
            <svg className="fixed inset-0 w-screen h-screen pointer-events-none opacity-40 z-0">
                <defs>
                    <filter id="glow-shell">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {stars.map((star) => (
                    <motion.circle
                        key={`star-${star.id}`}
                        cx={star.cx}
                        cy={star.cy}
                        r={star.r}
                        fill={star.fill}
                        filter="url(#glow-shell)"
                        animate={{
                            opacity: [0.3, 0.8, 0.3],
                            scale: [0.9, 1.1, 0.9]
                        }}
                        transition={{
                            duration: 4 + Math.random() * 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </svg>

            {/* 3. LAYER: Mycelium Neural Layer (Organic Flow - VISIBLE!) */}
            <div className="fixed inset-0 w-screen h-screen z-0 opacity-40">
                <MyceliumOverlay />
            </div>

            {/* Main Layout Grid */}
            <div className="relative z-10 w-full h-full flex items-stretch">
                {/* 1. Context Rail (Removed as per user request - Dock replaces it) */}
                {/* <ContextRail /> */}

                {/* 2. Main Content Area */}
                <div className="flex-1 relative h-full w-full">
                    <ViewPort />

                    {/* 3. COGNITIVE FLOOR - Grounding Gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none z-10" />
                </div>
            </div>

            {/* UPGRADE P4: Intelligence Playfield Overlay (Z-5) - DISABLED: Felt like mock */}
            {/* <IntelligencePlayfield /> */}

            {/* UPGRADE P1: Pane System Layer - NOW RENDERED IN layout.tsx TO AVOID DUPLICATES */}
            {/* <PaneManager /> */}

            {/* UPGRADE: Resonance Room - Unified MÔRA Dialogue Space */}
            <ResonanceRoom
                isOpen={isResonanceOpen}
                onClose={() => setIsResonanceOpen(false)}
                onToggleExpand={() => setIsResonanceExpanded(!isResonanceExpanded)}
                isExpanded={isResonanceExpanded}
            />

            {/* Legacy ChatDock - to be deprecated in favor of ResonanceRoom */}
            {/* <ChatDock /> */}

            {/* UPGRADE A1: OS Dock - Central navigation hub */}
            <Dock
                onSleep={handleSleep}
                onOpenResonance={() => setIsResonanceOpen(true)}
            />



            {/* MoraOrb is now rendered in CompanyCoreView (bottom-right, MASTERBIBEL compliant) */}
            <Toaster position="top-right" theme="dark" />

            {/* Node Detail Panel (GlassPanel - Universe Edition) */}
            <NodeDetailPanel />

            {/* Spotlight Command Palette (Cmd+K) */}
            <Spotlight
                isOpen={isSpotlightOpen}
                onClose={() => setIsSpotlightOpen(false)}
            />

            {/* UPGRADE: Global Intelligence Systems - MÔRA ORB */}
            <div className="fixed bottom-24 right-8 z-[500] pointer-events-auto">
                <MoraOrb
                    state={finalOrbState}
                    role={role === 'owner' || role === 'admin' ? 'admin' : 'member'}
                    demoMode={viewMode === 'demo'}
                    notifications={orbNotifications}
                    onClick={() => setShowIntelligence(!showIntelligence)}
                />
            </div>

            <IntelligenceDashboard
                isOpen={showIntelligence}
                onClose={() => setShowIntelligence(false)}
                orbState={finalOrbState}
            />


            <CursorAgent
                active={cursorAgent.active}
                action={cursorAgent.action}
                target={cursorAgent.target}
                awareness={finalOrbState}
                onActionComplete={() => setCursorAgent({ active: false, action: 'idle' })}
            />

            {/* UPGRADE A2: Intelligent Interaction Layer */}
            <UserCursor enabled={true} />

            {/* Phase 3: MÔRA Proactive Intelligence - DISABLED (felt like mock) */}
            {/* <ProactiveSuggestions position="bottom-left" maxVisible={3} /> */}

        </div>
    );
};

