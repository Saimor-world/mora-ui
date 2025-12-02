"use client";

import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { MyceliumOverlay } from '@/components/organic/MyceliumOverlay';
import { ViewPort } from './ViewPort';
import { ChatDock } from '@/components/ui/ChatDock';
import { TreeSidebar } from '@/components/sidebar/TreeSidebar';
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
        <div className="relative w-full h-screen overflow-hidden bg-mora-forest text-emerald-50 font-sans selection:bg-mora-gold/30">
            {/* Mycelium Neural Layer */}
            <MyceliumOverlay />

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
                                        opacity: [0, 0.6, 0],
                                        scale: [0, 2, 0]
                                    }}
                                    transition={{
                                        duration: 4 + Math.random() * 3,
                                        repeat: Infinity,
                                        delay: Math.random() * 3
                                    }}
                                />
                            ))}
                        </div>

                        <div className="relative z-10 flex flex-col items-center gap-12 max-w-3xl px-8">
                            {/* Orb + Title */}
                            <motion.div
                                className="flex flex-col items-center gap-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <motion.div
                                    animate={{
                                        scale: [1.5, 1.6, 1.5],
                                        rotate: [0, 5, 0, -5, 0]
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="scale-150"
                                >
                                    <MoraOrbController />
                                </motion.div>

                                <div className="text-center">
                                    <motion.h1
                                        className="text-6xl font-light tracking-[0.4em] text-emerald-50 mb-4"
                                        animate={{
                                            opacity: [1, 0.8, 1]
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity
                                        }}
                                    >
                                        MÔRA
                                    </motion.h1>
                                    <p className="text-sm text-emerald-500/60 tracking-[0.2em] uppercase">
                                        Intelligence Active <span className="text-mora-gold">• Beta 1.4</span>
                                    </p>
                                </div>
                            </motion.div>

                            {/* Session Card */}
                            {sessionInfo && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="w-full max-w-lg bg-gradient-to-br from-emerald-500/10 via-mora-gold/5 to-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl"
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-medium text-emerald-50">Welcome Back</div>
                                            <div className="text-sm text-emerald-500/60">
                                                {sessionInfo.userName || 'User'} • {sessionInfo.mode === 'demo' ? 'Demo Mode' : 'Owner'}
                                            </div>
                                        </div>
                                    </div>

                                    {sessionInfo.lastWorkspace && (
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-3 text-sm">
                                                <Zap className="w-4 h-4 text-mora-gold" />
                                                <span className="text-emerald-500/70">Last workspace:</span>
                                                <span className="text-emerald-100 font-medium">{sessionInfo.lastWorkspace}</span>
                                            </div>
                                            {sessionInfo.lastActivity && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Clock className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-emerald-500/70">Last active:</span>
                                                    <span className="text-emerald-100">
                                                        {new Date(sessionInfo.lastActivity).toLocaleDateString('de-DE', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleEnterWorkspace}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-500/20 to-mora-gold/20 hover:from-emerald-500/30 hover:to-mora-gold/30 border border-emerald-500/40 hover:border-mora-gold/60 rounded-xl text-emerald-100 transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <span className="text-sm uppercase tracking-widest">Enter Workspace</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </motion.button>
                                </motion.div>
                            )}

                            {/* Quick Access (if departments loaded) */}
                            {!sessionInfo && departments.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="w-full max-w-lg"
                                >
                                    <div className="text-center mb-4">
                                        <p className="text-xs text-emerald-500/50 uppercase tracking-wider">Quick Access</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {departments.slice(0, 4).map((dept, idx) => (
                                            <motion.button
                                                key={dept.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.6 + idx * 0.1 }}
                                                whileHover={{ scale: 1.05 }}
                                                onClick={() => handleQuickNavigate(dept.id)}
                                                className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-xl transition-all text-left"
                                            >
                                                <div className="text-sm font-medium text-emerald-100">{dept.name}</div>
                                                <div className="text-xs text-emerald-500/50 mt-1">Department</div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Simple "Continue" button if no session info */}
                            {!sessionInfo && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={handleEnterWorkspace}
                                    className="px-8 py-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500/60 rounded-full text-emerald-100 transition-all"
                                >
                                    <span className="text-sm uppercase tracking-widest">Start</span>
                                </motion.button>
                            )}

                            {/* Privacy Note */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="text-[10px] text-emerald-500/30 text-center max-w-md"
                            >
                                Session data stored locally for your convenience. Privacy-first design.
                            </motion.p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Shell (always rendered, but hidden behind landing initially) */}
            <div className="relative z-10 w-full h-full flex">
                <TreeSidebar />

                <div className="flex-1 h-full flex flex-col min-w-0">
                    <div className="flex-1 relative overflow-hidden">
                        <ViewPort />
                    </div>

                    <div className="h-[280px] shrink-0 relative z-20 shadow-2xl shadow-black/50">
                        <IntelligencePlayfield />
                    </div>
                </div>
            </div>

            {/* Global UI Overlays */}
            <ChatDock />
            <NodeDetailPanel />
            <Toaster />
        </div>
    );
};
