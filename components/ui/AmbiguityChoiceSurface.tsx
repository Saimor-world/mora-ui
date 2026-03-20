"use client";

import React from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CommandReceipt } from '@/components/ui/CommandReceipt';
import { getSearchResultLocationLabel, getSearchResultTypeLabel, type OpenableSearchResult } from '@/lib/utils/searchOpen';

interface AmbiguityChoiceSurfaceProps {
    query?: string;
    results: OpenableSearchResult[];
    onPick: (result: OpenableSearchResult) => void | Promise<void>;
    onReview?: () => void;
    className?: string;
    selectedIndex?: number;
    title?: string;
    body?: string;
    tone?: 'amber' | 'cyan' | 'slate';
}

export const AmbiguityChoiceSurface: React.FC<AmbiguityChoiceSurfaceProps> = ({
    query,
    results,
    onPick,
    onReview,
    className = '',
    selectedIndex,
    title,
    body,
    tone = 'amber',
}) => {
    const shownResults = results.slice(0, 5);
    const isAmbiguous = shownResults.length > 1;

    if (shownResults.length === 0) return null;

    const firstLabel = query?.trim() ? ` fuer "${query.trim()}"` : '';

    return (
        <CommandReceipt
            tone={tone}
            label={title || (isAmbiguous ? 'Mehrere passende Treffer' : 'Treffer')}
            title={body || (isAmbiguous
                ? `Ich sehe mehrere plausible Ziele${firstLabel}. Waehle eins.`
                : `Ich habe einen klaren Treffer${firstLabel}.`)}
            icon={isAmbiguous ? Search : undefined}
            chips={[
                { label: `${shownResults.length} Auswahl${shownResults.length === 1 ? '' : 'en'}` },
                { label: 'Titel + Pfad + Typ' },
            ]}
            actions={onReview ? (
                <button
                    type="button"
                    onClick={onReview}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                    Suche pruefen
                </button>
            ) : undefined}
            className={className}
        >
            <div className="space-y-2">
                {shownResults.map((result, index) => {
                    const Icon: LucideIcon | undefined = result.icon;
                    const typeLabel = getSearchResultTypeLabel(result.type);
                    const locationLabel = getSearchResultLocationLabel(result);
                    const isSelected = typeof selectedIndex === 'number' && selectedIndex === index;

                    return (
                        <button
                            key={`${result.type}:${result.id}`}
                            type="button"
                            onClick={() => void onPick(result)}
                            className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                                isSelected
                                    ? 'border-amber-300/35 bg-amber-500/10'
                                    : 'border-white/8 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.05]'
                            }`}
                        >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                                isSelected
                                    ? 'border-amber-300/25 bg-amber-500/15 text-amber-100'
                                    : 'border-white/10 bg-white/[0.04] text-white/70'
                            }`}>
                                {Icon ? <Icon size={16} /> : <Search size={16} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white/88">{result.title}</div>
                                <div className="mt-0.5 truncate text-xs text-white/48">{locationLabel}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                                    {typeLabel}
                                </span>
                                <ArrowRight size={14} className="text-white/20 transition-colors group-hover:text-white/60" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </CommandReceipt>
    );
};

export default AmbiguityChoiceSurface;
