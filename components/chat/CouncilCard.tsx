'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { CouncilView, CouncilStance } from '@/lib/chat/council';

const STANCE_TONE: Record<CouncilStance, string> = {
    dafür: 'text-emerald-300/90',
    dagegen: 'text-rose-300/90',
    bedingt: 'text-amber-200/90',
    unklar: 'text-white/45',
};

/** MÔRA hat ihren Rat gefragt: Stimmen, Mehrheit, Widerspruch. Nur Beratung — keine Knöpfe. */
export function CouncilCard({ council }: { council: CouncilView }) {
    return (
        <section
            data-testid="council-card"
            aria-label="Beratung des Rats"
            className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12px] text-white/75"
        >
            <header className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/50">
                <Users size={12} aria-hidden />
                <span>MÔRA hat ihren Rat gefragt</span>
            </header>
            {council.summary && <p className="mb-2 text-white/80">{council.summary}</p>}
            <ul className="flex flex-col gap-2">
                {council.voices.map((v) => {
                    const dissent = council.dissentRoles.includes(v.role);
                    return (
                        <li
                            key={v.role}
                            data-testid={`council-voice-${v.role}`}
                            className={`rounded-lg px-2.5 py-2 ${dissent ? 'border border-amber-200/25 bg-amber-200/[0.04]' : 'bg-white/[0.02]'}`}
                        >
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="font-medium text-white/85">{v.label}</span>
                                <span className={STANCE_TONE[v.stance]}>
                                    {v.available ? v.stance : 'ohne Antwort'}
                                    {dissent ? ' · Widerspruch' : ''}
                                </span>
                            </div>
                            {v.advice && <p className="mt-1 leading-relaxed text-white/70">{v.advice}</p>}
                            {v.risks.length > 0 && (
                                <p className="mt-1 text-white/50">Risiken: {v.risks.join(' · ')}</p>
                            )}
                        </li>
                    );
                })}
            </ul>
            <p className="mt-2 text-[11px] text-white/40">Der Rat berät nur. Entscheidung und Freigabe bleiben bei dir.</p>
        </section>
    );
}
