'use client';

import React, { useEffect, useRef } from 'react';
import { Lock, ExternalLink, ShieldAlert, ShieldCheck, AlertTriangle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaneStore } from '@/lib/store/paneStore';
import { semanticColor } from '@/lib/design/tokens';

interface Finding {
    title: string;
    severity: string;
    desc: string;
}

interface AuditMeta {
    score: number;
    domain: string;
    grade?: string;
    level?: string;
    summary?: string;
    industry?: string;
    company_size?: string;
    findings?: Finding[];
    recommendations?: Array<{ title: string }>;
}

interface Props {
    name: string;
    nodeId?: string;
    metadata: {
        audit?: AuditMeta;
        playground?: { expires_at?: string };
        wall_status?: string;
    };
}

function moraInsight(score: number, findings: Finding[]): string {
    const first = findings[0]?.title;
    if (score < 40) return first ? `Dringend: ${first} ist dein kritischster Punkt.` : 'Kritische Sicherheitslücken — sofortiger Handlungsbedarf.';
    if (score <= 70) return `Mittleres Risiko — ${findings.length} Lücken, die heute schließbar sind.`;
    return first ? `Gute Basis — fokussiere dich auf ${first}.` : 'Solide Basis — kleine Optimierungen möglich.';
}

// ─── Score ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score, level }: { score: number; level?: string }) {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    const ringId = `ring-grad-${score}`;

    const color =
        level === 'Kritisch' ? '#f87171'
        : level === 'Sicher'  ? '#34d399'
        : '#fbbf24';

    const glow =
        level === 'Kritisch' ? 'rgba(248,113,113,0.45)'
        : level === 'Sicher'  ? 'rgba(52,211,153,0.45)'
        : 'rgba(251,191,36,0.45)';

    const ringRef = useRef<SVGCircleElement>(null);
    useEffect(() => {
        if (!ringRef.current) return;
        ringRef.current.style.strokeDashoffset = String(circ);
        const raf = requestAnimationFrame(() => {
            if (!ringRef.current) return;
            ringRef.current.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)';
            ringRef.current.style.strokeDashoffset = String(circ - dash);
        });
        return () => cancelAnimationFrame(raf);
    }, [score, circ, dash]);

    return (
        <div className="relative flex items-center justify-center" style={{ width: 132, height: 132 }}>
            {/* Outer glow */}
            <div
                className="absolute inset-0 rounded-full opacity-30 blur-2xl"
                style={{ background: glow }}
            />
            <svg width={132} height={132} style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                    <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="1" />
                    </linearGradient>
                </defs>
                {/* Track */}
                <circle cx={66} cy={66} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
                {/* Progress */}
                <circle
                    ref={ringRef}
                    cx={66} cy={66} r={r}
                    fill="none"
                    stroke={`url(#${ringId})`}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ}
                />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="text-4xl font-bold leading-none tabular-nums"
                    style={{ color, textShadow: `0 0 24px ${glow}` }}
                >
                    {score}
                </span>
                <span className="text-[11px] text-white/35 mt-0.5 tracking-wide">/100</span>
            </div>
        </div>
    );
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityConfig(sev: string) {
    switch (sev?.toLowerCase()) {
        case 'risk':
        case 'critical':
        case 'kritisch':
            return {
                bg: 'rgba(248,113,113,0.08)',
                border: 'rgba(248,113,113,0.35)',
                chip: 'rgba(248,113,113,0.15)',
                chipText: '#fca5a5',
                icon: <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5" />,
                label: 'Kritisch',
            };
        case 'warn':
        case 'warning':
        case 'mittel':
            return {
                bg: 'rgba(251,191,36,0.07)',
                border: 'rgba(251,191,36,0.35)',
                chip: 'rgba(251,191,36,0.15)',
                chipText: '#fde68a',
                icon: <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />,
                label: 'Warnung',
            };
        default:
            return {
                bg: 'rgba(52,211,153,0.07)',
                border: 'rgba(52,211,153,0.3)',
                chip: 'rgba(52,211,153,0.12)',
                chipText: '#6ee7b7',
                icon: <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />,
                label: 'OK',
            };
    }
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade, level }: { grade?: string; level?: string }) {
    const color =
        level === 'Kritisch' ? { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)', text: '#fca5a5' }
        : level === 'Sicher'  ? { bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.4)',  text: '#6ee7b7' }
        : { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', text: '#fde68a' };

    return (
        <div
            className="flex items-center justify-center rounded-xl text-2xl font-bold w-12 h-12"
            style={{ background: color.bg, border: `1.5px solid ${color.border}`, color: color.text }}
        >
            {grade ?? '—'}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditDossierView({ name: _name, nodeId, metadata }: Props) {
    const audit = metadata?.audit;
    const { openPane } = usePaneStore();

    if (!audit) return null;

    const {
        score, domain, grade, level, summary,
        industry, company_size, findings = [], recommendations = [],
    } = audit;

    const expiresAt = metadata?.playground?.expires_at
        ? new Date(metadata.playground.expires_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const levelLabel =
        level === 'Kritisch' ? 'Kritisches Risiko'
        : level === 'Sicher'  ? 'Solide Basis'
        : 'Mittleres Risiko';

    const levelBg =
        level === 'Kritisch' ? 'rgba(248,113,113,0.12)'
        : level === 'Sicher'  ? 'rgba(52,211,153,0.12)'
        : 'rgba(251,191,36,0.1)';

    const levelBorder =
        level === 'Kritisch' ? 'rgba(248,113,113,0.3)'
        : level === 'Sicher'  ? 'rgba(52,211,153,0.3)'
        : 'rgba(251,191,36,0.28)';

    const levelText =
        level === 'Kritisch' ? '#fca5a5'
        : level === 'Sicher'  ? '#6ee7b7'
        : '#fde68a';

    const accentColor =
        level === 'Kritisch' ? 'rgba(248,113,113,0.2)'
        : level === 'Sicher'  ? 'rgba(52,211,153,0.18)'
        : 'rgba(251,191,36,0.18)';

    const handleMora = () => {
        openPane({
            id: 'chat-audit',
            type: 'chat',
            title: 'Môra',
            size: { width: 420, height: 580 },
            data: {
                initialPrompt: `Analysiere diesen Security-Befund für ${domain}: Score ${score}/100, Level ${level ?? 'Mittel'}. ${summary ?? ''} Welche drei Maßnahmen haben den größten Impact?`,
            },
        });
    };

    const ai = semanticColor('ai');
    const wallStatus = metadata?.wall_status;
    const insight = moraInsight(score, findings);

    return (
        <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

            {/* ── Mora strip ───────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={handleMora}
                className="flex items-center gap-3 px-6 py-3 text-left transition-opacity hover:opacity-80"
                style={{ background: ai.bg, borderBottom: `1px solid ${ai.border}` }}
            >
                <div className="relative shrink-0 flex items-center justify-center w-5 h-5">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: ai.accent }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: ai.accent }} />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-medium" style={{ color: ai.chipText }}>✦ Môra hat deinen Befund analysiert</div>
                    <div className="text-[11px] text-white/45 truncate">{insight}</div>
                </div>
            </button>

            {/* ── Hero section ─────────────────────────────────────────────── */}
            <div
                className="relative overflow-hidden px-6 pt-6 pb-5"
                style={{
                    background: `radial-gradient(ellipse at 10% 50%, ${accentColor} 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.035) 0%, transparent 100%)`,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {/* Decorative blur */}
                <div
                    className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-20"
                    style={{ background: levelBg }}
                />

                <div className="relative flex items-center gap-6">
                    <ScoreRing score={score} level={level} />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <GradeBadge grade={grade} level={level} />
                            <span
                                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide"
                                style={{ background: levelBg, border: `1px solid ${levelBorder}`, color: levelText }}
                            >
                                {levelLabel}
                            </span>
                        </div>

                        <div className="text-[18px] font-semibold text-white/90 truncate">{domain}</div>

                        {(industry || company_size) && (
                            <div className="mt-1 text-[12px] text-white/40 flex items-center gap-1.5">
                                {industry && <span>{industry}</span>}
                                {industry && company_size && <span className="opacity-40">·</span>}
                                {company_size && <span>{company_size} Mitarbeiter</span>}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleMora}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all"
                            style={{
                                background: 'rgba(139,92,246,0.18)',
                                border: '1px solid rgba(139,92,246,0.35)',
                                color: '#c4b5fd',
                            }}
                        >
                            <span>✦</span>
                            Môra fragen
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-0 px-6 py-5 flex-1">
                {/* ── Summary ──────────────────────────────────────────────── */}
                {summary && (
                    <div className="mb-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-2">Zusammenfassung</div>
                        <div
                            className="rounded-xl px-4 py-3 text-[13px] text-white/70 leading-relaxed"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            {summary}
                        </div>
                    </div>
                )}

                {/* ── Findings ─────────────────────────────────────────────── */}
                {findings.length > 0 && (
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Befunde</div>
                            <span
                                className="inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-bold"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                            >
                                {findings.length}
                            </span>
                        </div>
                        <AnimatePresence>
                        <div className="flex flex-col gap-2">
                            {findings.map((f, i) => {
                                const cfg = severityConfig(f.severity);
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.12, duration: 0.3 }}
                                        className="rounded-xl px-4 py-3 border-l-2"
                                        style={{ background: cfg.bg, borderLeftColor: cfg.border }}
                                    >
                                        <div className="flex items-start gap-2">
                                            {cfg.icon}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[13px] font-medium text-white/90">{f.title}</span>
                                                    <span
                                                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                                                        style={{ background: cfg.chip, color: cfg.chipText }}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                {f.desc && (
                                                    <p className="mt-0.5 text-[12px] text-white/50 leading-relaxed">{f.desc}</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Recommendations ──────────────────────────────────────── */}
                {recommendations.length > 0 && (
                    <div className="mb-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/35 mb-3">Empfehlungen</div>
                        <div className="flex flex-col gap-2">
                            {recommendations.map((r, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}
                                >
                                    <span
                                        className="flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 w-6 h-6"
                                        style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd' }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="text-[13px] text-white/75">{r.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Wall CTA ─────────────────────────────────────────────── */}
                {wallStatus === 'confirmed' ? (
                    <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
                        style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                        <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                        <span className="text-[13px] text-emerald-300">✓ Du bist auf der Community Wall</span>
                    </div>
                ) : (
                    <div className="mb-4 rounded-xl px-4 py-4 flex items-start justify-between gap-4"
                        style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
                        <div className="flex items-start gap-3">
                            <Globe size={16} className="text-violet-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-[13px] font-medium text-white/85">Auf die Wall</div>
                                <div className="text-[11px] text-white/45 mt-0.5">Mach dein Ergebnis sichtbar — werde Teil des SAIMÔR-Netzwerks.</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => openPane({ id: 'wall-main', type: 'wall', title: 'Community Wall', size: { width: 900, height: 680 } })}
                            className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                            style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }}
                        >
                            Jetzt →
                        </button>
                    </div>
                )}

                {/* ── CTA ──────────────────────────────────────────────────── */}
                <div
                    className="rounded-xl px-4 py-4 flex items-center justify-between gap-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="flex items-center gap-2 text-[11px] text-white/35">
                        <Lock size={11} />
                        <span>Nur für dich sichtbar</span>
                        {expiresAt && <span className="opacity-60">· Gültig bis {expiresAt}</span>}
                    </div>
                    <a
                        href="https://saimor.world/de/einstieg/security-check"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shrink-0 transition-all hover:opacity-80"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
                    >
                        <ExternalLink size={11} />
                        Neuer Check
                    </a>
                </div>
            </div>
        </div>
    );
}

export default AuditDossierView;
