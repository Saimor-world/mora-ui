"use client";

import React from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CommandReceipt, type CommandReceiptChip } from '@/components/ui/CommandReceipt';
import { getSearchResultLocationLabel, getSearchResultTypeLabel, type OpenableSearchResult } from '@/lib/utils/searchOpen';

interface IntakeDestinationSummary {
    company_name?: string;
    department_name?: string;
    space_name?: string;
    folder_name?: string;
    label?: string;
}

interface IntakeRouteExplanation {
    headline?: string;
    reason?: string;
    signal_labels?: string[];
    learning_summary?: string;
}

interface IntakeChoiceResult extends OpenableSearchResult {
    route_destination?: IntakeDestinationSummary;
    route_explanation?: IntakeRouteExplanation;
    route_reason?: string;
    route_signals?: string[];
    route_confidence_label?: string;
    route_confidence_score?: number;
}

interface AmbiguityChoiceSurfaceProps {
    query?: string;
    results: IntakeChoiceResult[];
    onPick: (result: IntakeChoiceResult) => void | Promise<void>;
    onReview?: () => void;
    className?: string;
    selectedIndex?: number;
    label?: string;
    title?: string;
    body?: string;
    description?: React.ReactNode;
    chips?: CommandReceiptChip[];
    footer?: React.ReactNode;
    tone?: 'amber' | 'cyan' | 'slate';
}

export const AmbiguityChoiceSurface: React.FC<AmbiguityChoiceSurfaceProps> = ({
    query,
    results,
    onPick,
    onReview,
    className = '',
    selectedIndex,
    label,
    title,
    body,
    description,
    chips,
    footer,
    tone = 'amber',
}) => {
    const shownResults = results.slice(0, 5);
    const isAmbiguous = shownResults.length > 1;

    if (shownResults.length === 0) return null;

    const firstLabel = query?.trim() ? ` für "${query.trim()}"` : '';
    const formatDestination = (destination?: IntakeDestinationSummary | null) => {
        const path = [destination?.department_name, destination?.space_name, destination?.folder_name]
            .filter(Boolean)
            .join(' > ');
        return destination?.label || path || 'Ziel offen';
    };

    const formatConfidence = (label?: string, score?: number) => {
        const normalized = label || 'mittel';
        const prefix = normalized === 'hoch' ? 'Hoch' : normalized === 'niedrig' ? 'Niedrig' : 'Mittel';
        return typeof score === 'number' ? `${prefix} (${Math.round(score * 100)}%)` : prefix;
    };

    return (
        <CommandReceipt
            tone={tone}
            label={label || (isAmbiguous ? 'Mehrere passende Treffer' : 'Treffer')}
            title={body || (isAmbiguous
                ? `Ich sehe mehrere plausible Ziele${firstLabel}. Wähle eins.`
                : `Ich habe einen klaren Treffer${firstLabel}.`)}
            body={description}
            icon={isAmbiguous ? Search : undefined}
            chips={[
                { label: `${shownResults.length} Auswahl${shownResults.length === 1 ? '' : 'en'}` },
                { label: 'Titel + Pfad + Typ' },
                ...(chips || []),
            ]}
            actions={onReview ? (
                <button
                    type="button"
                    onClick={onReview}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                    Suche prüfen
                </button>
            ) : undefined}
            footer={footer}
            className={className}
        >
            <div className="space-y-2">
                {shownResults.map((result, index) => {
                    const Icon: LucideIcon | undefined = result.icon;
                    const typeLabel = getSearchResultTypeLabel(result.type);
                    const locationLabel = getSearchResultLocationLabel(result);
                    const isSelected = typeof selectedIndex === 'number' && selectedIndex === index;
                    const destinationLabel = formatDestination(result.route_destination);
                    const explanation = result.route_explanation;
                    const whyHeadline = explanation?.headline || result.route_reason;
                    const whyReason = explanation?.reason || result.route_reason;
                    const signals = explanation?.signal_labels || result.route_signals || [];
                    const strengthLabel = formatConfidence(result.route_confidence_label, result.route_confidence_score);

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
                                <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-white/58">
                                    <div className="flex gap-2">
                                        <span className="shrink-0 uppercase tracking-[0.18em] text-white/36">Ziel</span>
                                        <span className="min-w-0 text-white/78">{destinationLabel}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="shrink-0 uppercase tracking-[0.18em] text-white/36">Warum</span>
                                        <span className="min-w-0 text-white/72">
                                            {whyHeadline || whyReason || 'Keine kurze Begründung verfügbar'}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="shrink-0 uppercase tracking-[0.18em] text-white/36">Stark</span>
                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/72">
                                                {strengthLabel}
                                            </span>
                                            {signals.length > 0 && (
                                                <span className="text-white/42">
                                                    {signals.slice(0, 2).map((signal) => signal.split('_').join(' ')).join(', ')}
                                                    {signals.length > 2 ? ` +${signals.length - 2} weitere` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {explanation?.learning_summary && (
                                        <div className="text-white/40">
                                            {explanation.learning_summary}
                                        </div>
                                    )}
                                </div>
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
