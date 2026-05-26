"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { corePost } from '@/lib/api/coreClient';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') ?? '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="text-center space-y-4">
                <div className="text-emerald-400/60 text-sm tracking-wide">
                    Ungültiger oder fehlender Reset-Token.
                </div>
                <button
                    onClick={() => router.push('/')}
                    className="text-xs text-emerald-500/50 hover:text-emerald-400 transition-colors tracking-wider"
                >
                    {'← Zum Login'}
                </button>
            </div>
        );
    }

    const handleReset = async () => {
        if (newPassword.length < 8) {
            toast.error('Passwort muss mindestens 8 Zeichen lang sein.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwörter stimmen nicht überein.');
            return;
        }
        setIsLoading(true);
        try {
            await corePost('/v3/auth/reset-password', { token, new_password: newPassword }, { skipAuth: true });
            setSuccess(true);
            toast.success('Passwort erfolgreich zurückgesetzt.');
            setTimeout(() => router.push('/'), 2000);
        } catch (err: any) {
            toast.error(err?.message || 'Reset fehlgeschlagen. Der Link ist möglicherweise abgelaufen.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center space-y-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <div>
                    <div className="text-emerald-50 font-light tracking-widest text-sm uppercase mb-2">Passwort gesetzt</div>
                    <div className="text-xs text-emerald-500/50 tracking-wide">Weiterleitung zum Login...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                    Neues Passwort
                </label>
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                    placeholder="Mindestens 8 Zeichen"
                />
            </div>
            <div>
                <label className="block text-[10px] text-emerald-500/60 mb-2.5 uppercase tracking-widest font-medium">
                    Passwort bestätigen
                </label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleReset()}
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3.5 text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 shadow-inner"
                    placeholder="Passwort wiederholen"
                />
            </div>
            <motion.button
                onClick={() => void handleReset()}
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 hover:from-emerald-500/30 hover:to-emerald-500/20 border border-emerald-500/40 hover:border-emerald-500/60 rounded-xl text-emerald-100 font-medium tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Speichere...' : 'Neues Passwort setzen'}
            </motion.button>
            <button
                onClick={() => router.push('/')}
                className="w-full py-3 text-xs text-emerald-500/50 hover:text-emerald-400 transition-colors tracking-wider"
            >
                {'← Zum Login'}
            </button>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="fixed inset-0 bg-[#0d0921] flex items-center justify-center overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md px-6"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-emerald-500/5 rounded-2xl blur-2xl opacity-60" />
                    <div className="relative bg-[#050d0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-[0_8px_32px_0_rgba(16,185,129,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
                        <div className="relative z-10">
                            <h2 className="text-2xl font-extralight tracking-[0.2em] text-emerald-50 mb-8 text-center uppercase">
                                NEUES PASSWORT
                            </h2>
                            <Suspense fallback={<div className="text-xs text-emerald-500/50 text-center tracking-wider">Lade...</div>}>
                                <ResetPasswordForm />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
