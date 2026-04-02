"use client";

import React, { useState, useCallback } from 'react';
import { Home, Search, Activity, Settings, MessageSquare, Hexagon, User, LogOut, Zap, Building2, Users, Sparkles } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { writeCookie } from '@/lib/auth/cookies';
import { useRouter } from 'next/navigation';
import { isDemoTenant } from '@/lib/constants/tenants';
import { UserAvatar } from '@/components/mora/UserAvatar';
import { resetUserState } from '@/lib/hooks/useUser';
import { authLogout } from '@/lib/api/coreClient';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { roleLabel } from '@/lib/auth/roles';

/**
 * ContextRail - Left Navigation Sidebar
 * 
 * MASTERBIBEL compliant:
 * - Home Icon behavior depends on role:
 *   - Demo/Member: Goes to current Workspace
 * - Logout redirects to WelcomeScreen (/)
 */
export const ContextRail: React.FC = () => {
    const { navigateToCore, viewLevel, viewMode, setViewMode, loadTree, resetStore, isStandardMode } = useMoraStore();
    const { currentAccount, logout } = useAccountStore();
    const [showSettings, setShowSettings] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const router = useRouter();

    const user = useMoraStore(state => state.user);

    const getCurrentRole = useCallback(() => {
        return user?.role || currentAccount?.role || 'member';
    }, [user?.role, currentAccount?.role]);

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
        setViewMode('workspace');
        navigateToCore();

        // RESET Active Company to User's Company (Fix for "No Data after Demo")
        const { companies, setActiveCompany, loadDepartments, loadNodesForCompany } = useMoraStore.getState();
        const safeCompanies = Array.isArray(companies) ? companies : [];

        // P1 Fix: Safe access with explicit null check
        const userCompany = safeCompanies.find(c => c.tenant_id === tenantId) ?? safeCompanies[0] ?? null;

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
            label: 'Start',
            action: handleHomeClick
        },
        { id: 'search', icon: Search, label: 'Suche', action: () => { closeOverlays(); navigateToCore(); loadTree(); openChatDock(); } },
        { id: 'activity', icon: Activity, label: 'Aktivität', action: () => { closeOverlays(); navigateToCore(); loadTree(); openChatDock(); } },
        { id: 'chat', icon: MessageSquare, label: "Mora", action: () => { closeOverlays(); openChatDock(); } },
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
        navigateToCore();

        // Navigate to Welcome Screen - user must explicitly enter demo from there
        router.push('/');
    };

    const handleLogout = async () => {
        await authLogout();
        clearClientSessionArtifacts();

        // Logout from account store
        logout();
        resetUserState();
        resetStore();

        // Reset view mode
        setViewMode('workspace');
        navigateToCore();

        closeOverlays();

        // Redirect to WelcomeScreen
        toast.info("Abgemeldet");
        router.replace('/');
    };

    // SECURITY: Explicitly exclude demo users from owner features
    const currentRole = getCurrentRole();
    const isOwner = ((currentRole as string) === 'owner' || (currentRole as string) === 'admin') && (currentRole as string) !== 'demo';

    return (
        <>
            <div className={`fixed left-0 top-0 bottom-0 w-[72px] z-fixed pointer-events-auto flex flex-col items-center py-6 border-r ${isStandardMode
                    ? 'bg-[#F3F3F3] border-[#E1E1E1]'
                    : 'bg-black/40 backdrop-blur-xl border-white/5'
                }`}>
                {/* Logo Area */}
                <div className="mb-8">
                    <div className={`w-10 h-10 flex items-center justify-center ${isStandardMode
                            ? 'rounded bg-[#0078D4] border border-[#0078D4]'
                            : 'rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        }`}>
                        <Hexagon size={20} className={isStandardMode ? 'text-white' : 'text-emerald-400'} />
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
                                aria-label={item.label}
                                className={`group relative flex items-center justify-center w-full aspect-square transition-all duration-300 ${isStandardMode ? 'rounded' : 'rounded-xl'
                                    }`}
                            >
                                {/* Active/Hover Background */}
                                <div className={`absolute inset-0 transition-all duration-300 ${isStandardMode ? 'rounded' : 'rounded-xl'
                                    } ${isActive
                                        ? isStandardMode
                                            ? 'bg-[#DEECF9]'
                                            : 'bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                        : isStandardMode
                                            ? 'bg-transparent group-hover:bg-gray-200'
                                            : 'bg-transparent group-hover:bg-white/5'
                                    }`} />

                                {/* Icon */}
                                <Icon
                                    size={22}
                                    className={`relative z-10 transition-colors duration-300 ${isActive
                                        ? isStandardMode ? 'text-[#0078D4]' : 'text-emerald-400'
                                        : isStandardMode
                                            ? 'text-gray-500 group-hover:text-gray-700'
                                            : 'text-white/40 group-hover:text-white/80'
                                        }`}
                                />

                                {/* Tooltip */}
                                <div className={`absolute left-full ml-4 px-3 py-1.5 text-xs opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap ${isStandardMode
                                        ? 'rounded bg-gray-800 text-white'
                                        : 'rounded-lg bg-black/80 border border-white/10 text-white backdrop-blur-md'
                                    }`}>
                                    {item.label}
                                </div>

                                {/* Active Indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeRail"
                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${isStandardMode
                                                ? 'bg-[#0078D4]'
                                                : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                                            }`}
                                    />
                                )}
                            </button>
                        );
                    })}

                    {/* Owner-Only: Companies Button (Removed to force Real Data/No Mock Dashboard) */}
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto flex flex-col gap-4 w-full px-3">
                    {/* Workspace/CEO View Button (Blitz = wie CEO die Firma sieht) */}
                    <button
                        onClick={handleWorkspaceView}
                        className={`group relative flex items-center justify-center w-full aspect-square rounded-xl transition-all ${viewMode === 'demo' ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
                            }`}
                    >
                        <Zap size={20} className={`transition-colors ${viewMode === 'demo' ? 'text-blue-400' : 'text-blue-400/60 group-hover:text-blue-400'
                            }`} />
                        <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-md">
                            Showcase
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
                            Einstellungen
                        </div>
                    </button>

                    {/* User Avatar */}
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform active:scale-95"
                    >
                        <UserAvatar
                            role={getCurrentRole()}
                            size={44}
                            name={currentAccount?.email || 'User'}
                            showAura={true}
                        />
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
                        className="fixed left-[88px] bottom-6 z-[70] w-64 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl"
                    >
                        <div className="text-sm text-white/90 font-medium mb-1">
                            {currentAccount?.email || localStorage.getItem('user_name') || 'User'}
                        </div>
                        <div className="text-xs text-white/50 mb-1">
                            Rolle: {roleLabel(getCurrentRole())}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    const { openPane } = usePaneStore.getState();
                                    openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } });
                                    setShowUserMenu(false);
                                }}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors duration-200 text-left text-sm text-white/80"
                            >
                                <User size={16} />
                                Profil & Einstellungen
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors duration-200 text-left text-sm text-red-400"
                            >
                                <LogOut size={16} />
                                Abmelden
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
                        className="fixed left-[88px] bottom-20 z-[70] w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl"
                    >
                        <h3 className="text-sm text-white/90 font-medium mb-3">Schnellzugriff</h3>

                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    const { openPane } = usePaneStore.getState();
                                    openPane({ id: 'settings-main', type: 'settings', title: 'Einstellungen', size: { width: 720, height: 640 } });
                                    setShowSettings(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors duration-200 text-left text-sm text-white/70 hover:text-white/90"
                            >
                                <Settings size={15} />
                                Alle Einstellungen
                            </button>
                            <button
                                onClick={() => {
                                    const { openPane } = usePaneStore.getState();
                                    openPane({ id: 'team-main', type: 'team', title: 'Team', size: { width: 840, height: 640 } });
                                    setShowSettings(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors duration-200 text-left text-sm text-white/70 hover:text-white/90"
                            >
                                <Users size={15} />
                                Team verwalten
                            </button>
                            <button
                                onClick={() => {
                                    const { openPane } = usePaneStore.getState();
                                    openPane({ id: 'mora-hub', type: 'mora-hub', title: 'Mora', size: { width: 680, height: 560 } });
                                    setShowSettings(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors duration-200 text-left text-sm text-white/70 hover:text-white/90"
                            >
                                <Sparkles size={15} />
                                Mora
                            </button>
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
