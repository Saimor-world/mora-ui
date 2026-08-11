"use client";

import React from 'react';
import dynamic from 'next/dynamic';

export const dynamicMode = 'force-dynamic';

/**
 * /home - Main OS Entry Point
 *
 * After authentication, users land here.
 * MoraShell is code-split so `/` and `/login` never pay for the full OS ambient stack.
 */
const MoraShell = dynamic(
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

export default function HomePage() {
    return <MoraShell />;
}
