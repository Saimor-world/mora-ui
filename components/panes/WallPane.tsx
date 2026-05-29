'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, ExternalLink, Zap } from 'lucide-react';
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

// ─── Level palette ────────────────────────────────────────────────────────────
function palette(level: string) {
    if (level === 'Kritisch') return {
        glow:       'rgba(239,68,68,0.28)',
        glowStrong: 'rgba(239,68,68,0.55)',
        accent:     '#f87171',
        accentFaint:'rgba(248,113,113,0.12)',
        border:     'rgba(248,113,113,0.22)',
        chip:       'rgba(248,113,113,0.15)',
        chipText:   '#fca5a5',
        label:      'Kritisch',
        gradient:   'from-red-950/80 via-red-900/30 to-transparent',
    };
    if (level === 'Sicher') return {
        glow:       'rgba(16,185,129,0.24)',
        glowStrong: 'rgba(16,185,129,0.5)',
        accent:     '#34d399',
        accentFaint:'rgba(52,211,153,0.1)',
        border:     'rgba(52,211,153,0.22)',
        chip:       'rgba(52,211,153,0.12)',
        chipText:   '#6ee7b7',
        label:      'Sicher',
        gradient:   'from-emerald-950/80 via-emerald-900/25 to-transparent',
    };
    return {
        glow:       'rgba(245,158,11,0.22)',
        glowStrong: 'rgba(245,158,11,0.48)',
        accent:     '#fbbf24',
        accentFaint:'rgba(251,191,36,0.09)',
        border:     'rgba(251,191,36,0.22)',
        chip:       'rgba(251,191,36,0.12)',
        chipText:   '#fde68a',
        label:      'Mittel',
        gradient:   'from-amber-950/80 via-amber-900/25 to-transparent',
    };
}

// ─── Animated score number ────────────────────────────────────────────────────
function AnimatedScore({ score, accent }: { score: number; accent: string }) {
    const [displayed, setDisplayed] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(score / 28);
        const id = setInterval(() => {
            start = Math.min(start + step, score);
            setDisplayed(start);
            if (start >= score) clearInterval(id);
        }, 30);
        return () => clearInterval(id);
    }, [score]);

    return (
        <span
            className="tabular-nums font-bold leading-none"
            style={{ color: accent, textShadow: `0 0 40px ${accent}66` }}
        >
            {displayed}
        </span>
    );
}

// ─── Featured card (large left hero) ─────────────────────────────────────────
function FeaturedCard({ entry, onMora }: { entry: WallEntry; onMora: (e: WallEntry) => void }) {
    const p = palette(entry.level);
    const rel = relativeTime(entry.confirmed_at);

    return (
        <div
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl h-full min-h-[320px]"
            style={{
                background: `radial-gradient(ellipse at 20% 30%, ${p.glow} 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, ${p.glowStrong.replace('0.55','0.15')} 0%, transparent 45%), rgba(10,10,18,0.92)`,
                border: `1px solid ${p.border}`,
                boxShadow: `0 0 60px ${p.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
        >
            {/* Top gradient strip */}
            <div className={`absolute top-0 left-0 right-0 h-40 bg-gradient-to-b ${p.gradient} opacity-80`} />

            <div className="relative p-6 flex flex-col gap-4 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] mb-1.5" style={{ color: `${p.accent}99` }}>
                            Security Signal
                        </div>
                        <div className="text-[22px] font-semibold text-white/95 tracking-tight">{entry.domain}</div>
                        {entry.industry && (
                            <div className="text-[12px] text-white/40 mt-0.5">{entry.industry}</div>
                        )}
                    </div>
                    <span
                        className="rounded-xl px-3 py-1.5 text-[11px] font-semibold tracking-wide shrink-0"
                        style={{ background: p.chip, color: p.chipText, border: `1px solid ${p.border}` }}
                    >
                        {p.label}
                    </span>
                </div>

                {/* Score hero */}
                <div className="flex items-end gap-3 my-2">
                    <div className="text-[72px] leading-none">
                        <AnimatedScore score={entry.score} accent={p.accent} />
                    </div>
                    <div className="pb-2 flex flex-col gap-1">
                        <span className="text-[22px] font-light text-white/25">/100</span>
                        <span
                            className="rounded-lg px-2.5 py-1 text-[18px] font-bold"
                            style={{ color: p.accent, background: p.accentFaint }}
                        >
                            {entry.grade}
                        </span>
                    </div>
                </div>

                {/* Message */}
                {entry.message && (
                    <div
                        className="rounded-xl px-4 py-3 text-[13px] text-white/65 italic leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.04)', borderLeft: `2px solid ${p.border}` }}
                    >
                        „{entry.message}"
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="relative px-6 pb-5 flex items-center justify-between">
                <span className="text-[11px] text-white/25">{rel}</span>
                <button
                    type="button"
                    onClick={() => onMora(entry)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-medium transition-all hover:opacity-90"
                    style={{
                        background: 'rgba(139,92,246,0.2)',
                        border: '1px solid rgba(139,92,246,0.4)',
                        color: '#c4b5fd',
                    }}
                >
                    <Zap size={11} />
                    Môra fragen
                </button>
            </div>
        </div>
    );
}

// ─── Compact card ─────────────────────────────────────────────────────────────
function CompactCard({ entry, onMora }: { entry: WallEntry; onMora: (e: WallEntry) => void }) {
    const p = palette(entry.level);
    const rel = relativeTime(entry.confirmed_at);

    return (
        <div
            className="relative flex flex-col overflow-hidden rounded-xl p-5 gap-3 transition-transform hover:scale-[1.015]"
            style={{
                background: `radial-gradient(ellipse at 85% 15%, ${p.glow} 0%, transparent 50%), rgba(12,12,22,0.88)`,
                border: `1px solid ${p.border}`,
                boxShadow: `0 0 30px ${p.glow.replace('0.28','0.12')}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                cursor: 'default',
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white/85 truncate">{entry.domain}</div>
                    {entry.industry && <div className="text-[11px] text-white/35 mt-0.5 truncate">{entry.industry}</div>}
                </div>
                <span
                    className="rounded-lg px-2 py-0.5 text-[10px] font-semibold shrink-0"
                    style={{ background: p.chip, color: p.chipText }}
                >
                    {p.label}
                </span>
            </div>

            <div className="flex items-end gap-2">
                <span className="text-[40px] font-bold leading-none tabular-nums" style={{ color: p.accent }}>
                    {entry.score}
                </span>
                <span className="text-[14px] font-light text-white/25 pb-1">/100</span>
                <span
                    className="rounded-md px-2 py-0.5 text-[15px] font-bold mb-0.5"
                    style={{ color: p.accent, background: p.accentFaint }}
                >
                    {entry.grade}
                </span>
            </div>

            {entry.message && (
                <p className="text-[11px] text-white/45 italic leading-relaxed line-clamp-2">
                    „{entry.message}"
                </p>
            )}

            <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-white/20">{rel}</span>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMora(entry); }}
                    className="text-[10px] text-violet-400/70 hover:text-violet-300 transition-colors"
                >
                    ✦ Môra
                </button>
            </div>
        </div>
    );
}

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `vor ${mins} Min.`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `vor ${hrs} Std.`;
    return `vor ${Math.floor(hrs / 24)} Tagen`;
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
            <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
                <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
            </div>
            <div>
                <div className="text-[15px] font-medium text-white/60 mb-1">Noch keine Signale</div>
                <div className="text-[12px] text-white/30">Sei das erste Unternehmen auf der Wall.</div>
            </div>
            <a
                href="https://saimor.world/de/einstieg/security-check"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-medium transition-opacity hover:opacity-80"
                style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)', color: '#c4b5fd' }}
            >
                <ExternalLink size={12} />
                Security Check starten
            </a>
        </div>
    );
}

