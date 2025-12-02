"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Database, ChevronRight, Clock, Zap } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { writeCookie, readCookie } from '@/lib/auth/cookies';
import { toast } from 'sonner';
import { getDevToken } from '@/lib/api/devToken';

interface WelcomeScreenProps {
    onAuthenticated: () => void;
}

interface SessionInfo {
    lastWorkspace?: string;
    lastActivity?: string;
    mode?: 'demo' | 'user';
    userName?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAuthenticated }) => {
    const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [showSessionCard, setShowSessionCard] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = () => {
            const authToken = readCookie('saimor_auth');
            const devToken = typeof window !== 'undefined' ? localStorage.getItem('saimor_dev_token') : null;
            const savedMode = typeof window !== 'undefined' ? localStorage.getItem('saimor_mode') : null;
            const lastWorkspace = typeof window !== 'undefined' ? localStorage.getItem('last_workspace') : null;
            const lastActivity = typeof window !== 'undefined' ? localStorage.getItem('last_activity') : null;
            const userName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;

            if (authToken || devToken) {
                setSessionInfo({
                    lastWorkspace: lastWorkspace || undefined,
                    lastActivity: lastActivity || undefined,
                    mode: (savedMode as 'demo' | 'user') || 'user',
                    userName: userName || undefined
                });
                setShowSessionCard(true);
            }
        };

        checkSession();
    }, []);

    const handleContinueSession = () => {
        console.log('[WelcomeScreen] Continue session clicked');
        toast.success("Welcome back!");
        onAuthenticated();
    };

    const handleLogout = () => {
        localStorage.removeItem('saimor_dev_token');
        localStorage.removeItem('saimor_mode');
        localStorage.removeItem('last_workspace');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('user_name');
        writeCookie('saimor_auth', '', -1);
        setSessionInfo(null);
        setShowSessionCard(false);
        toast.info("Session cleared");
    };

    const handleDemoMode = async () => {
        console.log('[WelcomeScreen] Demo mode clicked');
        const envToken = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT || process.env.NEXT_PUBLIC_API_TOKEN;

        const useToken = (token: string) => {
            localStorage.setItem('saimor_dev_token', token);
            localStorage.setItem('saimor_mode', 'demo');
            localStorage.setItem('saimor_tenant', 'demo-simple-coffee');
            localStorage.setItem('last_workspace', 'Simple Coffee Group');
            localStorage.setItem('last_activity', new Date().toISOString());
            toast.success("Demo mode activated!");
            onAuthenticated();
        };

        if (envToken) {
            useToken(envToken);
            return;
        }

        try {
            const token = await getDevToken();
            if (token) {
                useToken(token);
                return;
            }
            throw new Error('No dev token available');
        } catch (err: any) {
            console.error('[WelcomeScreen] No demo token found', err);
            toast.error("Demo token not available. Start core on 8083 or set NEXT_PUBLIC_SAIMOR_CORE_JWT.");
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }

        console.log('[WelcomeScreen] Login attempt:', { email });
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8083/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            const token = data.access_token;

            if (token) {
                writeCookie('saimor_auth', token, 7);
                localStorage.setItem('saimor_mode', 'user');
                localStorage.setItem('saimor_tenant', 'owner-default');
                localStorage.setItem('user_name', email.split('@')[0]);
                localStorage.setItem('last_activity', new Date().toISOString());
                toast.success("Login successful!");
                onAuthenticated();
            } else {
                toast.error("No token received");
            }
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

        console.log('[WelcomeScreen] Register attempt:', { email });
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8083/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    name: email.split('@')[0]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
                throw new Error(errorData.detail || 'Registration failed');
            }

            const data = await response.json();
            const token = data.access_token;

            if (token) {
                writeCookie('saimor_auth', token, 7);
                localStorage.setItem('saimor_mode', 'user');
                localStorage.setItem('saimor_tenant', 'owner-default');
                localStorage.setItem('user_name', email.split('@')[0]);
                localStorage.setItem('last_activity', new Date().toISOString());
                toast.success("Account created!");
                onAuthenticated();
            } else {
                toast.error("No token received");
            }
        } catch (error: any) {
            console.error('[WelcomeScreen] Register error:', error);
            toast.error(error?.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#030806] flex items-center justify-center z-[100]"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#10b98110_0%,transparent_60%)]" />

            <AnimatePresence mode="wait">
                {mode === 'welcome' && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 flex flex-col items-center gap-12 max-w-2xl w-full px-6"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <MoraOrb state="idle" />
                            <div className="text-center">
                                <h1 className="text-5xl font-light tracking-[0.3em] text-emerald-50 mb-3">MÔRA</h1>
                                <p className="text-sm text-emerald-500/50 tracking-widest uppercase">
                                    Intelligent Knowledge System <span className="text-mora-gold">• Beta 1.4</span>
                                </p>
                            </div>
                        </div>

                        {showSessionCard && sessionInfo && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-md bg-gradient-to-br from-emerald-500/10 to-mora-gold/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-emerald-400" />
                                        <div>
                                            <div className="text-sm font-medium text-emerald-100">Welcome Back!</div>
                                            <div className="text-xs text-emerald-500/50">{sessionInfo.userName || 'User'}</div>
                                        </div>
                                    </div>
                                    <button onClick={handleLogout} className="text-xs text-red-400/60 hover:text-red-400">
                                        Clear
                                    </button>
                                </div>

                                {sessionInfo.lastWorkspace && (
                                    <div className="flex items-center gap-2 text-xs mb-4">
                                        <Zap className="w-3 h-3 text-mora-gold" />
                                        <span className="text-emerald-500/70">Last workspace:</span>
                                        <span className="text-emerald-100">{sessionInfo.lastWorkspace}</span>
                                    </div>
                                )}

                                <button
                                    onClick={handleContinueSession}
                                    className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-xl text-emerald-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Continue Session</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                        <div className="w-full max-w-md space-y-3">
                            <button
                                onClick={() => setMode('login')}
                                className="w-full p-6 bg-[#050d0a]/80 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 rounded-2xl transition-all flex items-center gap-4"
                            >
                                <div className="p-3 rounded-full bg-emerald-500/10">
                                    <LogIn className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-emerald-50">Sign In</div>
                                    <div className="text-xs text-emerald-500/50">Access your workspace</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-emerald-500/30" />
                            </button>

                            <button
                                onClick={() => setMode('register')}
                                className="w-full p-6 bg-[#050d0a]/80 backdrop-blur-md border border-white/10 hover:border-mora-gold/30 rounded-2xl transition-all flex items-center gap-4"
                            >
                                <div className="p-3 rounded-full bg-mora-gold/10">
                                    <UserPlus className="w-5 h-5 text-mora-gold" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-emerald-50">Create Account</div>
                                    <div className="text-xs text-emerald-500/50">Start your journey</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-mora-gold/30" />
                            </button>

                            <button
                                onClick={handleDemoMode}
                                className="w-full p-6 bg-[#050d0a]/80 backdrop-blur-md border border-white/10 hover:border-blue-500/30 rounded-2xl transition-all flex items-center gap-4"
                            >
                                <div className="p-3 rounded-full bg-blue-500/10">
                                    <Database className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-emerald-50">Demo Mode</div>
                                    <div className="text-xs text-emerald-500/50">Explore Simple Coffee Group</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-blue-500/30" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {mode === 'login' && (
                    <motion.div
                        key="login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 w-full max-w-md px-6"
                    >
                        <div className="bg-[#050d0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                            <h2 className="text-2xl font-light tracking-widest text-emerald-50 mb-6 text-center">Sign In</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-emerald-500/50 mb-2 uppercase">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-emerald-50 focus:outline-none focus:border-emerald-500/50"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-emerald-500/50 mb-2 uppercase">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-emerald-50 focus:outline-none focus:border-emerald-500/50"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    onClick={handleLogin}
                                    disabled={isLoading}
                                    className="w-full mt-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-100 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Signing in...' : 'Sign In'}
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
                                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-emerald-50 focus:outline-none focus:border-mora-gold/50"
                                        placeholder="••••••••"
                                    />
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
