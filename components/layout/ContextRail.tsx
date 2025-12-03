"use client";

import React, { useState } from 'react';
import { Home, Search, Activity, Settings, MessageSquare, Hexagon, User, LogOut, Zap } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { useAccountStore } from '@/lib/auth/useAccount';
import { motion, AnimatePresence } from 'framer-motion';

export const ContextRail: React.FC = () => {
    const { setViewLevel, viewLevel } = useMoraStore();
    const { currentAccount, logout } = useAccountStore();
    const [showSettings, setShowSettings] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const navItems = [
        { id: 'home', icon: Home, label: 'Home', action: () => setViewLevel('core') },
        { id: 'search', icon: Search, label: 'Search', action: () => console.log('Search clicked') },
        { id: 'activity', icon: Activity, label: 'Activity', action: () => console.log('Activity clicked') },
        { id: 'chat', icon: MessageSquare, label: 'Môra Chat', action: () => console.log('Chat clicked') },
    ];

    const handleDemoFlow = () => {
        console.log('🎬 Demo Flow triggered');
        // TODO: Trigger demo data reload or showcase
    };

    return (
        <>
            <div className="fixed left-0 top-0 bottom-0 w-[72px] z-[60] flex flex-col items-center py-6 bg-black/40 backdrop-blur-xl border-r border-white/5">
                {/* Logo Area */}
                <div className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <Hexagon size={20} className="text-emerald-400" />
                    </div>
                </div>

                {/* Navigation Icons */}
                <div className="flex-1 flex flex-col gap-6 w-full px-3">
                    {navItems.map((item) => {
                        const isActive = item.id === 'home' && viewLevel === 'core';
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={item.action}
                                className="group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all duration-300"
                            >
                                {/* Active/Hover Background */}
                                <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                    : 'bg-transparent group-hover:bg-white/5'
                                    }`} />

                                {/* Icon */}
                                <Icon
                                    size={22}
                                    className={`relative z-10 transition-colors duration-300 ${isActive
                                        ? 'text-emerald-400'
                                        : 'text-white/40 group-hover:text-white/80'
                                        }`}
                                />

                                {/* Tooltip */}
                                <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap backdrop-blur-md">
                                    {item.label}
                                </div>

                                {/* Active Indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeRail"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_8px_#10b981]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto flex flex-col gap-4 w-full px-3">
                    {/* Demo Flow Button */}
                    <button
                        onClick={handleDemoFlow}
                        className="group relative flex items-center justify-center w-full aspect-square rounded-xl hover:bg-purple-500/10 transition-all"
                    >
                        <Zap size={20} className="text-purple-400/60 group-hover:text-purple-400 transition-colors" />
                        <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-md">
                            Demo Flow
                        </div>
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="group relative flex items-center justify-center w-full aspect-square rounded-xl hover:bg-white/5 transition-all"
                    >
                        <Settings size={22} className="text-white/40 group-hover:text-white/80 transition-colors" />
                        <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-md">
                            Settings
                        </div>
                    </button>

                    {/* User Avatar */}
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="relative w-10 h-10 rounded-full bg-gradient-to-br from-mora-gold/20 to-amber-900/20 border border-mora-gold/30 flex items-center justify-center text-xs font-medium text-mora-gold cursor-pointer hover:scale-105 transition-transform"
                    >
                        {currentAccount?.email?.slice(0, 2).toUpperCase() || 'US'}
                    </button>
                </div>
            </div>

            {/* User Menu Popup */}
            <AnimatePresence>
                {showUserMenu && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="fixed left-[88px] bottom-6 z-[70] w-64 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl"
                    >
                        <div className="text-sm text-white/90 font-medium mb-1">{currentAccount?.email || 'User'}</div>
                        <div className="text-xs text-white/50 mb-4">{currentAccount?.tenantId || 'No tenant'}</div>

                        <div className="flex flex-col gap-2">
                            <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm text-white/80">
                                <User size={16} />
                                Profile
                            </button>
                            <button
                                onClick={() => {
                                    logout();
                                    setShowUserMenu(false);
                                }}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left text-sm text-red-400"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Panel Popup */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="fixed left-[88px] bottom-20 z-[70] w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl"
                    >
                        <h3 className="text-lg text-white/90 font-medium mb-4">Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Theme</label>
                                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 text-sm">
                                    <option>Dark (Default)</option>
                                    <option>Darker</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-white/60 uppercase tracking-wider mb-2 block">Language</label>
                                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 text-sm">
                                    <option>English</option>
                                    <option>Deutsch</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click Outside to Close */}
            {(showSettings || showUserMenu) && (
                <div
                    className="fixed inset-0 z-[65]"
                    onClick={() => {
                        setShowSettings(false);
                        setShowUserMenu(false);
                    }}
                />
            )}
        </>
    );
};
