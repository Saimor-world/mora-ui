'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Wifi, Battery, Activity, Building2, Users, FolderOpen, ChevronUp } from 'lucide-react';

interface LockScreenProps {
    onUnlock: () => void;
    userName?: string;
    userAvatar?: string;
    systemStatus?: {
        backend: 'online' | 'offline' | 'connecting';
        departments: number;
        spaces: number;
        lastSync: string;
    };
}

export const LockScreen: React.FC<LockScreenProps> = ({
    onUnlock,
    userName = 'User',
    userAvatar,
    systemStatus = {
        backend: 'online',
        departments: 0,
        spaces: 0,
        lastSync: 'Just now'
    }
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [showPIN, setShowPIN] = useState(false);

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
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

    const handleUnlock = () => {
        setIsUnlocking(true);
        setTimeout(() => {
            onUnlock();
        }, 600);
    };

    return (
        <AnimatePresence>
            {!isUnlocking && (
                <motion.div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-between py-12 overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, #0a0f0d 0%, #050807 50%, #000000 100%)'
                    }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    {/* Subtle Background Animation */}
                    <div className="absolute inset-0 pointer-events-none">
                        <motion.div
                            className="absolute top-1/4 left-1/2 w-[800px] h-[800px] rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
                                transform: 'translate(-50%, -50%)',
                                filter: 'blur(100px)'
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{ duration: 8, repeat: Infinity }}
                        />
                    </div>

                    {/* Top Status Bar */}
                    <div className="flex items-center justify-between w-full px-8 text-white/40 text-xs">
                        <div className="flex items-center gap-4">
                            <span className="font-mono">SAIMÔR</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Wifi size={14} className={systemStatus.backend === 'online' ? 'text-emerald-400' : 'text-red-400'} />
                            <Battery size={14} />
                            <span className="font-mono">{formatTime(currentTime).split(':')[0]}:{formatTime(currentTime).split(':')[1]}</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col items-center gap-8">
                        {/* Time Display - Apple Style */}
                        <motion.div
                            className="text-center"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="text-8xl font-extralight text-white tracking-tight">
                                {formatTime(currentTime)}
                            </div>
                            <div className="text-xl font-light text-white/60 mt-2 tracking-wide">
                                {formatDate(currentTime)}
                            </div>
                        </motion.div>

                        {/* System Status Widget - Glassmorphic */}
                        <motion.div
                            className="w-80 rounded-3xl p-6 backdrop-blur-xl"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                            }}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-2 h-2 rounded-full ${systemStatus.backend === 'online' ? 'bg-emerald-400' :
                                        systemStatus.backend === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                                            'bg-red-400'
                                    }`} />
                                <span className="text-white/70 text-sm font-medium tracking-wide">
                                    SAIMÔR System Status
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="flex justify-center mb-2">
                                        <Activity size={18} className="text-emerald-400/60" />
                                    </div>
                                    <div className="text-lg font-light text-white/90">
                                        {systemStatus.backend === 'online' ? 'Online' : 'Offline'}
                                    </div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Backend</div>
                                </div>
                                <div>
                                    <div className="flex justify-center mb-2">
                                        <Building2 size={18} className="text-blue-400/60" />
                                    </div>
                                    <div className="text-lg font-light text-white/90">{systemStatus.departments}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Planets</div>
                                </div>
                                <div>
                                    <div className="flex justify-center mb-2">
                                        <FolderOpen size={18} className="text-purple-400/60" />
                                    </div>
                                    <div className="text-lg font-light text-white/90">{systemStatus.spaces}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Spaces</div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 text-center">
                                <span className="text-[10px] text-white/30 tracking-wide">
                                    Last sync: {systemStatus.lastSync}
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Unlock Area */}
                    <motion.div
                        className="flex flex-col items-center gap-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        {/* User Avatar */}
                        <motion.button
                            className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer"
                            style={{
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))',
                                border: '2px solid rgba(16,185,129,0.3)',
                                boxShadow: '0 0 30px rgba(16,185,129,0.2)'
                            }}
                            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleUnlock}
                        >
                            {userAvatar ? (
                                <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <Users size={32} className="text-emerald-400/80" />
                            )}
                        </motion.button>

                        <div className="text-white/80 font-light text-lg tracking-wide">
                            {userName}
                        </div>

                        {/* Swipe Hint */}
                        <motion.div
                            className="flex flex-col items-center gap-2 mt-4"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <ChevronUp size={20} className="text-white/30" />
                            <span className="text-xs text-white/30 tracking-widest uppercase">
                                Click to unlock
                            </span>
                        </motion.div>

                        {/* Lock Icon */}
                        <Lock size={16} className="text-white/20 mt-2" />
                    </motion.div>

                    {/* Bottom Safe Area */}
                    <div className="h-4" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LockScreen;
