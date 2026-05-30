"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WelcomeScreen } from '@/components/auth/WelcomeScreen';
import { LockScreen } from '@/components/auth/LockScreen';
import { Suspense } from 'react';
import { readCookie, writeCookie } from '@/lib/auth/cookies';
import { authLogout } from '@/lib/api/coreClient';
import { ssoLogin } from '@/lib/api/authClient';
import { clearClientSessionArtifacts } from '@/lib/auth/sessionLifecycle';
import { useRuntimeSession } from '@/lib/auth/runtimeSession';

function EntryLoading({ delayed = false }: { delayed?: boolean }) {
    return (
        <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#0d0921]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.22),transparent_45%,rgba(206,182,118,0.08))]" />
            <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
            <div className="relative flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-emerald-300/15 bg-black/35 px-8 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border border-emerald-300/20" />
                    <div className="absolute inset-1 rounded-full border-2 border-emerald-400/20 border-t-emerald-300 animate-spin" />
                    <div className="absolute inset-4 rounded-full bg-emerald-300/70 shadow-[0_0_24px_rgba(110,231,183,0.5)]" />
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300/60">Local Truth</div>
                    <div className="mt-2 text-sm font-medium text-emerald-50">
                        Einstieg wird vorbereitet
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-emerald-100/55">
                        Sitzung, Instanzregeln und lokaler Core werden geprÃ¼ft. Danach erscheint der Einstieg mit klarer Auswahl.
                    </p>
                </div>
                {delayed && (
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs text-emerald-100/80 transition-colors hover:bg-emerald-300/15"
                    >
                        Neu laden
                    </button>
                )}
            </div>
        </div>
    );
}

function RootPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useRuntimeSession();

    const [showLockScreen, setShowLockScreen] = useState(false);
    const [allowWelcomeFallback, setAllowWelcomeFallback] = useState(false);

    const buildEntryTarget = () => {
        const entryParams = new URLSearchParams();
        for (const key of ['surface', 'entity', 'id', 'company', 'domain', 'score', 'level']) {
            const value = searchParams.get(key);
            if (value) entryParams.set(key, value);
        }
        const query = entryParams.toString();
        return query ? `/entry?${query}` : '/entry';
    };

    useEffect(() => {
        if (status !== 'loading') {
            setAllowWelcomeFallback(false);
            return;
        }

        const timeout = window.setTimeout(() => {
            setAllowWelcomeFallback(true);
        }, 1800);

        return () => window.clearTimeout(timeout);
    }, [status]);

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

    // SSO token handoff from WORLD website
    useEffect(() => {
        const ssoToken = searchParams.get('sso_token');
        if (!ssoToken) return;

        // Clear the token from URL immediately (security hygiene)
        router.replace('/');

        ssoLogin(ssoToken).then((result) => {
            if (result?.token) {
                // Store as CORE session cookie (same as normal login)
                writeCookie('mora_session', result.token);
                router.push(buildEntryTarget());
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (status === 'loading' && !allowWelcomeFallback) {
        return <EntryLoading />;
    }

    return (
        <div className="relative w-full h-screen bg-[#0d0921] overflow-hidden font-sans">
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
                    companyName=""
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
            <EntryLoading delayed />
        }>
            <RootPageContent />
        </Suspense>
    );
}

