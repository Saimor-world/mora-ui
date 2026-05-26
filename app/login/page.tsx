'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /login redirect
 * 
 * SAIMÔR uses a single unified auth entry point (WelcomeScreen at /)
 * This page simply redirects there.
 */
export default function LoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to main entry point
        router.replace('/');
    }, [router]);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0921]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.22),transparent_45%,rgba(206,182,118,0.08))]" />
            <div className="relative rounded-3xl border border-emerald-300/15 bg-black/35 px-8 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="mx-auto h-10 w-10 rounded-full border-2 border-emerald-400/20 border-t-emerald-300 animate-spin" />
                <div className="mt-4 text-[10px] uppercase tracking-[0.28em] text-emerald-300/60">Local Truth</div>
                <p className="mt-2 text-sm text-emerald-50">Einstieg wird geoeffnet</p>
            </div>
        </div>
    );
}
