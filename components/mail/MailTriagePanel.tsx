'use client';

import React, { useState } from 'react';
import { ChevronDown, ExternalLink, Sparkles, Tag, Trash2 } from 'lucide-react';
import type { MailTriageAnalysis, MailTriageSuggestion } from '@/lib/mail/mailTriage';

interface MailTriagePanelProps {
    analysis: MailTriageAnalysis;
    labelingSuggestionId: string | null;
    onSelect: (messageIds: string[]) => void;
    onApplyLabel: (suggestion: MailTriageSuggestion) => void;
    onOpenUnsubscribe: (url: string) => void;
}

export function MailTriagePanel({
    analysis,
    labelingSuggestionId,
    onSelect,
    onApplyLabel,
    onOpenUnsubscribe,
}: MailTriagePanelProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-white/6 px-4 pb-3">
            <div className="overflow-hidden rounded-2xl border border-emerald-300/10 bg-emerald-500/[0.045]">
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.035]"
                    aria-expanded={open}
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-300/12 bg-emerald-400/[0.08]">
                        <Sparkles size={15} className="text-emerald-200/80" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.19em] text-emerald-100/48">Môra · Postfach ordnen</div>
                        <div className="mt-0.5 truncate text-xs text-white/72">
                            {analysis.glance ?? 'Keine offensichtlichen Aufräum-Cluster'}
                        </div>
                    </div>
                    <ChevronDown
                        size={15}
                        className={`shrink-0 text-white/35 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </button>

                {open && (
                    <div className="border-t border-white/6 px-3.5 pb-3 pt-2.5">
                        <p className="mb-2.5 text-[11px] leading-relaxed text-white/38">
                            Vorschläge entstehen lokal aus Absender, Betreff und sichtbarem Inhalt. Nichts wird automatisch gelöscht oder abbestellt.
                        </p>

                        {analysis.suggestions.length === 0 ? (
                            <div className="rounded-xl border border-white/7 bg-black/15 px-3 py-2.5 text-xs text-white/48">
                                Im Moment gibt es nichts Offensichtliches zu sortieren.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {analysis.suggestions.map((suggestion) => (
                                    <div
                                        key={suggestion.id}
                                        className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 text-white/42">
                                                {suggestion.kind === 'cleanup' ? <Trash2 size={13} /> : suggestion.kind === 'unsubscribe' ? <ExternalLink size={13} /> : <Tag size={13} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-medium text-white/82">{suggestion.title}</div>
                                                <div className="mt-0.5 text-[11px] leading-relaxed text-white/38">{suggestion.description}</div>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
                                            {suggestion.kind !== 'unsubscribe' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(suggestion.messageIds)}
                                                    className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-[10px] font-semibold text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white/85"
                                                >
                                                    Prüfen
                                                </button>
                                            )}

                                            {suggestion.gmailLabel && (
                                                <button
                                                    type="button"
                                                    onClick={() => onApplyLabel(suggestion)}
                                                    disabled={labelingSuggestionId === suggestion.id}
                                                    className="rounded-lg border border-emerald-300/12 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100/72 transition-colors hover:bg-emerald-400/[0.12] disabled:opacity-45"
                                                >
                                                    {labelingSuggestionId === suggestion.id ? 'Markiere…' : `Als ${suggestion.kind === 'newsletter' ? 'Newsletter' : 'Werbung'} markieren`}
                                                </button>
                                            )}

                                            {suggestion.unsubscribeUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenUnsubscribe(suggestion.unsubscribeUrl!)}
                                                    className="rounded-lg border border-cyan-300/12 bg-cyan-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-cyan-100/72 transition-colors hover:bg-cyan-400/[0.12]"
                                                >
                                                    Abmelde-Seite öffnen
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
