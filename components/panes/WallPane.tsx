'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Loader2, ExternalLink, MessageSquare } from 'lucide-react';
import { coreGet } from '@/lib/api/http';
import { usePaneStore } from '@/lib/store/paneStore';

interface WallEntry {
    id: string;
    domain: string;
    score: number;
    grade: string;
    level: string;
    industry?: string;
    company_size?: string;
    message?: string;
    confirmed_at: string;
}

type Filter = 'Alle' | 'Kritisch' | 'Mittel' | 'Sicher';

function levelTheme(level: string) {
    if (level === 'Kritisch') return {
        border: 'border-red-500/25',
        bg: 'bg-red-500/[0.04]',
        badge: 'text-red-400 bg-red-400/10 border-red-400/20',
        dot: 'bg-red-400',
    };
    if (level === 'Mittel') return {
        border: 'border-amber-500/25',
        bg: 'bg-amber-500/[0.04]',
        badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        dot: 'bg-amber-400',
    };
    return {
        border: 'border-emerald-500/25',
        bg: 'bg-emerald-500/[0.04]',
        badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        dot: 'bg-emerald-400',
    };
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    return `vor ${days} Tagen`;
}

interface WallEntryCardProps {
    entry: WallEntry;
    onMora: (entry: WallEntry) => void;
    onSelect: (entry: WallEntry) => void;
}

function WallEntryCard({ entry, onMora, onSelect }: WallEntryCardProps) {
    const theme = levelTheme(entry.level);
    return (
        <div
            className={`rounded-2xl border ${theme.border} ${theme.bg} p-5 flex flex-col gap-3 cursor-pointer hover:brightness-110 transition-all`}
            onClick={() => onSelect(entry)}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${theme.dot} shrink-0`} />
                    <span className="text-sm font-medium text-white/90 truncate">{entry.domain}</span>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${theme.badge}`}>
                    {entry.level}
                </span>
            </div>

            <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-light tabular-nums text-white/85">{entry.score}</span>
                <span className="text-xs text-white/35">/ 100 · {entry.grade}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {entry.industry && (
                    <span className="text-[10px] uppercase tracking-[0.14em] rounded-full border border-white/10 px-2 py-0.5 text-white/40">
                        {entry.industry}
                    </span>
                )}
                {entry.company_size && (
                    <span className="text-[10px] uppercase tracking-[0.14em] rounded-full border border-white/10 px-2 py-0.5 text-white/40">
                        {entry.company_size}
                    </span>
                )}
            </div>

            {entry.message && (
                <p className="text-xs text-white/50 italic line-clamp-2">"{entry.message}"</p>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <span className="text-[10px] text-white/25">{relativeTime(entry.confirmed_at)}</span>
                <button
                    type="button"
                    aria-label="Mora fragen"
                    onClick={(e) => { e.stopPropagation(); onMora(entry); }}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-300/80 hover:bg-violet-500/20 transition-colors"
                >
                    <MessageSquare size={10} />
                    Mora
                </button>
            </div>
        </div>
    );
}

export function WallPane() {
    const [entries, setEntries] = useState<WallEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('Alle');
    const [selected, setSelected] = useState<WallEntry | null>(null);
    const openPane = usePaneStore((s) => s.openPane);

    useEffect(() => {
        let cancelled = false;
        coreGet('/v3/playground/wall-entries', { skipAuth: true })
            .then((data: any) => {
                if (!cancelled) setEntries(data?.entries ?? []);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const filtered = filter === 'Alle' ? entries : entries.filter(e => e.level === filter);
    const filters: Filter[] = ['Alle', 'Kritisch', 'Mittel', 'Sicher'];

    function handleMora(entry: WallEntry) {
        const prompt = `Analysiere diesen Security-Befund: Domain ${entry.domain}, Score ${entry.score}/100, Level ${entry.level}${entry.grade ? `, Grade ${entry.grade}` : ''}. Was sind die wichtigsten Maßnahmen?`;
        openPane({
            id: `chat-wall-${entry.id}`,
            type: 'chat',
            title: `Mora · ${entry.domain}`,
            size: { width: 520, height: 560 },
            data: { initialPrompt: prompt },
        });
    }

    return (
        <div className="flex flex-col h-full bg-[#07090f] text-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3">
                    <Shield size={16} className="text-cyan-400/70" strokeWidth={1.5} />
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">SAIMÔR OS</p>
                        <h2 className="text-sm font-medium text-white/90">Community Wall · Security Signals</h2>
                    </div>
                </div>
                <span className="text-[10px] tabular-nums text-white/25">{filtered.length} Einträge</span>
            </div>

            <div className="flex gap-2 px-6 py-3 border-b border-white/[0.04] shrink-0">
                {filters.map(f => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                            filter === f
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'text-white/40 border border-white/8 hover:text-white/60'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 size={20} className="animate-spin text-white/30" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-white/25 text-sm py-20">
                            Noch keine Einträge in dieser Kategorie.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(entry => (
                                <WallEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    onMora={handleMora}
                                    onSelect={setSelected}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {selected && (
                    <div
                        data-testid="wall-detail-drawer"
                        className="w-80 shrink-0 border-l border-white/[0.06] bg-black/30 flex flex-col overflow-y-auto"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                            <span className="text-sm font-medium text-white/80">{selected.domain}</span>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="text-white/30 hover:text-white/60 text-xs"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-light text-white/85">{selected.score}</span>
                                <span className="text-sm text-white/35">/ 100 · {selected.grade} · {selected.level}</span>
                            </div>
                            {selected.industry && (
                                <p className="text-xs text-white/40">{selected.industry}{selected.company_size ? ` · ${selected.company_size}` : ''}</p>
                            )}
                            {selected.message && (
                                <blockquote className="border-l-2 border-white/15 pl-3 text-sm text-white/55 italic">
                                    "{selected.message}"
                                </blockquote>
                            )}
                            <button
                                type="button"
                                onClick={() => handleMora(selected)}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-300/80 hover:bg-violet-500/20 transition-colors"
                            >
                                <MessageSquare size={14} />
                                Mora zu diesem Eintrag befragen
                            </button>
                            <a
                                href="https://saimor.world/de/einstieg/security-check"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                            >
                                <ExternalLink size={12} />
                                Eigenen Check starten
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default WallPane;
