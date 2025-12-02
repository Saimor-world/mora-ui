"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    X,
    Monitor,
    Layers,
    Power,
    Database,
    Info,
} from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { toast } from 'sonner';
import { useDemoFlow } from '@/lib/hooks/useDemoFlow';
import { deleteCookie } from '@/lib/auth/cookies';

interface SettingsPaneProps {
    isOpen: boolean;
    onClose: () => void;
}

type Theme = 'light' | 'dark' | 'forest' | 'glass';

export const SettingsPane: React.FC<SettingsPaneProps> = ({ isOpen, onClose }) => {
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<Theme>('forest');

    const coreError = useMoraStore((state) => state.coreError);
    const isConnected = !coreError;
    const { runDemoFlow, isRunning } = useDemoFlow();

    useEffect(() => {
        setMounted(true);
        // Load theme from localStorage
        const savedTheme = localStorage.getItem('mora_theme') as Theme;
        if (savedTheme) setTheme(savedTheme);
    }, []);

    // Persist theme changes
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('mora_theme', theme);
            document.body.dataset.theme = theme;
        }
    }, [theme, mounted]);

    const handleReset = async () => {
        toast.promise(
            runDemoFlow(),
            {
                loading: 'Resetting Demo Instance...',
                success: 'Instance Reset Complete',
                error: 'Failed to reset'
            }
        );
        // After reset, refresh tree in background
        useMoraStore.getState().loadTree();
    };

    const handleReloadSources = () => {
        toast.success('Data Sources Reloaded');
        useMoraStore.getState().loadTree();
    };

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Pane */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 180 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6"
                    >
                        <div className="w-full max-w-xl bg-mora-forest/95 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Settings className="w-5 h-5 text-mora-gold" />
                                    <h2 className="text-lg font-medium text-emerald-50">Settings</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-emerald-400/60 hover:text-emerald-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                                {/* Theme Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-emerald-400/80 uppercase tracking-wider font-medium">
                                        <Monitor className="w-4 h-4" />
                                        <span>Theme</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['light', 'dark', 'forest', 'glass'] as Theme[]).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={`
                                                px-3 py-2 rounded-lg text-sm capitalize transition-all border
                                                ${theme === t
                                                        ? 'bg-mora-gold/20 border-mora-gold text-mora-gold'
                                                        : 'bg-white/5 border-transparent text-emerald-200/60 hover:bg-white/10'}
                                            `}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* User Management Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-emerald-400/80 uppercase tracking-wider font-medium">
                                        <Power className="w-4 h-4" />
                                        <span>Account</span>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Current Mode Info */}
                                        <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                                            <div className="text-emerald-500/50 text-xs uppercase tracking-wider mb-1">Current Mode</div>
                                            <div className="text-emerald-100">
                                                {typeof window !== 'undefined' && localStorage.getItem('saimor_mode') === 'demo' ? 'Demo Mode' : 'User Account'}
                                            </div>
                                        </div>

                                        {/* Logout Button */}
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('saimor_dev_token');
                                                localStorage.removeItem('saimor_mode');
                                                deleteCookie('saimor_auth');
                                                toast.success('Logged out successfully');
                                                window.location.reload();
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors text-sm"
                                        >
                                            <Power className="w-4 h-4" />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </section>

                                {/* Demo Controls */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-emerald-400/80 uppercase tracking-wider font-medium">
                                        <Layers className="w-4 h-4" />
                                        <span>Demo Controls</span>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={handleReset}
                                            disabled={isRunning}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-emerald-200 hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
                                        >
                                            <Power className="w-4 h-4" />
                                            <span>Reset Demo Instance</span>
                                        </button>

                                        <button
                                            onClick={handleReloadSources}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-emerald-200 hover:bg-white/10 transition-colors text-sm"
                                        >
                                            <Database className="w-4 h-4" />
                                            <span>Reload Data Sources</span>
                                        </button>
                                    </div>
                                </section>

                                {/* Information */}
                                <section className="pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-xs text-emerald-500/40 mb-2">
                                        <Info className="w-3 h-3" />
                                        <span>SYSTEM INFO</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-emerald-500/30 font-mono">
                                        <div className="flex justify-between">
                                            <span>Version</span>
                                            <span>1.4.0-beta</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Build</span>
                                            <span>2025.12.02</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Core</span>
                                            <span className={`flex items-center gap-1.5 ${isConnected ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
