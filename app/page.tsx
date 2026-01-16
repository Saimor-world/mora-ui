"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { useMoraStore } from '@/lib/store/moraState';

import { Suspense } from 'react';

function RootPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useMoraStore();
    const [showLockScreen, setShowLockScreen] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [savedUserName, setSavedUserName] = useState('User');

    // Check for existing session or sleep parameter on mount (client-side only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasToken = localStorage.getItem('saimor_dev_token');
            const hasSession = localStorage.getItem('mora_session');
            const lastUser = localStorage.getItem('last_user_name');
            const sleepMode = searchParams.get('sleep') === 'true';

            // ACTIVE REDIRECT: If we have a token AND session, go home directly (MASTERBIBEL P1)
            if (hasToken && hasSession && !sleepMode) {
                router.push('/home');
                return;
            }

            // Only show lockscreen if we have a token AND session AND it is Sleep Mode
            if (hasToken && sleepMode) {
                setShowLockScreen(true);
                setSavedUserName(lastUser || 'User');
            } else if (!hasToken) {
                // No token - clear any stale session data
                localStorage.removeItem('mora_session');
                localStorage.removeItem('last_user_name');
                localStorage.removeItem('saimor_mode');
                localStorage.removeItem('saimor_role');
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
                    onLogout={() => {
                        localStorage.removeItem('mora_session');
                        localStorage.removeItem('saimor_dev_token');
                        localStorage.removeItem('last_user_name');
                        localStorage.removeItem('saimor_mode');
                        localStorage.removeItem('saimor_role');
                        setShowLockScreen(false);
                        // Force refresh to clear any in-memory stores
                        window.location.reload();
                    }}
                    userName={savedUserName}
                    companyName="SAIMÔR"
                />
            ) : (
                <WelcomeScreen onAuthenticated={handleAuthenticated} />
            )}
        </div>
    );
}

export default function RootPage() {
    return (
        <Suspense fallback={
            <div className="relative w-full h-screen bg-[#030806] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            </div>
        }>
            <RootPageContent />
        </Suspense>
    );
}
