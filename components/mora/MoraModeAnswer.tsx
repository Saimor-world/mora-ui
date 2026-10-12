"use client";

/**
 * Zeigt, was ein MÔRA-Modus zusätzlich zum Text liefert:
 * Bau-Vorschläge (noch nicht ausgeführt), Quellen und fehlende Belege.
 * Der Freigabe-Knopf ist nur aktiv, wenn CORE einen verifizierten Ausführungsweg meldet.
 */
import React from 'react';
import { describeFlag, hasVerifiedExecutionPath, type MoraModeResult } from '@/lib/mora/moraModes';

interface Props {
    result: Pick<MoraModeResult, 'proposals' | 'sources' | 'citations' | 'flags'>;
    isStandardMode?: boolean;
    onApprove?: (proposalId: string) => void;
}

export const MoraModeAnswer: React.FC<Props> = ({ result, isStandardMode = false, onApprove }) => {
    const muted = isStandardMode ? 'text-gray-500' : 'text-white/45';
    const box = isStandardMode ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/20';
    const { proposals, sources, citations, flags } = result;
    if (!proposals.length && !sources.length && !flags.length) return null;

    return (
        <div className="mt-2 space-y-2 text-xs" data-testid="mora-mode-answer">
            {proposals.map((p) => {
                const executable = hasVerifiedExecutionPath(p);
                return (
                    <div key={p.id} className={`rounded-lg border px-3 py-2 ${box}`} data-testid="mora-proposal">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{p.label}</span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 ${isStandardMode ? 'bg-amber-50 text-amber-700' : 'bg-amber-400/10 text-amber-300'}`}>
                                Noch nicht ausgeführt
                            </span>
                        </div>
                        {(p.payload?.tool || p.risk) && (
                            <div className={`mt-1 ${muted}`}>
                                {p.payload?.tool ?? 'Aktion'}{p.risk ? ` · Risiko: ${p.risk}` : ''}
                            </div>
                        )}
                        <button
                            type="button"
                            disabled={!executable}
                            onClick={() => executable && onApprove?.(p.id)}
                            title={executable ? 'Freigeben' : 'Kein verifizierter Ausführungsweg – Freigabe nicht möglich'}
                            className={`mt-2 rounded-md px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isStandardMode ? 'bg-[#0078D4] text-white' : 'bg-emerald-500/20 text-emerald-200'}`}
                        >
                            Freigeben
                        </button>
                        {!executable && (
                            <span className={`ml-2 ${muted}`}>Kein verifizierter Ausführungsweg</span>
                        )}
                    </div>
                );
            })}

            {sources.length > 0 && (
                <div className={muted} data-testid="mora-sources">
                    <div className="mb-1 uppercase tracking-wider">Quellen</div>
                    <ol className="list-decimal space-y-0.5 pl-4">
                        {sources.map((s, i) => {
                            const cited = citations.includes(i + 1);
                            const label = s.title || s.url || `Quelle ${i + 1}`;
                            return (
                                <li key={i} className={cited ? '' : 'opacity-60'}>
                                    {s.url ? (
                                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{label}</a>
                                    ) : label}
                                    {s.kind ? ` · ${s.kind}` : ''}
                                    {!cited ? ' · nicht zitiert' : ''}
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {flags.map((f) => (
                <div key={f} className={isStandardMode ? 'text-amber-700' : 'text-amber-300/90'} data-testid="mora-flag">
                    {describeFlag(f)}
                </div>
            ))}
        </div>
    );
};
