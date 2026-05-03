'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Fingerprint, RefreshCw, LogOut, Moon } from 'lucide-react';
import { MoraOrb } from '@/components/mora/MoraOrb';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { useSurfaceProfile } from '@/lib/hooks/useSurfaceProfile';
import { toast } from 'sonner';

interface LockScreenProps {
    onUnlock: () => void;
    onLogout: () => void;
    userName?: string;
    companyName?: string;
    companyLogo?: string;
}

/**
 * LockScreen - Secure Sleep/Lock Mode
 * 
 * Features:
 * - PIN/Password unlock
 * - Biometric placeholder (2FA ready)
 * - Company branding
 * - Session timeout
 * - Beautiful ambient animation
 */
export const LockScreen: React.FC<LockScreenProps> = ({
    onUnlock,
    onLogout,
    userName = 'User',
    companyName = 'Organisation',
    companyLogo
}) => {
    const { accentColor } = useAccentColor();
    const surfaceProfile = useSurfaceProfile();
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [idleSeconds, setIdleSeconds] = useState(0);

    // Update clock
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
            setIdleSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    const handleUnlock = async () => {
        if (pin.length < 4) {
            toast.error('PIN muss 4 Zeichen haben');
            return;
        }

        setIsUnlocking(true);

        // Simulate unlock check
        await new Promise(r => setTimeout(r, 800));

        // Enforce specific PIN
        if (pin === '1234') {
            toast.success('Willkommen zurück!');
            onUnlock();
        } else {
            setAttempts(a => a + 1);
            setPin('');
            toast.error('Falscher PIN');

            if (attempts >= 2) {
                toast.warning('Noch 1 Versuch vor Logout');
            }
            if (attempts >= 3) {
                toast.error('Zu viele Fehlversuche');
                onLogout();
            }
        }

        setIsUnlocking(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUnlock();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0">
                {/* Gradient overlay - uses accent color */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(ellipse at 50% 120%, ${accentColor}15 0%, transparent 50%)`
                    }}
                />

                {/* Slow moving stars */}
                <div className="absolute inset-0 opacity-30">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-white"
                            style={{
                                left: `${(i * 23.7) % 100}%`,
                                top: `${(i * 17.3) % 100}%`,
                            }}
                            animate={{
                                opacity: [0.2, 0.6, 0.2],
                            }}
                            transition={{
                                duration: 3 + (i % 5),
                                repeat: Infinity,
                                delay: i * 0.1
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
                {/* Time Display */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="text-8xl font-extralight text-white/90 tracking-wider mb-2">
                        {formatTime(currentTime)}
                    </div>
                    <div className="text-xl font-light text-white/40 tracking-widest uppercase">
                        {formatDate(currentTime)}
                    </div>
                </motion.div>

                {/* Orb with Logo */}
                <motion.div
                    className="mb-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                >
                    <MoraOrb
                        state="idle"
                        companyLogo={companyLogo}
                        onClick={() => {
                            // Focus PIN input
                            document.getElementById('lock-pin-input')?.focus();
                        }}
                    />
                </motion.div>

                {/* User Info */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="text-2xl font-light text-white/80 mb-1">
                        {userName}
                    </div>
                    <div className="text-sm text-white/40 tracking-wider">
                        {companyName}
                    </div>
                </motion.div>

                {/* PIN Input */}
                <motion.div
                    className="w-full max-w-xs"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            id="lock-pin-input"
                            type={showPin ? 'text' : 'password'}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="PIN eingeben..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-4 text-white text-center text-lg tracking-[0.5em] placeholder:tracking-normal placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all"
                            autoFocus
                            autoComplete="off"
                        />
                        <button
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Unlock Button */}
                    <motion.button
                        onClick={handleUnlock}
                        disabled={isUnlocking || pin.length < 4}
                        className="w-full mt-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isUnlocking ? (
                            <RefreshCw className="animate-spin" size={18} />
                        ) : (
                            <>
                                <Fingerprint size={18} />
                                Entsperren
                            </>
                        )}
                    </motion.button>
                </motion.div>

                {/* Actions */}
                <motion.div
                    className="flex items-center gap-6 mt-8 text-white/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                >
                    <button
                        onClick={() => {
                            useSessionStore.getState().resetStore();
                            onLogout();
                        }}
                        className="flex items-center gap-2 text-sm hover:text-white/60 transition-colors"
                    >
                        <LogOut size={14} />
                        Abmelden
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2 text-xs">
                        <Moon size={12} />
                        Ruhemodus seit {Math.floor(idleSeconds / 60)}:{(idleSeconds % 60).toString().padStart(2, '0')}
                    </div>
                </motion.div>

                {/* Attempts Warning */}
                {attempts > 0 && (
                    <motion.div
                        className="absolute bottom-8 text-red-400/60 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {3 - attempts} Versuche verbleibend
                    </motion.div>
                )}
            </div>

            {/* Bottom Branding */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/20 tracking-widest">
                {surfaceProfile.isPublicDemoSurface ? 'SECURE DEMO INSTANCE' : surfaceProfile.isHqSurface ? 'SAIMOR HQ' : 'SECURE ORGANIZATION'}
            </div>
        </div>
    );
};

export default LockScreen;