// ─── Main WallPane ────────────────────────────────────────────────────────────
export function WallPane() {
    const [entries, setEntries] = useState<WallEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('Alle');
    const { openPane } = usePaneStore();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        coreGet<{ entries: WallEntry[] }>('/v3/playground/wall-entries', { skipAuth: true })
            .then(res => { if (!cancelled) setEntries(res?.entries ?? []); })
            .catch(() => { if (!cancelled) setEntries([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleMora = useCallback((entry: WallEntry) => {
        openPane({
            id: 'chat-wall',
            type: 'chat',
            title: 'Môra',
            size: { width: 420, height: 560 },
            data: {
                initialPrompt: `Analysiere diesen Security-Befund: Domain ${entry.domain}, Score ${entry.score}/100, Level ${entry.level}. Was sind die wahrscheinlichsten Ursachen und die wichtigsten Sofortmaßnahmen?`,
            },
        });
    }, [openPane]);

    const filtered = filter === 'Alle' ? entries : entries.filter(e => e.level === filter);
    const [featured, ...rest] = filtered;

    const filters: Filter[] = ['Alle', 'Kritisch', 'Mittel', 'Sicher'];

    return (
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{ background: 'rgba(7,7,16,0.97)' }}
        >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div
                className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between gap-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/30 mb-1">Community</div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-[18px] font-semibold text-white/90 tracking-tight">Signal Wall</h2>
                        {!loading && entries.length > 0 && (
                            <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                                style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                {entries.length} {entries.length === 1 ? 'Signal' : 'Signale'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5">
                    {filters.map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-all"
                            style={filter === f ? {
                                background: 'rgba(139,92,246,0.25)',
                                color: '#c4b5fd',
                                border: '1px solid rgba(139,92,246,0.4)',
                            } : {
                                background: 'rgba(255,255,255,0.04)',
                                color: 'rgba(255,255,255,0.4)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-full gap-3 text-white/30">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-[13px]">Signale werden geladen…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="h-full flex gap-4 p-5 overflow-hidden">
                        {/* Featured */}
                        {featured && (
                            <div className="w-[42%] shrink-0">
                                <FeaturedCard entry={featured} onMora={handleMora} />
                            </div>
                        )}

                        {/* Feed */}
                        {rest.length > 0 && (
                            <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                                <div className="grid grid-cols-2 gap-3 content-start">
                                    {rest.map(entry => (
                                        <CompactCard key={entry.id} entry={entry} onMora={handleMora} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer CTA ──────────────────────────────────────────────── */}
            <div
                className="shrink-0 px-6 py-3 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
                <span className="text-[11px] text-white/20">Echte Daten · Kein Tracking · DSGVO-konform</span>
                <a
                    href="https://saimor.world/de/einstieg/security-check"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition-colors"
                >
                    <ExternalLink size={11} />
                    Eigenen Check starten
                </a>
            </div>
        </div>
    );
}

export default WallPane;
