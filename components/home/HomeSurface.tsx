'use client';

import React from 'react';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * HomeSurface — Day-start working surface for SAIMOR 1.0
 *
 * Default landing when viewLevel='core' + coreMode='home'.
 * Shows: recent docs, team activity, quick access, my content summary.
 *
 * Commit A: Placeholder only — static layout, no API calls yet.
 * Commit B: Real data sections (fetchNodesByCompany, team/activity, fetchMyContent).
 *
 * @see docs/plans/2026-03-27-corelayer-home-implementation-order.md
 */
export const HomeSurface: React.FC = () => {
    const setCoreMode = useMoraStore((s) => s.setCoreMode);
    const isStandardMode = useMoraStore((s) => s.isStandardMode);
    const user = useMoraStore((s) => s.user);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-8 py-12 overflow-auto">
            {/* Header */}
            <div className="text-center">
                <h1 className={`text-2xl font-semibold tracking-tight ${isStandardMode ? 'text-gray-900' : 'text-white/90'}`}>
                    {user?.name ? `Guten Tag, ${user.name.split(' ')[0]}.` : 'Arbeitsplatz'}
                </h1>
                <p className={`mt-1 text-sm ${isStandardMode ? 'text-gray-500' : 'text-white/40'}`}>
                    Was möchtest du heute tun?
                </p>
            </div>

            {/* Quick Access — always available, no API */}
            <div className="flex flex-wrap gap-3 justify-center">
                {/* Commit B will add Recent Docs, Activity, My Content sections here */}
                <button
                    onClick={() => setCoreMode('explore')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                        isStandardMode
                            ? 'bg-gray-100 border border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                            : 'bg-white/[0.06] border border-white/10 text-white/70 hover:border-white/25 hover:bg-white/[0.1]'
                    }`}
                >
                    Erkunden →
                </button>
            </div>
        </div>
    );
};
