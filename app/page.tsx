"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { useMoraStore } from '@/lib/store/moraState';
import { Suspense } from 'react';
import { useSession } from "next-auth/react";
import { readCookie, deleteCookie } from '@/lib/auth/cookies';

function RootPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const [showLockScreen, setShowLockScreen] = useState(false);

    // Auth redirect logic using NextAuth Session
    useEffect(() => {
        if (status === 'loading') return;

        const sleepMode = searchParams.get('sleep') === 'true';
        const hasCoreSession = !!readCookie('mora_session');

        if (status === 'authenticated' || hasCoreSession) {
            if (sleepMode) {
                setShowLockScreen(true);
            } else {
                router.push('/home');
            }
        }
    }, [status, searchParams, router]);

    const handleAuthenticated = () => {
        router.push('/home');
    };

    const handleUnlock = () => {
        setShowLockScreen(false);
        router.push('/home');
    };

    // Calculate user name from session for Lock Screen
    const userName = session?.user?.email?.split('@')[0] || 'User';

    // Show loading while session check happens
    if (status === 'loading') {
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
                        // Clear sensitive data on Logout (via LockScreen)
                        localStorage.removeItem('mora_session');
                        localStorage.removeItem('saimor_dev_token');
                        localStorage.removeItem('last_user_name');
                        localStorage.removeItem('saimor_mode');
                        localStorage.removeItem('saimor_role');
                        deleteCookie('mora_session');
                        deleteCookie('mora_auth_token');
                        setShowLockScreen(false);
                        window.location.reload();
                    }}
                    userName={userName}
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
