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
        <div className="min-h-screen bg-[#030806] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
    );
}
