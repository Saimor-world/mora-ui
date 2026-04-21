"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LogIn, UserPlus, Database, ChevronRight, Clock, Zap, Building2, User, Sparkles } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { CompanyLogoUpload } from '@/components/ui/CompanyLogo';
import { writeCookie, readCookie } from '@/lib/auth/cookies';
import { toast } from 'sonner';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';
import { authLogout, coreGet, getCoreBaseUrl } from '@/lib/api/coreClient';
import { clearClientSessionArtifacts, getSessionTier, formatAbsenceText, touchSessionActivity, type SessionTier } from '@/lib/auth/sessionLifecycle';
import { isAdmin, roleLabel } from '@/lib/auth/roles';

import { bridgeNextAuthSignIn } from '@/lib/auth/nextAuthBridge';
import { OnboardingWizard } from './OnboardingWizard';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';

interface WelcomeScreenProps {
    onAuthenticated: () => void;
}

interface SessionInfo {
    lastWorkspace?: string;
    lastActivity?: string;
    mode?: 'user' | 'owner';
    userName?: string;
    userEmail?: string;
    role?: string;
}

const getCoreUrl = () => getCoreBaseUrl();

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
    const [inviteCode, setInviteCode] = useState('');
    const [companyName, setCompanyName] = useState(''); // For owner registration
    const [logoUrl, setLogoUrl] = useState<string | null>(null); // For owner company logo
    const [selectedRole, setSelectedRole] = useState<'owner' | 'member'>('owner'); // Default owner
    const [isLoading, setIsLoading] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [sessionTier, setSessionTier] = useState<SessionTier | null>(null);
    const [tokenValid, setTokenValid] = useState<boolean | null>(null); // null = not checked yet
    const [reAuthPassword, setReAuthPassword] = useState('');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    // Default true so the button is visible while the policy loads (no CLS/flash)
    const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
    const prefersReducedMotion = useReducedMotion();
    const surfaceProfile = useSurfaceProfile();
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        typeof document === 'undefined' ? true : !document.hidden
    );

    const setViewMode = useNavStore((s) => s.setViewMode);
    const navigateToCore = useNavStore((s) => s.navigateToCore);
    const setUser = useSessionStore((s) => s.setUser);
    const queryClient = useQueryClient();
    const hasInvite = inviteCode.trim().length > 0;
    const ambientMotionEnabled = mode === 'welcome' && !prefersReducedMotion && isDocumentVisible;
    const contextLabel = 'Organisation';
    const loginSubtitle = surfaceProfile.isPublicDemoSurface
        ? 'Simple Coffee Group erkunden oder mit Zugangsdaten weiter'
        : surfaceProfile.isLocalTruthSurface
            ? 'Interne Instanz mit echten Regeln und lokalem Arbeitskontext'
            : 'Zugriff auf deine Organisation';
    const registerSubtitle = surfaceProfile.isPublicDemoSurface
        ? 'Private Instanz ausserhalb der Demo vorbereiten'
        : surfaceProfile.isLocalTruthSurface
            ? 'Lokale oder interne Instanz für echte Produktionsregeln vorbereiten'
            : 'Neue Organisation einrichten';

    const handleLogout = React.useCallback(async (showToast = true) => {
        await authLogout();
        clearClientSessionArtifacts();
        useSessionStore.getState().resetStore();
        useSessionStore.getState().setUser(null);
        useNavStore.getState().navigateToCore();
        useNavStore.getState().setViewMode('workspace');
        setSessionInfo(null);
        setSessionTier(null);
        setTokenValid(null);
        setReAuthPassword('');
        if (showToast) {
            toast.info("Sitzung wurde vollständig bereinigt");
        }
    }, []);

    // Mora Erwachen — consciousness-gradient session check
    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            const authToken = readCookie('saimor_auth');
            const coreSession = readCookie('mora_session');
            const isLocalhost =
                typeof window !== 'undefined' &&
                ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
            const devToken = isLocalhost ? localStorage.getItem('saimor_dev_token') : null;
            const savedMode = typeof window !== 'undefined' ? localStorage.getItem('saimor_mode') : null;
            const lastWorkspace = typeof window !== 'undefined' ? localStorage.getItem('last_workspace') : null;
            const lastActivity = typeof window !== 'undefined' ? localStorage.getItem('last_activity') : null;
            const userName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;
            const userEmail = typeof window !== 'undefined' ? localStorage.getItem('last_user_email') : null;
            const savedRole = typeof window !== 'undefined' ? localStorage.getItem('saimor_role') : null;

            const tier = getSessionTier(lastActivity);
            const hasToken = !!(authToken || coreSession || devToken);

            // neustart (72h+) or no token → clean slate
            if (tier === 'neustart' || !hasToken) {
                if (tier === 'neustart' && hasToken) {
                    // Remember the name even though we clear everything else
                    const rememberedName = userName;
                    await handleLogout(false);
                    if (cancelled) return;
                    if (rememberedName) {
                        setSessionInfo({ userName: rememberedName, role: savedRole || undefined });
                        setSessionTier('neustart');
                    }
                }
                return;
            }

            if (cancelled) return;

            const info: SessionInfo = {
                lastWorkspace: lastWorkspace || undefined,
                lastActivity: lastActivity || undefined,
                mode: (savedMode as 'user' | 'owner') || 'user',
                userName: userName || undefined,
                userEmail: userEmail || undefined,
                role: savedRole || undefined,
            };

            if (tier === 'sofort') {
                // 0–4h: auto-resume, zero friction
                setSessionInfo(info);
                setSessionTier('sofort');
                return;
            }

            if (tier === 'erwachen') {
                // 4–24h: one-click continue
                setSessionInfo(info);
                setSessionTier('erwachen');
                return;
            }

            // erkennung (24–72h): validate token silently, fall back to password on any failure
            let serverValid = false;
            try {
                const serverSession = await coreGet('/v3/auth/session', { skipAuth: true, isOptional: true });
                if (cancelled) return;
                if (serverSession?.user_id) {
                    serverValid = true;
                    info.userName = info.userName || serverSession.name || serverSession.email?.split('@')[0] || undefined;
                    info.userEmail = info.userEmail || serverSession.email || undefined;
                    info.lastWorkspace = info.lastWorkspace || serverSession.active_company_name || undefined;
                }
            } catch {
                // Backend unreachable — degrade gracefully to password prompt
            }
            if (cancelled) return;
            setSessionInfo(info);
            setSessionTier('erkennung');
            setTokenValid(serverValid);
        };

        void checkSession();
        return () => {
            cancelled = true;
        };
    }, [handleLogout]);

    // Tier "sofort": auto-resume with zero UI
    useEffect(() => {
        if (sessionTier === 'sofort' && sessionInfo && !isLoading) {
            void handleContinueSession();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionTier]);

    useEffect(() => {
        // Clear inputs whenever mode changes to avoid "zombie" values
        setEmail('');
        setPassword('');
        setInviteCode('');
        setCompanyName('');
    }, [mode]);

    // Fetch instance policy once on mount — public endpoint, no auth required.
    // Controls whether the "Account Erstellen" button is shown.
    useEffect(() => {
        void coreGet('/v3/auth/instance-policy', { skipAuth: true, isOptional: true })
            .then((data: any) => {
                if (data && typeof data.allow_public_registration === 'boolean') {
                    setAllowPublicRegistration(data.allow_public_registration);
                }
            })
            .catch(() => {
                // On error: keep default (true) so registration is not silently hidden.
            });
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);


    const handleContinueSession = async () => {
        const savedTenantId = localStorage.getItem('saimor_tenant');

        setIsLoading(true);

        try {
            // Refresh companies from server
            const companies = await queryClient.fetchQuery({
                queryKey: queryKeys.companies(),
                queryFn: async () => {
                    const { fetchCompanies } = await import('@/lib/api/orgClient');
                    return fetchCompanies();
                },
                staleTime: 0,
            }) as Array<{ id: string; tenant_id: string; [key: string]: any }>;

            let targetCompany = null;

            // Find User's Company
            if (savedTenantId) {
                targetCompany = companies.find(c => c.tenant_id === savedTenantId);
            }
            // Fallback to first company
            if (!targetCompany && companies.length > 0) {
                targetCompany = companies[0];
            }

            // Set Active Company
            if (targetCompany) {
                useNavStore.getState().setActiveCompany(targetCompany.id);
                void queryClient.invalidateQueries({ queryKey: queryKeys.departments(targetCompany.id) });
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Keine Firma für Benutzer gefunden.');
                }
            }

            toast.success("Willkommen zurück!");
            touchSessionActivity();
            onAuthenticated();
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Sitzungswiederherstellung fehlgeschlagen:', error);
            }
            if (sessionTier === 'sofort') {
                // Auto-resume failed silently — degrade to erwachen
                setSessionTier('erwachen');
                setIsLoading(false);
                return;
            }
            await handleLogout(false);
            toast.error("Sitzung abgelaufen. Bitte erneut anmelden.");
        } finally {
            setIsLoading(false);
        }
    };

    /** Erkennung tier: re-authenticate with password, then resume context */
    const handleReAuth = async () => {
        if (!reAuthPassword) return;
        const userEmail = sessionInfo?.userEmail || localStorage.getItem('last_user_email');
        if (!userEmail) {
            toast.error('E-Mail konnte nicht ermittelt werden');
            setSessionTier(null);
            return;
        }
        setIsLoading(true);
        try {
            // Re-authenticate through the normal login flow
            await handleLogin({ email: userEmail, password: reAuthPassword });
        } catch {
            toast.error('Passwort ungültig');
        } finally {
            setIsLoading(false);
        }
    };

    const saveAuthState = (role: string, email: string, tenantId: string, token?: string | null) => {
        // SECURITY: Clear ALL auth state first to prevent role pollution
        const keysToRemove = [
            'saimor_dev_token', 'saimor_mode', 'saimor_role', 'saimor_tenant',
            'last_workspace', 'last_activity', 'user_name', 'mora_session', 'last_user_name', 'last_user_email'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Now save clean state
        if (token) {
            writeCookie('saimor_auth', token, 7); // legacy/dev bridge only
        } else {
            writeCookie('saimor_auth', '', -1);
        }
        // Dev convenience only; production should not persist bearer tokens in localStorage.
        if (token && typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
            localStorage.setItem('saimor_dev_token', token);
        }
        localStorage.setItem('saimor_mode', role === 'owner' ? 'owner' : role === 'demo' ? 'demo' : 'user');
        localStorage.setItem('saimor_role', role);
        localStorage.setItem('saimor_tenant', tenantId);
        localStorage.setItem('user_name', email.split('@')[0]);
        localStorage.setItem('last_user_email', email);
        touchSessionActivity();
    };


    const handleLogin = async (overrides?: { email?: string; password?: string }) => {
        const loginEmail = overrides?.email ?? email;
        const loginPassword = overrides?.password ?? password;
        const isLocalhost =
            typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

        if (!loginEmail || !loginPassword) {
            toast.error("Bitte E-Mail und Passwort eingeben");
            return;
        }

        setIsLoading(true);
        try {
            const attemptCoreLogin = async (passwordToTry: string) => {
                const response = await fetch('/api/auth/core-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: loginEmail.toLowerCase() === 'demo' ? 'demo@saimor.io' : loginEmail,
                        password: passwordToTry
                    })
                });
                const data = await response.json().catch(() => null);
                return { response, data };
            };

            let { response, data } = await attemptCoreLogin(loginPassword);
            const isDemoLogin = loginEmail.toLowerCase().startsWith('demo') || loginEmail.toLowerCase().includes('demo');
            if ((!response.ok || !data?.success) && isDemoLogin && loginPassword === 'demo') {
                ({ response, data } = await attemptCoreLogin('demo123'));
            }
            if (!response.ok || !data?.success) {
                throw new Error(data?.detail || data?.message || "Ungültige Zugangsdaten");
            }

            if (!isLocalhost) {
                const result = await bridgeNextAuthSignIn({
                    provider: "credentials",
                    redirect: false,
                    username: loginEmail,
                    password: loginPassword
                });

                if (result?.error) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[WelcomeScreen] NextAuth sync failed after core-login, continuing with core session', result.error);
                    }
                }
            }

            if (response.ok && data?.success) {
                saveAuthState(data.role || 'member', data.email || loginEmail, data.tenant_id, null);
                toast.success(`Willkommen, ${(data.email || loginEmail).split('@')[0]}!`);

                setViewMode('workspace');

                // Force a full page navigation so the home bootstrap can pick up the core session cookie.
                window.location.assign('/home');
                return;
            }

        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[WelcomeScreen] Login Fehler:', error);
            }
            toast.error(error?.message || "Login fehlgeschlagen");
        } finally {
            setIsLoading(false);
        }
    };

    // handleDemoMode removed - demo access now requires real login credentials

    const handleRegister = async () => {
        const usingInvite = inviteCode.trim().length > 0;
        const isLocalhost =
            typeof window !== 'undefined' &&
            ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        // Comprehensive input validation
        if (!email || !email.trim()) {
            toast.error('E-Mail-Adresse ist erforderlich');
            return;
        }

        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            toast.error('Ungültige E-Mail-Adresse');
            return;
        }

        if (!password || password.length < 6) {
            toast.error('Passwort muss mindestens 6 Zeichen lang sein');
            return;
        }

        if (!usingInvite && selectedRole === 'owner' && (!companyName || !companyName.trim())) {
            toast.error('Organisationsname ist für Owner-Accounts erforderlich');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Account wird erstellt...");

        try {
            const response = await fetch('/api/auth/core-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    role: usingInvite ? undefined : selectedRole,
                    company_name: !usingInvite && selectedRole === 'owner' ? companyName.trim() : undefined,
                    logo_url: !usingInvite && selectedRole === 'owner' ? logoUrl : undefined,
                    invite_code: usingInvite ? inviteCode.trim() : undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Registrierung fehlgeschlagen' }));
                throw new Error(errorData.detail || 'Registrierung fehlgeschlagen');
            }

            const data = await response.json();
            const role = data.role || selectedRole;

            if (!isLocalhost) {
                const syncResult = await bridgeNextAuthSignIn({
                    provider: "credentials",
                    redirect: false,
                    username: email,
                    password: password
                });
                if (syncResult?.error) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('[WelcomeScreen] NextAuth sync failed after register, continuing with core session', syncResult.error);
                    }
                }
            }

            saveAuthState(role, email, data.tenant_id, null);

            // Fix: Clear onboarding and session flags
            localStorage.setItem('mora_session', 'active');
            localStorage.setItem('last_user_name', email.split('@')[0]);
            localStorage.setItem('last_user_email', email);
            localStorage.removeItem('onboarding_complete');

            useSessionStore.getState().setUser({
                id: data.user_id,
                name: email.split('@')[0],
                email: email,
                role: role
            } as any);

            // Load Initial Data for new user — invalidate + refetch companies
            await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
            const freshCompanies = await queryClient.fetchQuery({
                queryKey: queryKeys.companies(),
                queryFn: async () => {
                    const { fetchCompanies } = await import('@/lib/api/orgClient');
                    return fetchCompanies();
                },
                staleTime: 0,
            }) as Array<{ id: string; tenant_id: string; [key: string]: any }>;
            if (data.tenant_id) {
                const newCompany = freshCompanies.find(c => c.tenant_id === data.tenant_id);
                if (newCompany) {
                    useNavStore.getState().setActiveCompany(newCompany.id);
                }
            }

            // Routing
            if (isAdmin(role)) {
                // Determine if we need onboarding (for new owner it is mandatory)
                setRegisteredEmail(email);
                setShowOnboarding(true);
                toast.success('Account erstellt! Richten wir nun Ihre Organisation ein.', { id: toastId });
                return;
            } else {
                setViewMode('workspace');
                navigateToCore();
                localStorage.setItem('last_workspace', 'Eigene Organisation');
                toast.success("Account erstellt! Willkommen bei SAIMÔR.", { id: toastId });
            }

            onAuthenticated();
        } catch (error: any) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[WelcomeScreen] Registrierung Fehler:', error);
            }
            toast.error(error?.message || "Registrierung fehlgeschlagen", { id: toastId });
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
                    // Land on the default working surface after onboarding.
                    setViewMode('workspace');
                    navigateToCore();
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
                animate={ambientMotionEnabled ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                } : { scale: 1, opacity: 0.28 }}
                transition={ambientMotionEnabled ? {
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : { duration: 0.4 }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[150px] pointer-events-none"
            />
            <motion.div
                animate={ambientMotionEnabled ? {
                    scale: [1.2, 1, 1.2],
                    opacity: [0.2, 0.4, 0.2],
                } : { scale: 1.06, opacity: 0.2 }}
                transition={ambientMotionEnabled ? {
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                } : { duration: 0.4 }}
                className="absolute bottom-1/4 right-1/3 w-[600px] h-[600px] bg-mora-gold/20 rounded-full blur-[120px] pointer-events-none"
            />
            <motion.div
                animate={ambientMotionEnabled ? {
                    scale: [1, 1.3, 1],
                    opacity: [0.15, 0.25, 0.15],
                } : { scale: 1, opacity: 0.14 }}
                transition={ambientMotionEnabled ? {
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                } : { duration: 0.4 }}
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
                            {/* Orb with Pulsing Rings - Decorative only, no MoraOrb component */}
                            <div className="relative w-20 h-20">
                                <motion.div
                                    animate={ambientMotionEnabled ? {
                                        scale: [1, 1.3, 1],
                                        opacity: [0.3, 0, 0.3],
                                    } : { scale: 1, opacity: 0.18 }}
                                    transition={ambientMotionEnabled ? {
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    } : { duration: 0.4 }}
                                    className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-emerald-500/30"
                                />
                                <motion.div
                                    animate={ambientMotionEnabled ? {
                                        scale: [1, 1.5, 1],
                                        opacity: [0.2, 0, 0.2],
                                    } : { scale: 1, opacity: 0.12 }}
                                    transition={ambientMotionEnabled ? {
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.5
                                    } : { duration: 0.4 }}
                                    className="absolute inset-0 w-40 h-40 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-mora-gold/20"
                                />
                                {/* Decorative orb sphere - simpler version without full MoraOrb component */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-radial from-emerald-400/30 to-emerald-600/10 blur-sm" />
                                <motion.div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
                                    style={{
                                        background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 25%), radial-gradient(circle at 50% 50%, #10B981 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.2) 80%, transparent 100%)'
                                    }}
                                    animate={ambientMotionEnabled ? {
                                        scale: [1, 1.05, 1],
                                        opacity: [0.8, 1, 0.8]
                                    } : { scale: 1, opacity: 0.9 }}
                                    transition={ambientMotionEnabled ? {
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    } : { duration: 0.4 }}
                                />
                            </div>

                            {/* Title Section with Better Typography */}
                            <div className="text-center space-y-4">
                                <motion.h1
                                    initial={{ letterSpacing: "0.5em", opacity: 0 }}
                                    animate={{ letterSpacing: "0.35em", opacity: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="text-6xl font-extralight text-emerald-50 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                                >
                                    Mora
                                </motion.h1>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    className="flex items-center justify-center gap-3"
                                >
                                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-emerald-500/30" />
                                    <p className="text-xs text-emerald-500/60 tracking-[0.25em] uppercase font-light">
                                        Intelligentes Wissenssystem
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
                                    <span className="text-[10px] text-mora-gold/70 tracking-widest font-medium">BETA 1.5</span>
                                    <div className="w-1 h-1 rounded-full bg-mora-gold/50 animate-pulse" />
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* ═══ Tier: sofort — auto-resuming indicator ═══ */}
                        {sessionTier === 'sofort' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full max-w-md flex flex-col items-center gap-4"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-sm text-emerald-400/80 tracking-[0.2em] font-light"
                                >
                                    Wird fortgesetzt...
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ═══ Tier: erwachen — Mora wakes up, one-click continue ═══ */}
                        {sessionTier === 'erwachen' && sessionInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="w-full max-w-md relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-mora-gold/20 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                                <div className="relative bg-[#050d0a]/70 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(16,185,129,0.1)] group-hover:border-emerald-500/30 transition-all duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-mora-gold/5 rounded-2xl pointer-events-none" />
                                    <div className="relative z-10">
                                        {/* Awakening headline */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-center mb-5"
                                        >
                                            <div className="text-xs text-emerald-500/50 tracking-[0.3em] uppercase mb-2 font-light">
                                                Mora erwacht
                                            </div>
                                            <div className="text-lg font-light text-emerald-100 tracking-wide">
                                                Willkommen zurück, {sessionInfo.userName || 'Benutzer'}
                                            </div>
                                            <div className="text-xs text-emerald-500/40 mt-1 tracking-wider">
                                                {formatAbsenceText(sessionInfo.lastActivity)}
                                            </div>
                                        </motion.div>

                                        {sessionInfo.lastWorkspace && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.8 }}
                                                className="flex items-center gap-2 text-xs mb-5 p-3 rounded-lg bg-mora-gold/5 border border-mora-gold/10"
                                            >
                                                <Zap className="w-3.5 h-3.5 text-mora-gold" />
                                                <span className="text-emerald-500/70">{contextLabel}:</span>
                                                <span className="text-emerald-100 font-medium">{sessionInfo.lastWorkspace}</span>
                                            </motion.div>
                                        )}

                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 1.0 }}
                                            className="flex gap-3"
                                        >
                                            <motion.button
                                                onClick={handleContinueSession}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                disabled={isLoading}
                                                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500/15 to-emerald-500/10 hover:from-emerald-500/25 hover:to-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-emerald-100 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_0_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_0_rgba(16,185,129,0.2)] disabled:opacity-50"
                                            >
                                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                                <span className="font-medium tracking-wide">Fortsetzen</span>
                                            </motion.button>
                                            <button
                                                onClick={() => void handleLogout()}
                                                className="px-4 py-3.5 text-xs text-red-400/40 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-xl transition-all duration-300 hover:bg-red-500/5"
                                            >
                                                Abmelden
                                            </button>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══ Tier: erkennung — Mora tries to recognize you ═══ */}
                        {sessionTier === 'erkennung' && sessionInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="w-full max-w-md relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-amber-500/15 rounded-2xl blur-xl opacity-40 transition-opacity duration-700" />
                                <div className="relative bg-[#050d0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(16,185,129,0.08)]">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-amber-500/3 rounded-2xl pointer-events-none" />
                                    <div className="relative z-10">
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="text-center mb-5"
                                        >
                                            <div className="text-xs text-amber-500/50 tracking-[0.3em] uppercase mb-2 font-light">
                                                Mora erkennt dich
                                            </div>
                                            <div className="text-lg font-light text-emerald-100 tracking-wide">
                                                {sessionInfo.userName || 'Benutzer'}
                                                {sessionInfo.role && (
                                                    <span className="text-emerald-500/40 text-sm ml-2">
                                                        {roleLabel(sessionInfo.role)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-amber-500/40 mt-1 tracking-wider">
                                                {formatAbsenceText(sessionInfo.lastActivity)}
                                            </div>
                                        </motion.div>

                                        {sessionInfo.lastWorkspace && (
                                            <div className="flex items-center gap-2 text-xs mb-5 p-3 rounded-lg bg-mora-gold/5 border border-mora-gold/10">
                                                <Building2 className="w-3.5 h-3.5 text-mora-gold/70" />
                                                <span className="text-emerald-500/70">Letzter Kontext:</span>
                                                <span className="text-emerald-100 font-medium">{sessionInfo.lastWorkspace}</span>
                                            </div>
                                        )}

                                        <AnimatePresence mode="wait">
                                            {tokenValid === null && (
                                                <motion.div
                                                    key="checking"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-center py-4"
                                                >
                                                    <motion.div
                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        className="text-xs text-emerald-500/50 tracking-widest"
                                                    >
                                                        Identität wird geprueft...
                                                    </motion.div>
                                                </motion.div>
                                            )}

                                            {tokenValid === true && (
                                                <motion.div
                                                    key="valid"
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex gap-3"
                                                >
                                                    <motion.button
                                                        onClick={handleContinueSession}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        disabled={isLoading}
                                                        className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500/15 to-emerald-500/10 hover:from-emerald-500/25 hover:to-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-emerald-100 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_0_rgba(16,185,129,0.1)] disabled:opacity-50"
                                                    >
                                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                                        <span className="font-medium tracking-wide">Identität bestätigt - Fortsetzen</span>
                                                    </motion.button>
                                                    <button
                                                        onClick={() => void handleLogout()}
                                                        className="px-4 py-3.5 text-xs text-red-400/40 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-xl transition-all duration-300 hover:bg-red-500/5"
                                                    >
                                                        Abmelden
                                                    </button>
                                                </motion.div>
                                            )}

                                            {tokenValid === false && (
                                                <motion.div
                                                    key="reauth"
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="space-y-3"
                                                >
                                                    <div className="text-xs text-amber-500/60 text-center tracking-wider mb-3">
                                                        Bestaetige kurz dein Passwort
                                                    </div>
                                                    <input
                                                        type="password"
                                                        value={reAuthPassword}
                                                        onChange={(e) => setReAuthPassword(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleReAuth()}
                                                        placeholder="Passwort"
                                                        autoFocus
                                                        className="w-full px-4 py-3 bg-[#0a1a14]/80 border border-white/10 focus:border-emerald-500/40 rounded-xl text-emerald-100 placeholder-emerald-800/60 outline-none transition-all duration-300 text-sm tracking-wide"
                                                    />
                                                    <div className="flex gap-3">
                                                        <motion.button
                                                            onClick={handleReAuth}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            disabled={isLoading || !reAuthPassword}
                                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500/15 to-emerald-500/10 hover:from-emerald-500/25 hover:to-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-emerald-100 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            <LogIn className="w-4 h-4 text-emerald-400" />
                                                            <span className="font-medium tracking-wide text-sm">Bestaetigen</span>
                                                        </motion.button>
                                                        <button
                                                            onClick={() => void handleLogout()}
                                                            className="px-4 py-3 text-xs text-red-400/40 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-xl transition-all duration-300 hover:bg-red-500/5"
                                                        >
                                                            Abmelden
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══ Tier: neustart — remembered name greeting ═══ */}
                        {sessionTier === 'neustart' && sessionInfo?.userName && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-center mb-2"
                            >
                                <div className="text-xs text-emerald-500/30 tracking-[0.2em] font-light">
                                    Willkommen, {sessionInfo.userName}
                                </div>
                            </motion.div>
                        )}

                        {/* Action Buttons - show when no active session tier (or neustart) */}
                        {(!sessionTier || sessionTier === 'neustart') && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, staggerChildren: 0.1 }}
                                className="w-full max-w-md space-y-3"
                            >
                                {surfaceProfile.isLocalTruthSurface && (
                                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-3 text-left">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
                                            Interne Instanz
                                        </div>
                                        <div className="mt-2 text-xs leading-relaxed text-emerald-100/75">
                                            Hier gelten die echten lokalen Regeln. Diese Oberfläche ist für reale Workflows, Integrationen und Produktionslogik gedacht; die Demo spiegelt nur den stabilen Stand.
                                        </div>
                                    </div>
                                )}

                                {/* Anmelden Button */}
                                <motion.button
                                    onClick={() => setMode('login')}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full p-6 bg-[#050d0a]/60 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300">
                                        <LogIn className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="text-sm font-medium text-emerald-50 tracking-wide group-hover:text-white transition-colors">
                                            {surfaceProfile.isLocalTruthSurface ? 'Interne Instanz öffnen' : 'Anmelden'}
                                        </div>
                                        <div className="text-xs text-emerald-500/60 font-light tracking-wider group-hover:text-emerald-400/80 transition-colors">{loginSubtitle}</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-emerald-500/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                </motion.button>

                                {/* Account Erstellen Button — hidden when instance policy disables public registration */}
                                {allowPublicRegistration && <motion.button
                                    onClick={() => setMode('register')}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full p-6 bg-[#050d0a]/60 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-mora-gold/0 via-mora-gold/10 to-mora-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative p-3 rounded-xl bg-mora-gold/10 border border-mora-gold/20 group-hover:bg-mora-gold/20 group-hover:border-mora-gold/40 transition-all duration-300">
                                        <UserPlus className="w-5 h-5 text-mora-gold group-hover:text-mora-gold/90 transition-colors" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="text-sm font-medium text-emerald-50 tracking-wide group-hover:text-white transition-colors">
                                            {surfaceProfile.isPublicDemoSurface ? 'Eigene Instanz vorbereiten' : surfaceProfile.isLocalTruthSurface ? 'Instanz vorbereiten' : 'Account Erstellen'}
                                        </div>
                                        <div className="text-xs text-emerald-500/60 font-light tracking-wider group-hover:text-mora-gold/70 transition-colors">{registerSubtitle}</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-mora-gold/30 group-hover:text-mora-gold group-hover:translate-x-1 transition-all" />
                                </motion.button>}

                                {/* Curated public demo entry */}
                                <motion.button
                                    onClick={() => {
                                        void handleLogin({ email: 'demo', password: 'demo123' });
                                    }}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full p-6 bg-[#050d0a]/60 backdrop-blur-xl border border-white/10 hover:border-blue-500/40 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden shadow-[0_4px_24px_0_rgba(0,0,0,0.3)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-all duration-300">
                                        <Sparkles className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                                    </div>
                                    <div className="flex-1 text-left relative z-10">
                                        <div className="text-sm font-medium text-emerald-50 tracking-wide group-hover:text-white transition-colors">
                                            {surfaceProfile.isLocalTruthSurface ? 'Demo-Spiegel öffnen' : 'Simple Coffee Group öffnen'}
                                        </div>
                                        <div className="text-xs text-blue-500/60 font-light tracking-wider group-hover:text-blue-400/80 transition-colors">
                                            {surfaceProfile.isLocalTruthSurface
                                                ? 'Spiegele den aktuellen stabilen Demo-Flow, ohne die Wahrheitsinstanz zu verlassen.'
                                                : 'Kuratierten Demo-Flow mit echter Struktur, Signalen und Finder starten'}
                                        </div>
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
                                        ANMELDEN
                                    </h2>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                E-Mail
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                spellCheck="false"
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="name@firma.de"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                Passwort
                                            </label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                                autoComplete="new-password"
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="********"
                                            />
                                        </div>

                                        <motion.button
                                            onClick={() => void handleLogin()}
                                            disabled={isLoading}
                                            whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                            whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                            className="w-full mt-8 py-3.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 hover:from-emerald-500/30 hover:to-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500/60 rounded-xl text-emerald-100 font-medium tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_0_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_0_rgba(16,185,129,0.2)]"
                                        >
                                            {isLoading ? 'Melde an...' : 'Anmelden'}
                                        </motion.button>

                                        <button
                                            onClick={() => {
                                                setEmail('');
                                                setPassword('');
                                                setMode('welcome');
                                            }}
                                            className="w-full py-3 text-xs text-emerald-500/50 hover:text-emerald-400 transition-colors tracking-wider"
                                        >
                                            {'<- Zurueck zum Einstieg'}
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
                        {/* Glass Form Container */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-mora-gold/20 via-transparent to-emerald-500/10 rounded-2xl blur-2xl opacity-60" />
                            <div className="relative bg-[#050d0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-[0_8px_32px_0_rgba(16,185,129,0.15)]">
                                {/* Inner Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent rounded-2xl pointer-events-none" />

                                <div className="relative z-10">
                                    <h2 className="text-2xl font-extralight tracking-[0.2em] text-emerald-50 mb-8 text-center uppercase drop-shadow-[0_0_15px_rgba(206,182,118,0.2)]">
                                        {surfaceProfile.isPublicDemoSurface ? 'Eigene Instanz vorbereiten' : surfaceProfile.isLocalTruthSurface ? 'Instanz vorbereiten' : 'Account Erstellen'}
                                    </h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                E-Mail
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-mora-gold/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="ihre@email.de"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                Passwort
                                            </label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-mora-gold/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="********"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                                                Einladungscode (optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={inviteCode}
                                                onChange={(e) => setInviteCode(e.target.value)}
                                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-mora-gold/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                                                placeholder="INVITE-XXXX"
                                            />
                                        </div>

                                        {/* Company Name - Only for Owners */}
                                        {!hasInvite && selectedRole === 'owner' && (
                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <div className="flex justify-center mb-4">
                                                    <CompanyLogoUpload
                                                        value={logoUrl}
                                                        onChange={setLogoUrl}
                                                        companyName={companyName || 'Organisation'}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] text-mora-gold/70 mb-2.5 uppercase tracking-widest font-medium">
                                                        Organisationsname *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={companyName}
                                                        onChange={(e) => setCompanyName(e.target.value)}
                                                        className="w-full bg-black/40 border border-mora-gold/30 rounded-xl px-4 py-3.5 text-emerald-50 focus:outline-none focus:border-mora-gold/60 focus:bg-black/60 placeholder:text-mora-gold/30 transition-all duration-300"
                                                        placeholder="Name Ihrer Organisation"
                                                    />
                                                    <p className="text-[10px] text-mora-gold/50 mt-1.5 flex items-center gap-1">
                                                        <Sparkles size={10} />
                                                        Dies wird der Name Ihrer Organisation sein
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Role Selection */}
                                        {!hasInvite && (
                                            <div className="pt-2">
                                                <label className="block text-[10px] text-emerald-500/60 mb-3 uppercase tracking-widest font-medium">
                                                    Account-Typ
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRole('owner')}
                                                        className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 relative overflow-hidden group ${selectedRole === 'owner'
                                                            ? 'border-mora-gold bg-mora-gold/10 text-mora-gold shadow-[0_0_20px_rgba(206,182,118,0.15)]'
                                                            : 'border-white/10 bg-black/20 text-emerald-100/70 hover:border-emerald-500/30 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {selectedRole === 'owner' && <div className="absolute inset-0 bg-mora-gold/5 animate-pulse" />}
                                                        <Building2 className={`w-5 h-5 ${selectedRole === 'owner' ? 'drop-shadow-[0_0_8px_rgba(206,182,118,0.5)]' : ''}`} />
                                                        <span className="text-xs font-medium relative z-10">Eigentümer</span>
                                                        <span className="text-[10px] opacity-50 relative z-10">Team verwalten</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRole('member')}
                                                        className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 relative overflow-hidden group ${selectedRole === 'member'
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                                            : 'border-white/10 bg-black/20 text-emerald-100/70 hover:border-emerald-500/30 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <User className={`w-5 h-5 ${selectedRole === 'member' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} />
                                                        <span className="text-xs font-medium relative z-10">Mitglied</span>
                                                        <span className="text-[10px] opacity-50 relative z-10">Bereich beitreten</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <motion.button
                                            onClick={handleRegister}
                                            disabled={isLoading}
                                            whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                            whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                            className="w-full mt-6 py-3.5 bg-gradient-to-r from-mora-gold/15 to-mora-gold/5 hover:from-mora-gold/25 hover:to-mora-gold/15 border border-mora-gold/30 hover:border-mora-gold/50 rounded-xl text-emerald-100 font-medium tracking-wide transition-all duration-300 disabled:opacity-50 shadow-[0_0_20px_0_rgba(206,182,118,0.1)] hover:shadow-[0_0_30px_0_rgba(206,182,118,0.2)]"
                                        >
                                            {isLoading ? 'Erstelle...' : 'Account Erstellen'}
                                        </motion.button>

                                        <button
                                            onClick={() => setMode('welcome')}
                                            className="w-full py-3 text-xs text-emerald-500/50 hover:text-emerald-400 transition-colors tracking-wider"
                                        >
                                            {'<- Zurueck zum Einstieg'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

