"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Database, ChevronRight, Clock, Zap, Building2, User } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { CompanyLogoUpload } from '@/components/ui/CompanyLogo';
import { writeCookie, readCookie } from '@/lib/auth/cookies';
import { toast } from 'sonner';
import { useMoraStore, type User as MoraUser } from '@/lib/store/moraState';
import { MOCK_DATA } from '@/lib/data/mockData';
import { OnboardingWizard } from './OnboardingWizard';

interface WelcomeScreenProps {
    onAuthenticated: () => void;
}

interface SessionInfo {
    lastWorkspace?: string;
    lastActivity?: string;
    mode?: 'demo' | 'user' | 'owner';
    userName?: string;
    role?: string;
}

// Use the Next.js rewrites proxy to avoid CORS issues
const CORE_URL = '/api/core';

/**
 * WelcomeScreen - Unified Authentication Entry Point
 * 
 * MASTERBIBEL compliant:
 * - Single entry point for all auth flows
 * - Owner sees only company metadata (no customer data!)
 * - Demo is treated as a "customer" (Simple Coffee Group)
 * - Real backend authentication
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAuthenticated }) => {
    const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'role-select'>('welcome');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState(''); // For owner registration
    const [logoUrl, setLogoUrl] = useState<string | null>(null); // For owner company logo
    const [selectedRole, setSelectedRole] = useState<'owner' | 'member' | 'demo'>('owner'); // Default to owner
    const [isLoading, setIsLoading] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [showSessionCard, setShowSessionCard] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    const { setViewMode, setViewLevel, setUser } = useMoraStore();

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = () => {
            const authToken = readCookie('saimor_auth');
            const devToken = typeof window !== 'undefined' ? localStorage.getItem('saimor_dev_token') : null;
            const savedMode = typeof window !== 'undefined' ? localStorage.getItem('saimor_mode') : null;
            const lastWorkspace = typeof window !== 'undefined' ? localStorage.getItem('last_workspace') : null;
            const lastActivity = typeof window !== 'undefined' ? localStorage.getItem('last_activity') : null;
            const userName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;
            const savedRole = typeof window !== 'undefined' ? localStorage.getItem('saimor_role') : null;

            if (authToken || devToken) {
                setSessionInfo({
                    lastWorkspace: lastWorkspace || undefined,
                    lastActivity: lastActivity || undefined,
                    mode: (savedMode as 'demo' | 'user' | 'owner') || 'user',
                    userName: userName || undefined,
                    role: savedRole || undefined
                });
                setShowSessionCard(true);
            }
        };

        checkSession();
    }, []);

    useEffect(() => {
        // Clear inputs whenever mode changes to avoid "zombie" values
        setEmail('');
        setPassword('');
        setCompanyName('');
    }, [mode]);
    const handleLogout = () => {
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('saimor_mode');
        localStorage.removeItem('saimor_role');
        localStorage.removeItem('saimor_tenant');
        localStorage.removeItem('last_workspace');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('user_name');
        localStorage.removeItem('onboarding_complete'); // Fix: Ensure clean slate
        useMoraStore.getState().resetStore(); // Fix: Clear Zustand state immediately
        writeCookie('saimor_auth', '', -1);
        setSessionInfo(null);
        setShowSessionCard(false);
        toast.info("Session cleared");
    };

    const handleContinueSession = async () => {
        const savedRole = localStorage.getItem('saimor_role');
        const savedTenantId = localStorage.getItem('saimor_tenant');
        const store = useMoraStore.getState();

        setIsLoading(true);

        try {
            // 1. Load Data for ALL roles (Critical Fix for Member View)
            await store.loadCompanies();
            const companies = useMoraStore.getState().companies;
            let targetCompany = null;

            if (savedRole === 'demo') {
                setViewMode('demo');
                // Find Demo Company
                targetCompany = companies.find(c => c.is_demo === true)
                    || companies.find(c => c.name.toLowerCase().includes('coffee'))
                    || companies.find(c => !c.name.toLowerCase().includes('saimor'));
            } else {
                // Normal User/Owner
                if (savedRole === 'owner') {
                    setViewMode('owner');
                    setViewLevel('company');
                } else {
                    setViewMode('workspace');
                    setViewLevel('company');
                }

                // Find User's Company
                if (savedTenantId) {
                    targetCompany = companies.find(c => c.tenant_id === savedTenantId);
                }
                // Fallback to first company
                if (!targetCompany && companies.length > 0) {
                    targetCompany = companies[0];
                }
            }

            // 2. Set Active Company
            if (targetCompany) {
                store.setActiveCompany(targetCompany.id);
                await store.loadDepartments(targetCompany.id);
                console.log('✅ Session restored for:', targetCompany.name);
            } else if (savedRole !== 'demo') {
                console.warn('⚠️ No company found for user.');
                // Maybe trigger onboarding or error?
            }

            toast.success("Welcome back!");
            onAuthenticated();
        } catch (error) {
            console.error('Failed to continue session:', error);
            handleLogout(); // Auto-logout on corrupted session
            toast.error("Session expired. Please login again.");
        } finally {
            setIsLoading(false);
        }
    };



    const saveAuthState = (token: string, role: string, email: string, tenantId: string) => {
        writeCookie('saimor_auth', token, 7); // 7 days
        localStorage.setItem('saimor_dev_token', token);
        localStorage.setItem('saimor_mode', role === 'owner' ? 'owner' : role === 'demo' ? 'demo' : 'user');
        localStorage.setItem('saimor_role', role);
        localStorage.setItem('saimor_tenant', tenantId);
        localStorage.setItem('user_name', email.split('@')[0]);
        localStorage.setItem('last_activity', new Date().toISOString());
    };

    const handleDemoMode = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Starting demo mode...");

        try {
            // ═══════════════════════════════════════════════════════════════════════════
            // PHASE 6: CREATE TEMPORARY DEMO USER
            // ═══════════════════════════════════════════════════════════════════════════
            const demoUser: MoraUser = {
                id: 'demo-user-temp',
                name: 'Demo User',
                email: 'demo@saimor.dev',
                role: 'demo'
            };

            // Set the demo user in store
            setUser(demoUser);

            // 1. Try to use ENV Token if available (Dev/Preview)
            const envToken = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT;

            if (envToken) {
                console.log('Using ENV Token for Demo');
                saveAuthState(envToken, 'demo', 'demo@saimor.dev', 'tenant-default');
            } else {
                // Create a fake token for demo mode
                saveAuthState('demo-token-local', 'demo', 'demo@saimor.dev', 'tenant-default');
            }

            localStorage.setItem('last_workspace', 'Simple Coffee Group');
            setViewMode('demo');

            // Load data
            const store = useMoraStore.getState();
            try {
                await store.loadCompanies();
            } catch (e) {
                console.warn('Failed to load companies in demo init:', e);
            }

            const companies = useMoraStore.getState().companies;
            let demoCompany = companies.find(c => c.is_demo === true);

            if (!demoCompany) {
                demoCompany = companies.find(c => c.name.toLowerCase().includes('coffee'));
            }
            if (!demoCompany) {
                demoCompany = companies.find(c => !c.name.toLowerCase().includes('saimor'));
            }
            if (!demoCompany && companies.length > 0) {
                demoCompany = companies[0];
            }

            // FALLBACK IF NO COMPANIES LOADED (e.g. Backend Offline)
            if (!demoCompany) {
                console.warn('⚠️ No companies found. Using fallback mock company for demo.');
                demoCompany = {
                    id: 'comp-demo-fallback',
                    tenant_id: 'tenant-default',
                    owner_id: 'demo-owner',
                    name: 'Simple Coffee Group',
                    slug: 'simple-coffee',
                    description: 'Demo Company',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    logo_url: null,
                    is_demo: true
                };

                // Inject fallback company into store
                useMoraStore.setState(state => ({
                    companies: [...state.companies, demoCompany!]
                }));
            }

            if (demoCompany) {
                store.setActiveCompany(demoCompany.id);

                // ═══════════════════════════════════════════════════════════════════════════
                // PHASE 6: LOAD MOCK NODES FOR SEMANTIC HIERARCHY (MOONS)
                // ═══════════════════════════════════════════════════════════════════════════
                const mockNodes = MOCK_DATA.demo.nodes || [];

                // Inject all necessary mock data for full offline experience
                // ALWAYS inject demo mock data for consistent universe visualization
                useMoraStore.setState(state => ({
                    // 1. Inject Nodes (background particles)
                    nodesByCompany: {
                        ...state.nodesByCompany,
                        [demoCompany!.id]: mockNodes as any
                    },
                    // 2. Inject Departments - ALWAYS for demo to ensure planets
                    departments: MOCK_DATA.demo.departments as any,
                    // 3. Inject Spaces (Moons) - ALWAYS for demo to ensure moons orbit planets
                    spacesByDepartment: {
                        ...state.spacesByDepartment,
                        ...(MOCK_DATA.demo.spaces as any)
                    },
                    // 4. Inject Folders (Stars) for demo - ALWAYS inject for consistent universe
                    foldersBySpace: {
                        ...state.foldersBySpace,
                        ...(MOCK_DATA.demo.folders as any)
                    }
                }));

                // Only try to load real departments if we found a real company
                if (demoCompany.id !== 'comp-demo-fallback') {
                    store.loadDepartments(demoCompany.id).catch(console.error);
                }

                toast.success(`Welcome to ${demoCompany.name}`, { id: toastId });
            } else {
                toast.success("Demo mode activated", { id: toastId });
            }

            onAuthenticated();
            return;
        } catch (error: any) {
            console.error('[WelcomeScreen] Demo error:', error);
            toast.error("Could not start demo mode: " + error.message, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${CORE_URL}/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            const role = data.role || 'member';

            saveAuthState(data.token, role, email, data.tenant_id);

            // Set user in store first
            const store = useMoraStore.getState();
            store.setUser({
                id: data.user_id,
                name: email.split('@')[0],
                email: email,
                role: role
            });

            // Set View Mode immediately (data will load in /home)
            if (role === 'owner' || role === 'admin') {
                setViewMode('owner');
                setViewLevel('company');
                localStorage.setItem('last_workspace', 'Owner Dashboard');
            } else {
                setViewMode('workspace');
                setViewLevel('company');
                localStorage.setItem('last_workspace', email.split('@')[0] + "'s Workspace");
            }

            // Also store session markers
            localStorage.setItem('mora_session', 'active');
            localStorage.setItem('last_user_name', email.split('@')[0]);

            toast.success(`Welcome, ${email.split('@')[0]}!`);

            // Navigate FIRST, data will load async in /home via useAuthBootstrapper
            onAuthenticated();
        } catch (error: any) {
            console.error('[WelcomeScreen] Login error:', error);
            toast.error(error?.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }

        if (selectedRole === 'owner' && !companyName.trim()) {
            toast.error("Please enter a company name");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Creating your account...");

        try {
            const response = await fetch(`${CORE_URL}/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    role: selectedRole,
                    company_name: selectedRole === 'owner' ? companyName.trim() : undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
                throw new Error(errorData.detail || 'Registration failed');
            }

            const data = await response.json();
            const role = data.role || selectedRole;

            saveAuthState(data.token, role, email, data.tenant_id);

            // Fix: Clear onboarding and session flags
            localStorage.setItem('mora_session', 'active');
            localStorage.setItem('last_user_name', email.split('@')[0]);
            localStorage.removeItem('onboarding_complete');

            setUser({
                id: data.user_id,
                name: email.split('@')[0],
                email: email,
                role: role
            });

            // Load Initial Data for new user
            const store = useMoraStore.getState();
            await store.loadCompanies(); // New company should appear
            if (data.tenant_id) {
                const newCompany = store.companies.find(c => c.tenant_id === data.tenant_id);
                if (newCompany) {
                    store.setActiveCompany(newCompany.id);
                }
            }

            // Routing
            if (role === 'owner' || role === 'admin') {
                // Determine if we need onboarding (for new owner it is mandatory)
                setRegisteredEmail(email);
                setShowOnboarding(true);
                toast.success('Account created! Let\'s set up your workspace.', { id: toastId });
                return;
            } else {
                setViewMode('workspace');
                setViewLevel('company');
                localStorage.setItem('last_workspace', email.split('@')[0] + "'s Workspace");
                toast.success("Account created! Welcome to SAIMÔR.", { id: toastId });
            }

            onAuthenticated();
        } catch (error: any) {
            console.error('[WelcomeScreen] Register error:', error);
            toast.error(error?.message || "Registration failed", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    // Show Onboarding Wizard after registration
    if (showOnboarding) {
        return (
            <OnboardingWizard
                companyName={companyName}
                userEmail={registeredEmail || email}
                onComplete={() => {
                    setShowOnboarding(false);
                    // Show the workspace (planets) immediately after creation so user sees their "brain"
                    setViewMode('workspace');
                    setViewLevel('company');
                    onAuthenticated();
                }}
            />
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#030806] flex items-center justify-center z-critical overflow-hidden"
        >
            {/* Layered Ambient Background - Breathing Effect */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[150px] pointer-events-none"
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
                className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-mora-gold/20 rounded-full blur-[120px] pointer-events-none"
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.15, 0.25, 0.15],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px] pointer-events-none"
            />

            {/* Noise Texture Overlay for Organic Feel */}
            {/* Noise texture removed - asset not available */}

            <AnimatePresence mode="wait">
                {mode === 'welcome' && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full px-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="flex flex-col items-center gap-8"
                        >
                            {/* Orb with Pulsing Rings */}
                            <div className="relative">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.3, 0, 0.3],
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-emerald-500/30"
                                />
                                <motion.div
                                    animate={{
                                        scale: [1, 1.5, 1],
                                        opacity: [0.2, 0, 0.2],
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.5
                                    }}
                                    className="absolute inset-0 w-40 h-40 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-mora-gold/20"
                                />
                                <MoraOrb state="idle" />
                            </div>

                            {/* Title Section with Better Typography */}
                            <div className="text-center space-y-4">
                                <motion.h1
                                    initial={{ letterSpacing: "0.5em", opacity: 0 }}
                                    animate={{ letterSpacing: "0.35em", opacity: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="text-6xl font-extralight text-emerald-50 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                >
                                    MÔRA
                                </motion.h1>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    className="flex items-center justify-center gap-3"
                                >
                                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-emerald-500/30" />
                                    <p className="text-xs text-emerald-500/60 tracking-[0.25em] uppercase font-light">
                                        Intelligent Knowledge System
                                    </p>
                                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-emerald-500/30" />
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8, duration: 0.8 }}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <div className="w-1 h-1 rounded-full bg-mora-gold/50 animate-pulse" />
                                    <span className="text-[10px] text-mora-gold/70 tracking-widest font-medium">BETA 1.4</span>
                                    <div className="w-1 h-1 rounded-full bg-mora-gold/50 animate-pulse" />
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Session Card - Continue Previous Session */}
                        {showSessionCard && sessionInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="w-full max-w-md relative group"
                            >
                                {/* Glass Card with Inner Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-mora-gold/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
                                <div className="relative bg-[#050d0a]/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(16,185,129,0.1)] group-hover:border-emerald-500/30 transition-all duration-500">
                                    {/* Inner Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-mora-gold/5 rounded-2xl pointer-events-none" />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="flex items-center gap-3">
                                                <motion.div
                                                    animate={{ rotate: [0, 360] }}
                                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                                    className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                                                >
                                                    <Clock className="w-5 h-5 text-emerald-400" />
                                                </motion.div>
                                                <div>
                                                    <div className="text-sm font-medium text-emerald-100 tracking-wide">Welcome Back!</div>
                                                    <div className="text-xs text-emerald-500/60 font-light tracking-wider">
                                                        {sessionInfo.userName || 'User'}
                                                        {sessionInfo.role && ` • ${sessionInfo.role.charAt(0).toUpperCase() + sessionInfo.role.slice(1)}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="text-xs text-red-400/50 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                                            >
                                                Clear
                                            </button>
                                        </div>

                                        {sessionInfo.lastWorkspace && (
                                            <div className="flex items-center gap-2 text-xs mb-5 p-3 rounded-lg bg-mora-gold/5 border border-mora-gold/10">
                                                <Zap className="w-3.5 h-3.5 text-mora-gold" />
                                                <span className="text-emerald-500/70">Last workspace:</span>
                                                <span className="text-emerald-100 font-medium">{sessionInfo.lastWorkspace}</span>
                                            </div>
                                        )}

                                        <motion.button
                                            onClick={handleContinueSession}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500/15 to-emerald-500/10 hover:from-emerald-500/25 hover:to-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-emerald-100 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_0_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_0_rgba(16,185,129,0.2)]"
                                        >
                                            <span className="font-medium tracking-wide">Continue Session</span>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Action Buttons - Only show when no session exists */}
                        {!showSessionCard && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, staggerChildren: 0.1 }}
                                className="w-full max-w-md space-y-3"
                            >
                                {/* Sign In Button */}
                                <motion.button
                                    onClick={() => setMode('login')}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full p-6 bg-[#050d0a]/60 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]"
                                >
                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300">
                                        <LogIn className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="text-sm font-medium text-emerald-50 tracking-wide group-hover:text-white transition-colors">Sign In</div>
                                        <div className="text-xs text-emerald-500/60 font-light tracking-wider group-hover:text-emerald-400/80 transition-colors">Access your workspace</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-emerald-500/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                </motion.button>

                                {/* Create Account Button */}
                                <motion.button
                                    onClick={() => setMode('register')}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full p-6 bg-[#050d0a]/60 backdrop-blur-xl border border-white/10 hover:border-mora-gold/40 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]"
                                >
                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-mora-gold/0 via-mora-gold/10 to-mora-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative p-3 rounded-xl bg-mora-gold/10 border border-mora-gold/20 group-hover:bg-mora-gold/20 group-hover:border-mora-gold/40 transition-all duration-300">
                                        <UserPlus className="w-5 h-5 text-mora-gold group-hover:text-mora-gold/90 transition-colors" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="text-sm font-medium text-emerald-50 tracking-wide group-hover:text-white transition-colors">Create Account</div>
                                        <div className="text-xs text-emerald-500/60 font-light tracking-wider group-hover:text-mora-gold/70 transition-colors">Start your journey</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-mora-gold/30 group-hover:text-mora-gold group-hover:translate-x-1 transition-all" />
                                </motion.button>

                                {/* Demo Mode Button */}
                                <motion.button
                                    onClick={handleDemoMode}
                                    disabled={isLoading}
                                    whileHover={{ scale: isLoading ? 1 : 1.02, x: isLoading ? 0 : 4 }}
                                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                    className="w-full p-6 bg-[#050d0a]/60 backdrop-blur-xl border border-white/10 hover:border-blue-500/40 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]"
                                >
                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all duration-300">
                                        <Database className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="text-sm font-medium text-emerald-50 tracking-wide group-hover:text-white transition-colors">Demo Mode</div>
                                        <div className="text-xs text-emerald-500/60 font-light tracking-wider group-hover:text-blue-400/80 transition-colors">Explore Simple Coffee Group</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-blue-500/30 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                </motion.button>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Login Form */}
                {mode === 'login' && (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 w-full max-w-md px-6"
                    >
                        {/* Glass Form Container */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-500/5 rounded-2xl blur-2xl opacity-60" />
                            <div className="relative bg-[#050d0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-[0_8px_32px_0_rgba(16,185,129,0.15)]">
                                {/* Inner Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent rounded-2xl pointer-events-none" />

                                <div className="relative z-10">
                                    <h2 className="text-3xl font-extralight tracking-[0.25em] text-emerald-50 mb-8 text-center drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                        SIGN IN
                                    </h2>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="your@email.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        <motion.button
                                            onClick={handleLogin}
                                            disabled={isLoading}
                                            whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                            whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                            className="w-full mt-8 py-3.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 hover:from-emerald-500/30 hover:to-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500/60 rounded-xl text-emerald-100 font-medium tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_0_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_0_rgba(16,185,129,0.2)]"
                                        >
                                            {isLoading ? 'Signing in...' : 'Sign In'}
                                        </motion.button>

                                        <button
                                            onClick={() => {
                                                setEmail('');
                                                setPassword('');
                                                setMode('welcome');
                                            }}
                                            className="w-full py-3 text-xs text-emerald-500/50 hover:text-emerald-400 transition-colors tracking-wider"
                                        >
                                            ← Back to Welcome
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Register Form */}
                {mode === 'register' && (
                    <motion.div
                        key="register"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 w-full max-w-md px-6"
                    >
                        <div className="bg-[#050d0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                            <h2 className="text-2xl font-light tracking-widest text-emerald-50 mb-6 text-center">Create Account</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-emerald-500/50 mb-2 uppercase">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-emerald-50 focus:outline-none focus:border-mora-gold/50"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-emerald-500/50 mb-2 uppercase">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-emerald-50 focus:outline-none focus:border-mora-gold/50"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {/* Company Name - Only for Owners */}
                                {selectedRole === 'owner' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-center mb-4">
                                            <CompanyLogoUpload
                                                value={logoUrl}
                                                onChange={setLogoUrl}
                                                companyName={companyName || 'Company'}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-mora-gold/70 mb-2 uppercase">Company Name *</label>
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="w-full bg-black/30 border border-mora-gold/30 rounded-lg px-4 py-3 text-emerald-50 focus:outline-none focus:border-mora-gold/50 placeholder:text-mora-gold/30"
                                                placeholder="Your Company Name"
                                            />
                                            <p className="text-[10px] text-mora-gold/50 mt-1">This will be your workspace name</p>
                                        </div>
                                    </div>
                                )}

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs text-emerald-500/50 mb-3 uppercase">Account Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole('owner')}
                                            className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedRole === 'owner'
                                                ? 'border-mora-gold bg-mora-gold/10 text-mora-gold'
                                                : 'border-white/10 text-emerald-100/70 hover:border-emerald-500/30'
                                                }`}
                                        >
                                            <Building2 className="w-5 h-5" />
                                            <span className="text-xs font-medium">Owner</span>
                                            <span className="text-[10px] opacity-50">Manage clients</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole('member')}
                                            className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${selectedRole === 'member'
                                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                                : 'border-white/10 text-emerald-100/70 hover:border-emerald-500/30'
                                                }`}
                                        >
                                            <User className="w-5 h-5" />
                                            <span className="text-xs font-medium">Member</span>
                                            <span className="text-[10px] opacity-50">Join workspace</span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleRegister}
                                    disabled={isLoading}
                                    className="w-full mt-6 py-3 bg-mora-gold/10 hover:bg-mora-gold/20 border border-mora-gold/30 rounded-lg text-emerald-100 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating...' : 'Create Account'}
                                </button>

                                <button
                                    onClick={() => setMode('welcome')}
                                    className="w-full py-2 text-xs text-emerald-500/50 hover:text-emerald-400"
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
