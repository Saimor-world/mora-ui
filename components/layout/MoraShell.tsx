"use client";

import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlay';
import { ViewPort } from './ViewPort';
import { ChatDock } from '@/components/ui/ChatDock';
import { ContextRail } from '@/components/layout/ContextRail';
import { NodeDetailPanel } from '@/components/organic/NodeDetailPanel';
import { IntelligencePlayfield } from '@/components/intelligence/IntelligencePlayfield';
import { useMoraStore } from '@/lib/store/moraState';
import { motion, AnimatePresence } from 'framer-motion';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { MoraOrbController } from '@/components/mora/MoraOrbController';
import { Clock, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';

export const MoraShell: React.FC = () => {
    const { activeFolderId, departments, navigateToDepartment } = useMoraStore();
    const { role } = useUser();
    const [showLanding, setShowLanding] = useState(true);
    const [sessionInfo, setSessionInfo] = useState<{
        lastWorkspace?: string;
        lastActivity?: string;
        mode?: string;
        userName?: string;
    } | null>(null);

    // Check for session info and hide landing if user is already navigated
    useEffect(() => {
        const checkSession = () => {
            const lastWorkspace = typeof window !== 'undefined' ? localStorage.getItem('last_workspace') : null;
            const lastActivity = typeof window !== 'undefined' ? localStorage.getItem('last_activity') : null;
            const mode = typeof window !== 'undefined' ? localStorage.getItem('saimor_mode') : null;
            const userName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;
            const hasNavigated = typeof window !== 'undefined' ? localStorage.getItem('has_navigated') : null;

            if (lastWorkspace || lastActivity) {
                setSessionInfo({
                    lastWorkspace: lastWorkspace || undefined,
                    lastActivity: lastActivity || undefined,
                    mode: mode || undefined,
                    userName: userName || undefined
                });
            }

            // Auto-hide landing if user previously navigated
            if (hasNavigated === 'true') {
                setShowLanding(false);
            }
        };

        checkSession();
    }, []);

    const handleEnterWorkspace = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('has_navigated', 'true');
        }

        // If no company selected, ensure we are at company view
        const { activeCompanyId, setViewLevel } = useMoraStore.getState();
        if (!activeCompanyId) {
            setViewLevel('company');
        }

        setShowLanding(false);
    };

    const handleQuickNavigate = (deptId: string) => {
        navigateToDepartment(deptId);
        handleEnterWorkspace();
    };

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
                {Array.from({ length: 40 }).map((_, i) => (
                    <motion.circle
                        key={`star-${i}`}
                        cx={`${Math.random() * 100}%`}
                        cy={`${Math.random() * 100}%`}
                        r={Math.random() * 1.5 + 0.5}
                        fill="#10B981"
                        filter="url(#glow-shell)"
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
            <div className="relative z-10 w-full h-full flex">
                {/* 1. Context Rail (Replaces Sidebar) */}
                <ContextRail />

                {/* 2. Main Content Area */}
                <div className="flex-1 relative h-full ml-[72px]">
                    <ViewPort />
                </div>

                {/* 3. Intelligence Playfield (Right Sidebar - Fixed Width) */}
                <div className="w-[350px] h-full border-l border-white/5 shrink-0 relative z-20">
                    <IntelligencePlayfield />
                </div>
            </div>

            {/* Global Overlays */}
            <ChatDock />
            <MoraOrbController />
            <Toaster position="top-right" theme="dark" />

            {/* Detail Panel (Slide-over) */}
            <AnimatePresence>
                {activeFolderId && (
                    <div className="absolute right-0 top-0 bottom-0 w-[400px] z-40 pointer-events-none">
                        <NodeDetailPanel />
                    </div>
                )}
            </AnimatePresence>

            {/* Animated Landing Screen */}
            <AnimatePresence>
                {showLanding && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-[#030806]/95 backdrop-blur-sm"
                    >
                        {/* Floating Particles */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {Array.from({ length: 15 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1 h-1 bg-emerald-500/20 rounded-full"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                    }}
                                    animate={{
                                        y: [0, -120, 0],
                                        opacity: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: 5 + Math.random() * 5,
                                        repeat: Infinity,
                                        ease: "linear",
                                        delay: Math.random() * 5,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Landing Content */}
                        <div className="relative z-10 flex flex-col items-center max-w-2xl w-full p-8">
                            {/* Orb Container */}
                            <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
                                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                                <MoraOrb
                                    state="idle"
                                    role={(role === 'demo' ? 'member' : role) as 'admin' | 'member' | 'manager'}
                                    scale={1.5}
                                    position="center"
                                />
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-center space-y-6"
                            >
                                <h1 className="text-5xl font-light tracking-tight text-white">
                                    Welcome to <span className="text-emerald-400 font-normal">SAIMÔR</span>
                                </h1>
                                <p className="text-lg text-emerald-100/60 font-light max-w-md mx-auto leading-relaxed">
                                    The intelligent workspace for the post-filesystem era.
                                    <br />
                                    <span className="text-sm opacity-50 mt-2 block">
                                        System v3.0 • Neural Core Active
                                    </span>
                                </p>

                                {/* Session Context */}
                                {sessionInfo?.lastWorkspace && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                        className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
                                    >
                                        <div className="flex items-center gap-3 text-sm text-emerald-200/70 mb-3">
                                            <Clock size={14} />
                                            <span>RESUME SESSION</span>
                                        </div>
                                        <button
                                            onClick={handleEnterWorkspace}
                                            className="group flex items-center gap-4 w-full p-3 rounded-xl bg-black/40 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                <Zap size={20} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-white font-medium group-hover:text-emerald-300 transition-colors">
                                                    {sessionInfo.lastWorkspace}
                                                </div>
                                                <div className="text-xs text-white/40">
                                                    {sessionInfo.lastActivity || 'Last active 2m ago'}
                                                </div>
                                            </div>
                                            <ChevronRight className="text-white/20 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    </motion.div>
                                )}

                                {/* Quick Actions */}
                                {!sessionInfo?.lastWorkspace && (
                                    <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                                        {departments.slice(0, 2).map((dept, i) => (
                                            <button
                                                key={dept.id}
                                                onClick={() => handleQuickNavigate(dept.id)}
                                                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-emerald-500/60 group-hover:text-emerald-400 transition-colors">
                                                    <Sparkles size={24} />
                                                </div>
                                                <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                                                    {dept.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={handleEnterWorkspace}
                                    className="mt-12 px-8 py-3 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm tracking-widest uppercase hover:scale-105 transition-all"
                                >
                                    Enter Workspace
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
