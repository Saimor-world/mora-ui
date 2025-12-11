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
import { useMoraStore } from '@/lib/store/moraState';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MoraShell - Main Application Shell
 *
 * MASTERBIBEL compliant:
 * - No redundant landing screens (WelcomeScreen handles auth)
 * - Direct workspace access after authentication
 * - Orb is rendered in CompanyCoreView (bottom-right, fixed)
 */
import { useAuthBootstrapper } from '@/lib/hooks/useAuthBootstrapper';

export const MoraShell: React.FC = () => {
    const router = useRouter();
    const { isBootstrapped } = useAuthBootstrapper(); // Phase 1: Real Auth Required!
    const { activeNode } = useMoraStore();
    const [stars, setStars] = useState<Array<{
        id: number;
        cx: string;
        cy: string;
        r: number;
        fill: string;
        filter?: string;
    }>>([]);

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

    // Sleep handler - navigate to lockscreen
    const handleSleep = () => {
        // Save session state before sleep
        if (typeof window !== 'undefined') {
            localStorage.setItem('mora_session', 'true');
            const userName = localStorage.getItem('user_name') || 'User';
            localStorage.setItem('last_user_name', userName);
        }
        // Navigate to root which will show lockscreen
        router.push('/?sleep=true');
    };

    // CRITICAL: Don't render anything until auth is ready
    // This prevents 401 errors from components that try to fetch before token is available
    if (!isBootstrapped) {
        return (
            <div className="w-full h-screen bg-[#030806] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-emerald-500/50 text-sm font-light tracking-wider">INITIALIZING...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#030806] text-emerald-50 font-sans selection:bg-mora-gold/30">
            {/* Global Star Field Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 z-0">
                <defs>
                    <filter id="glow-shell">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
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
                        filter={star.filter}
                        animate={{
                            opacity: [0.2, 0.7, 0.2],
                            scale: [0.8, 1.2, 0.8]
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </svg>

            {/* Mycelium Neural Layer (Background) */}
            <div className="absolute inset-0 z-0 opacity-20">
                <MyceliumOverlay />
            </div>

            {/* Main Layout Grid */}
            <div className="relative z-10 w-full h-full flex items-stretch">
                {/* 1. Context Rail (Removed as per user request - Dock replaces it) */}
                {/* <ContextRail /> */}

                {/* 2. Main Content Area */}
                <div className="flex-1 relative h-full">
                    <ViewPort />
                </div>
            </div>

            {/* UPGRADE P4: Intelligence Playfield Overlay (Z-5) */}
            <IntelligencePlayfield />

            {/* UPGRADE P1: Pane System Layer - Above ViewPort, Below Dock */}
            <PaneManager />

            {/* Global Overlays */}
            <ChatDock />
            {/* UPGRADE A1: OS Dock - Central navigation hub */}
            <Dock onSleep={handleSleep} />
            {/* MoraOrb is now rendered in CompanyCoreView (bottom-right, MASTERBIBEL compliant) */}
            <Toaster position="top-right" theme="dark" />

            {/* Node Detail Panel (GlassPanel - Universe Edition) */}
            <NodeDetailPanel />
        </div>
    );
};

