"use client";

import React, { useState, useCallback } from 'react';
import { Home, Search, Activity, Settings, MessageSquare, Hexagon, User, LogOut, Zap, Building2 } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { useDemoFlow } from '@/lib/hooks/useDemoFlow';
import { useAccountStore } from '@/lib/auth/useAccount';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { writeCookie } from '@/lib/auth/cookies';
import { useRouter } from 'next/navigation';
import { isDemoTenant } from '@/lib/constants/tenants';

/**
 * ContextRail - Left Navigation Sidebar
 * 
 * MASTERBIBEL compliant:
 * - Home Icon behavior depends on role:
 *   - Owner: Goes to Owner Dashboard (Companies overview)
 *   - Demo/Member: Goes to current Workspace
 * - Logout redirects to WelcomeScreen (/)
 */
export const ContextRail: React.FC = () => {
    const { setViewLevel, viewLevel, viewMode, setViewMode, loadTree } = useMoraStore();
    const { currentAccount, logout } = useAccountStore();
    const { runDemoFlow, isRunning: demoRunning } = useDemoFlow();
    const [showSettings, setShowSettings] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const router = useRouter();

    // Get current role from localStorage or account
    const getCurrentRole = useCallback(() => {
        const savedRole = typeof window !== 'undefined' ? localStorage.getItem('saimor_role') : null;
        return savedRole || currentAccount?.role || 'member';
    }, [currentAccount?.role]);

    const closeOverlays = () => {
        setShowSettings(false);
        setShowUserMenu(false);
    };

    const openChatDock = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mora:open-chat'));
        }
    };

    // Home action - ALWAYS goes to own Workspace (eigene Saimor-Struktur)
    // Owner sieht hier seine EIGENE Company-Struktur, nicht Client Companies!
    const handleHomeClick = async () => {
        closeOverlays();

        const tenantId =
            currentAccount?.tenantId ||
            (typeof window !== 'undefined' ? localStorage.getItem('saimor_tenant') : null) ||
            'tenant-default';

        // Go to own Workspace (eigene Departments, Spaces, Folders)
        setViewMode(isDemoTenant(tenantId) ? 'demo' : 'workspace');
        setViewLevel('core');
        console.log('🏠 Home → Eigene Saimor-Struktur');

        // RESET Active Company to User's Company (Fix for "No Data after Demo")
        const { companies, setActiveCompany, loadDepartments, loadNodesForCompany } = useMoraStore.getState();
        const userCompany =
            companies.find(c => c.tenant_id === tenantId) ||
            companies[0];

        if (userCompany) {
            setActiveCompany(userCompany.id);
            if (typeof window !== 'undefined') {
                localStorage.setItem('last_company_id', userCompany.id);
                localStorage.setItem('last_workspace', userCompany.name);
            }
            await loadDepartments(userCompany.id);
            loadNodesForCompany(userCompany.id).catch(console.warn);
        } else {
            // Fallback if no user company found
            setActiveCompany(null);
            await loadDepartments();
        }

        loadTree();
    };

    const navItems = [
        {
            id: 'home',
            icon: Home,
            label: getCurrentRole() === 'system_owner' ? 'Owner Dashboard' : 'Home',
            action: handleHomeClick
        },
        { id: 'search', icon: Search, label: 'Search', action: () => { closeOverlays(); setViewLevel('core'); loadTree(); openChatDock(); } },
        { id: 'activity', icon: Activity, label: 'Activity', action: () => { closeOverlays(); setViewLevel('core'); loadTree(); openChatDock(); } },
        { id: 'chat', icon: MessageSquare, label: "Mora Chat", action: () => { closeOverlays(); openChatDock(); } },
    ];

    // Blitz = Enter/Exit Demo Mode
    // CONSISTENT WITH DOCK: Demo toggle ALWAYS navigates to Welcome Screen
    const handleWorkspaceView = async () => {
        closeOverlays();

        // Clean up session state
        if (typeof window !== 'undefined') {
            localStorage.removeItem('saimor_dev_token');
            localStorage.removeItem('saimor_mode');
            localStorage.removeItem('saimor_role');
            writeCookie('saimor_auth', '', -1);
        }

        // Reset to workspace and navigate to Welcome for proper demo entry
        setViewMode('workspace');
        setViewLevel('core');

        // Navigate to Welcome Screen - user must explicitly enter demo from there
        router.push('/');
    };

    const handleLogout = () => {
        // Clear all auth state
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('saimor_mode');
        localStorage.removeItem('saimor_role');
        localStorage.removeItem('saimor_tenant');
        localStorage.removeItem('last_workspace');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('user_name');
        writeCookie('saimor_auth', '', -1);

        // Logout from account store
        logout();

        // Reset view mode
        setViewMode('workspace');
        setViewLevel('core');

        closeOverlays();

        // Redirect to WelcomeScreen
        toast.info("Logged out successfully");
        router.replace('/');
    };

    // SECURITY: Explicitly exclude demo users from owner features
    const currentRole = getCurrentRole();
    const isOwner = ((currentRole as string) === 'owner' || (currentRole as string) === 'admin') && (currentRole as string) !== 'demo';

    return (
        <>
            <div className="fixed left-0 top-0 bottom-0 w-[72px] z-fixed pointer-events-auto flex flex-col items-center py-6 bg-black/40 backdrop-blur-xl border-r border-white/5">
                {/* Logo Area */}
                <div className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <Hexagon size={20} className="text-emerald-400" />
                    </div>
                </div>

                {/* Navigation Icons */}
                <div className="flex-1 flex flex-col gap-6 w-full px-3">
                    {navItems.map((item) => {
                        // Home is active when: viewMode is 'workspace' AND viewLevel is 'core'
                        // NOT active when in demo mode (that's the CEO View button)
                        const isActive = item.id === 'home' && viewLevel === 'core' && viewMode === 'workspace';
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

                    {/* Owner-Only: Companies Button */}
                    {isOwner && (
                        <button
                            onClick={() => {
                                closeOverlays();
                                setViewMode('owner');
                                setViewLevel('company');
                                console.log('🏢 Switching to Owner View');
                            }}
                            className={`group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all duration-300 ${viewMode === 'owner' ? 'bg-mora-gold/20' : ''
                                }`}
                        >
                            <Building2
                                size={22}
                                className={`relative z-10 transition-colors duration-300 ${viewMode === 'owner'
                                    ? 'text-mora-gold'
                                    : 'text-white/40 group-hover:text-mora-gold/80'
                                    }`}
                            />
                            <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap backdrop-blur-md">
                                Client Companies
                            </div>
                            {viewMode === 'owner' && (
                                <motion.div
                                    layoutId="activeOwner"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-mora-gold rounded-r-full shadow-[0_0_8px_#d4af37]"
                                />
                            )}
                        </button>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto flex flex-col gap-4 w-full px-3">
                    {/* Workspace/CEO View Button (Blitz = wie CEO die Firma sieht) */}
                    <button
                        onClick={handleWorkspaceView}
                        disabled={demoRunning}
                        className={`group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${viewMode === 'demo' ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
                            }`}
                    >
                        <Zap size={20} className={`transition-colors ${viewMode === 'demo' ? 'text-blue-400' : 'text-blue-400/60 group-hover:text-blue-400'
                            }`} />
                        <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-md">
                            Demo (Simple Coffee Group)
                        </div>
                        {viewMode === 'demo' && (
                            <motion.div
                                layoutId="activeDemo"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-[0_0_8px_#3b82f6]"
                            />
                        )}
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
                        {currentAccount?.email?.slice(0, 2).toUpperCase() ||
                            (typeof window !== 'undefined' ? localStorage.getItem('user_name')?.slice(0, 2).toUpperCase() : 'US') ||
                            'US'}
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
                        <div className="text-sm text-white/90 font-medium mb-1">
                            {currentAccount?.email || localStorage.getItem('user_name') || 'User'}
                        </div>
                        <div className="text-xs text-white/50 mb-1">
                            Role: {getCurrentRole().charAt(0).toUpperCase() + getCurrentRole().slice(1)}
                        </div>
                        <div className="text-xs text-white/30 mb-4">
                            {currentAccount?.tenantId || localStorage.getItem('saimor_tenant') || 'tenant-default'}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-sm text-white/80">
                                <User size={16} />
                                Profile
                            </button>
                            <button
                                onClick={handleLogout}
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
