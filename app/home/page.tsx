"use client";

import React, { Suspense, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { isOsPrototypeEnabled } from '@/lib/os-prototype/flags';
import { useIsSaimorInternal } from '@/lib/hooks/useIsSaimorInternal';

export const dynamic = 'force-dynamic';

/**
 * /home - Main OS Entry Point
 *
 * After authentication, users land here.
 * MoraShell is code-split so `/` and `/login` never pay for the full OS ambient stack.
 */
const MoraShell = nextDynamic(
    () => import('@/components/os/shell/MoraShell').then((m) => ({ default: m.MoraShell })),
    {
        ssr: false,
        loading: () => (
            <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#0d0921]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.22),transparent_45%,rgba(206,182,118,0.08))]" />
                <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border border-emerald-300/20" />
                    <div className="absolute inset-1 rounded-full border-2 border-emerald-400/20 border-t-emerald-300 animate-spin" />
                    <div className="absolute inset-4 rounded-full bg-emerald-300/70 shadow-[0_0_24px_rgba(110,231,183,0.5)]" />
                </div>
            </div>
        ),
    },
);

const JarvisLayer = nextDynamic(
    () => import('@/components/jarvis/JarvisLayer').then((m) => ({ default: m.JarvisLayer })),
    { ssr: false },
);

const MorgenOverlay = nextDynamic(
    () => import('@/components/universe/MorgenOverlay').then((m) => ({ default: m.MorgenOverlay })),
    { ssr: false },
);

function HomeEntry() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const internal = useIsSaimorInternal();
    const newOs = isOsPrototypeEnabled();
    // Classic mode is an explicit choice from an already established HQ session.
    // A default/bookmarked /home always enters /os through its existing auth gate.
    const classic = searchParams.get('classic') === '1' && internal;
    const query = searchParams.toString();
    useEffect(() => {
        if (!newOs || classic) return;
        const params = new URLSearchParams(query);
        params.delete('classic');
        const suffix = params.toString();
        router.replace(`/os${suffix ? `?${suffix}` : ''}${window.location.hash}`);
    }, [newOs, classic, query, router]);
    if (newOs && !classic) return <EntryLoading />;
    // Universe v2 „Der Morgen“ – nur mit NEXT_PUBLIC_UNIVERSE_V2=true (Standard: aus).
    // Leise Ebene ÜBER dem echten Universe: Hintergrund, Planeten und Dock bleiben unverändert.
    if (isUniverseV2Enabled()) {
        return (
            <>
                <MoraShell />
                <MorgenOverlay />
                <JarvisLayer />
            </>
        );
    }
    return <MoraShell />;
}

function EntryLoading() {
    return <div className="grid min-h-screen place-items-center bg-[#0d0921] text-emerald-50" role="status">Saimôr OS wird geöffnet …</div>;
}

export default function HomePage() {
    return <Suspense fallback={<EntryLoading />}><HomeEntry /></Suspense>;
}
