'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';
import { corePost } from '@/lib/api/coreClient';

// Generate stars with seeded random for consistency
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

interface StarData {
    id: number;
    width: number;
    height: number;
    left: string;
    top: string;
    duration: number;
    delay: number;
}

/**
 * SAIMOR LOGIN PAGE
 * 
 * Premium Apple-style authentication with:
 * - Email/Password Login
 * - Registration option
 * - Beautiful glass aesthetic
 */
export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stars, setStars] = useState<StarData[]>([]);

    // Generate stars client-side only to avoid hydration mismatch
    useEffect(() => {
        const generatedStars: StarData[] = Array.from({ length: 80 }).map((_, i) => ({
            id: i,
            width: seededRandom(i * 1) * 2 + 1,
            height: seededRandom(i * 2) * 2 + 1,
            left: `${seededRandom(i * 3) * 100}%`,
            top: `${seededRandom(i * 4) * 100}%`,
            duration: 3 + seededRandom(i * 5) * 4,
            delay: seededRandom(i * 6) * 5
        }));
        setStars(generatedStars);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const endpoint = mode === 'login' ? '/v1/auth/login' : '/v1/auth/register';
            const response = await corePost(endpoint, {
                email,
                password,
                role: 'owner' // Default role for new registrations
            }, { skipAuth: true });

            if (response?.token) {
                // Store the token
                localStorage.setItem('saimor_dev_token', response.token);

                // Dispatch auth event
                window.dispatchEvent(new Event('saimor-auth-updated'));

                // Redirect to home
                router.push('/home');
            } else {
                throw new Error(response?.error || 'Authentication failed');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030806] flex items-center justify-center p-4">
            {/* Background Stars - Client-side only */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {stars.map((star) => (
                    <motion.div
                        key={star.id}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: star.width,
                            height: star.height,
                            left: star.left,
                            top: star.top,
                        }}
                        animate={{
                            opacity: [0.1, 0.6, 0.1],
                        }}
                        transition={{
                            duration: star.duration,
                            repeat: Infinity,
                            delay: star.delay
                        }}
                    />
                ))}
            </div>

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md"
            >
                {/* Glass Card */}
                <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                            <span className="text-2xl font-bold text-white">S</span>
                        </div>
                        <h1 className="text-2xl font-light text-white tracking-wide">SAIMÔR</h1>
                        <p className="text-white/40 text-sm mt-1">Intelligence Platform</p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-black/30 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'login'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            <LogIn size={16} className="inline mr-2" />
                            Sign In
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'register'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            <UserPlus size={16} className="inline mr-2" />
                            Register
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                        >
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                minLength={4}
                                className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium hover:from-emerald-500 hover:to-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                            ) : mode === 'login' ? (
                                'Sign In'
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Demo Account Info */}
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <p className="text-center text-white/30 text-xs">
                            Demo Account: <span className="text-white/50">demo@saimor.io</span> / <span className="text-white/50">demo123</span>
                        </p>
                    </div>
                </div>

                {/* Decorative Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 rounded-3xl blur-3xl -z-10 opacity-50" />
            </motion.div>
        </div>
    );
}
