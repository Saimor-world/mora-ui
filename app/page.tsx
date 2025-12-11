"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { useMoraStore } from '@/lib/store/moraState';

export default function RootPage() {
    const router = useRouter();
    const { user } = useMoraStore();
    const [showLockScreen, setShowLockScreen] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [savedUserName, setSavedUserName] = useState('User');

    // Check for existing session on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasSession = localStorage.getItem('mora_session');
            const lastUser = localStorage.getItem('last_user_name');

            if (hasSession && lastUser) {
                setShowLockScreen(true);
                setSavedUserName(lastUser);
            }
        }
        setIsCheckingSession(false);
    }, []);

    const handleAuthenticated = () => {
        router.push('/home');
    };

    const handleUnlock = () => {
        setShowLockScreen(false);
        // If user exists in store, go directly to home
        if (user) {
            router.push('/home');
        }
        // Otherwise show welcome screen for re-authentication
    };

    // Loading state
    if (isCheckingSession) {
        return (
            <div className="relative w-full h-screen bg-[#030806] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-[#030806] overflow-hidden font-sans">
            {showLockScreen ? (
                <LockScreen
                    onUnlock={handleUnlock}
                    userName={savedUserName}
                    systemStatus={{
                        backend: 'online',
                        departments: 4,
                        spaces: 8,
                        lastSync: 'Just now'
                    }}
                />
            ) : (
                <WelcomeScreen onAuthenticated={handleAuthenticated} />
            )}
        </div>
    );
}
