'use client';

import React from 'react';
import { User, Building2 } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { useContextStore } from '@/lib/store/contextStore';
import { PersonalNotesArea } from './PersonalNotesArea';

/**
 * PersonalHome -- personal context home surface (Phase 1 MVC).
 *
 * Spec (Section 2, Surface A, "Minimum viable personal context"):
 * - User identity visible
 * - Personal notes area (even if empty)
 * - Surface-level personal context badge (per-response Mora label is MoraContextLabel, Chunk 3)
 *
 * Visual design is an open decision (spec Section 10, item 1).
 * This is the functional MVC, not the final design.
 */
export const PersonalHome: React.FC = () => {
    const user = useMoraStore((s) => s.user);
    const setOsContext = useContextStore((s) => s.setOsContext);

    return (
        <div className="flex flex-col h-full bg-[#060810] text-white p-8 gap-8 overflow-y-auto">
            {/* Identity anchor */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <User size={24} className="text-white/60" />
                </div>
                <div>
                    <div className="text-lg font-medium text-white">{user?.name ?? 'Mein Bereich'}</div>
                    <div className="text-sm text-white/40">{user?.email}</div>
                </div>
            </div>

            {/* Mora personal scope label */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                persönlicher Bereich
            </div>

            {/* Notes */}
            <PersonalNotesArea />

            {/* Return to Universe */}
            <button
                onClick={() => setOsContext('company')}
                aria-label="Zum Unternehmens-Universum wechseln"
                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors w-fit"
            >
                <Building2 size={14} />
                Unternehmen
            </button>
        </div>
    );
};
