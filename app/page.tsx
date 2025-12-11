"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { useMoraStore } from '@/lib/store/moraState';

export default function RootPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useMoraStore();
    const [showLockScreen, setShowLockScreen] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [savedUserName, setSavedUserName] = useState('User');

    // Check for existing session or sleep parameter on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasSession = localStorage.getItem('mora_session');
            const lastUser = localStorage.getItem('last_user_name');
            const sleepMode = searchParams.get('sleep') === 'true';

            // Show lockscreen if: sleep mode triggered OR existing session
            if (sleepMode || (hasSession && lastUser)) {
                setShowLockScreen(true);
                setSavedUserName(lastUser || 'User');
            }
        }
        setIsCheckingSession(false);
    }, [searchParams]);

    const handleAuthenticated = () => {
        router.push('/home');
    };

    const handleUnlock = () => {
        setShowLockScreen(false);
        // Always go to home after unlock
        router.push('/home');
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
