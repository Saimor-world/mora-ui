"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { useMoraStore } from '@/lib/store/moraState';
import { Suspense } from 'react';
import { useSession } from "next-auth/react";
import { readCookie } from '@/lib/auth/cookies';
import { authLogout } from '@/lib/api/coreClient';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';

function RootPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const [showLockScreen, setShowLockScreen] = useState(false);

    // Root entry must not auto-forward into the app.
    // A valid session should surface as an explicit "continue session" choice,
    // not as a silent redirect.
    useEffect(() => {
        if (status === 'loading') return;

        const sleepMode = searchParams.get('sleep') === 'true';
        const hasCoreSession = !!readCookie('mora_session');

        if (sleepMode && (status === 'authenticated' || hasCoreSession)) {
            setShowLockScreen(true);
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
                    onLogout={async () => {
                        await authLogout();
                        clearClientSessionArtifacts();
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
