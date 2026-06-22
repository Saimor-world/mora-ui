'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, ExternalLink, Globe2, ShieldAlert, ShieldCheck, Sparkles, Timer, UploadCloud } from 'lucide-react';
import { submitDossierToWall } from '@/lib/api/wallClient';
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useDossierView } from '@/lib/queries/useDossierView';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';

type VisitorFinding = {
    title?: string;
    severity?: string;
    desc?: string;
    description?: string;
};

function riskTone(score?: number | null) {
    if (score === undefined || score === null) return { text: 'text-white/58', border: 'border-white/10', bg: 'bg-white/[0.04]', glow: '' };
    if (score < 50) return { text: 'text-red-100', border: 'border-red-300/24', bg: 'bg-red-400/[0.10]', glow: 'shadow-[0_0_80px_rgba(239,68,68,0.18)]' };
    if (score < 80) return { text: 'text-amber-100', border: 'border-amber-300/22', bg: 'bg-amber-400/[0.09]', glow: 'shadow-[0_0_80px_rgba(245,158,11,0.15)]' };
    return { text: 'text-emerald-100', border: 'border-emerald-300/20', bg: 'bg-emerald-400/[0.08]', glow: 'shadow-[0_0_80px_rgba(52,211,153,0.18)]' };
}

function severityColor(s?: string) {
    const v = (s ?? '').toLowerCase();
    if (v === 'critical' || v === 'high') return 'text-red-300/80 border-red-400/20 bg-red-400/[0.06]';
    if (v === 'medium' || v === 'mittel') return 'text-amber-300/80 border-amber-400/20 bg-amber-400/[0.06]';
    return 'text-white/42 border-white/10 bg-white/[0.03]';
}

function domainLogo(domain?: string | null, explicit?: string | null) {
    if (explicit) return explicit;
    const normalized = (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return normalized && normalized.includes('.') ? `https://logo.clearbit.com/${normalized}` : null;
}

function formatDate(value?: string | null) {
    if (!value) return '20 Tage Preview';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '20 Tage Preview';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function anim(delay: number) {
    return {
        initial: { opacity: 0, y: 22 },
        animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.55, ease: 'easeOut' as const },
    };
}

function AnimatedScore({ value }: { value: number | null }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const motionVal = useMotionValue(0);
    const springVal = useSpring(motionVal, { stiffness: 55, damping: 18 });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (inView && value !== null) motionVal.set(value);
    }, [inView, value, motionVal]);

    useEffect(() => {
        const unsub = springVal.on('change', (v) => setDisplay(Math.round(v)));
        return unsub;
    }, [springVal]);

    if (value === null) return <span ref={ref} className="text-5xl font-light tabular-nums">--</span>;
    return <span ref={ref} className="text-5xl font-light tabular-nums">{display}</span>;
}

function MoraOrb() {
    return (
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <motion.div
                className="absolute inset-0 rounded-full bg-violet-500/12"
                animate={{ scale: [1, 1.55, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute inset-0 rounded-full bg-emerald-400/10"
                animate={{ scale: [1, 1.9, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
            />
            <motion.div
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-violet-300/25 bg-gradient-to-br from-violet-600/40 to-emerald-600/30 backdrop-blur-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Sparkles size={18} className="text-violet-200/90" />
            </motion.div>
        </div>
    );
}

export function VisitorHomeSurface() {
    const context = useWebsiteEntryContext();
    const { nodeId: dossierNodeId, isCreating: isCreatingDossierNode } = useCreateDossierNode(context);
    const { data: view } = useDossierView(context?.id);
    const openPane = usePaneStore((s) => s.openPane);
    const { data: companies = [] } = useCompanies({ includeDemo: true });
    const setActiveCompany = useNavStore((s) => s.setActiveCompany);
    const navigateToExplore = useNavStore((s) => s.navigateToExplore);
    const [wallState, setWallState] = useState<'idle' | 'submitting' | 'pending' | 'error'>('idle');
    const guidedDemoCompany = companies.find((company) => company.is_demo && company.name === 'Simple Coffee Group');

    const audit = view?.audit;
    const companyName = view?.company?.name || context?.companyName || 'Deine Firma';
    const domain = audit?.domain || context?.domain || '';
    const score = audit?.score ?? context?.score ?? null;
    const level = audit?.level || context?.level || context?.grade || 'Security Check';
    const summary = audit?.summary || context?.summary || 'Dein Security Check wurde als isolierter OS-Raum vorbereitet.';
    const logoUrl = domainLogo(domain, audit?.logo_url);
    const expiresLabel = formatDate(audit?.expires_at);
    const tone = riskTone(score);

    const findings = useMemo<VisitorFinding[]>(() => {
        const fromAudit = audit?.findings ?? [];
        if (fromAudit.length > 0) return fromAudit.slice(0, 5);
        return (context?.tasks ?? []).slice(0, 4).map((task) => ({
            title: task.title,
            severity: task.priority,
            desc: 'Aus dem Security-Check als nächste Aufgabe vorbereitet.',
        }));
    }, [audit?.findings, context?.tasks]);

    const openDossier = () => {
        if (!context) return;
        if (dossierNodeId) {
            openPane({
                id: 'dossier-main',
                type: 'document',
                title: `${companyName} — Dossier`,
                size: { width: 760, height: 620 },
                data: { nodeId: dossierNodeId },
            });
        } else if (domain) {
            openPane({
                id: 'website-dossier-current',
                type: 'website-dossier',
                title: `${companyName} Dossier`,
                size: { width: 1040, height: 720 },
                data: { url: `https://${domain}` },
            });
        }
    };

    const submitWallSignal = async () => {
        if (!dossierNodeId || wallState === 'submitting') return;
        setWallState('submitting');
        try {
            await submitDossierToWall({
                node_id: dossierNodeId,
                visibility: 'domain-only',
                message: `${companyName} prüft Security-Befunde aus dem SAIMOR Preview-Raum.`,
            });
            setWallState('pending');
        } catch {
            setWallState('error');
        }
    };

    const openGuidedDemo = () => {
        if (!guidedDemoCompany) return;
        setActiveCompany(guidedDemoCompany.id);
        navigateToExplore();
    };

    const wallDisabled = !dossierNodeId || isCreatingDossierNode || wallState === 'submitting' || wallState === 'pending';
    const wallButtonLabel = wallState === 'submitting'
        ? 'Signal wird vorbereitet'
        : wallState === 'pending'
            ? 'Wartet auf Bestätigung'
            : 'Signal veröffentlichen';

    return (
        <main className="pointer-events-auto relative z-10 h-full overflow-y-auto px-5 pb-32 pt-20 text-white sm:px-8 lg:px-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

                {/* MÔRA greeting — context-aware, not a banner repeat */}
                <motion.div
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                    <MoraOrb />
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-violet-300/60">MÔRA</p>
                        <motion.p
                            className="text-sm text-white/68"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.45, duration: 0.7 }}
                        >
                            {findings.length > 0
                                ? `${findings.length} ${findings.length === 1 ? 'Befund' : 'Befunde'} analysiert — ${findings[0]?.title ?? 'Details unten'} ist am dringlichsten.`
                                : score !== null
                                    ? `Security Score ${score} — ${score < 50 ? 'kritische Maßnahmen erforderlich.' : score < 80 ? 'mittlere Risiken erkannt.' : 'solide Basis, Details unten.'}`
                                    : 'Dein Dossier ist angelegt. Ergebnisse werden geladen.'}
                        </motion.p>
                    </div>
                </motion.div>

                {/* Hero: company + score */}
                <motion.section
                    {...anim(0.1)}
                    className={`relative overflow-hidden rounded-[2rem] border ${tone.border} ${tone.bg} ${tone.glow} p-6 shadow-[0_24px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl`}
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/[0.06] blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-emerald-500/[0.07] blur-3xl" />

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                                {logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- public company logo URL
                                    <img src={logoUrl} alt="" className="h-full w-full object-contain p-2" />
                                ) : (
                                    <Globe2 size={25} className="text-emerald-100/64" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-100/50">Security Check Ergebnis</p>
                                <h1 className="mt-1.5 truncate text-3xl font-light tracking-[-0.03em] text-white/92 sm:text-5xl">{companyName}</h1>
                                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-white/44">
                                    {domain ? <span>{domain}</span> : null}
                                    {context?.email ? <><span>·</span><span>{context.email}</span></> : null}
                                </div>
                            </div>
                        </div>

                        <div className={`shrink-0 rounded-3xl border px-7 py-5 text-right ${tone.border} bg-black/20`}>
                            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">Security Score</p>
                            <div className={`mt-1 ${tone.text}`}>
                                <AnimatedScore value={score} />
                            </div>
                            <p className={`text-xs opacity-60 ${tone.text}`}>{level}</p>
                        </div>
                    </div>

                    <p className="relative mt-5 max-w-3xl text-sm leading-relaxed text-white/58">{summary}</p>
                </motion.section>

                {/* Findings — shown inline, no click required */}
                {findings.length > 0 && (
                    <motion.section {...anim(0.2)} className="rounded-[1.75rem] border border-white/[0.07] bg-black/28 p-5 backdrop-blur-xl">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-amber-100/72">
                                <ShieldAlert size={16} />
                                <span className="text-[10px] uppercase tracking-[0.26em]">Deine Befunde</span>
                                <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[9px] text-amber-100/70">
                                    {findings.length}
                                </span>
                            </div>
                            {(domain || dossierNodeId) && (
                                <button
                                    onClick={openDossier}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.07]"
                                >
                                    Vollständiges Dossier <ArrowRight size={12} />
                                </button>
                            )}
                        </div>
                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {findings.map((finding, index) => (
                                <motion.div
                                    key={`${finding.title}-${index}`}
                                    {...anim(0.25 + index * 0.07)}
                                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h2 className="text-sm font-medium leading-snug text-white/80">{finding.title || 'Security Befund'}</h2>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.13em] ${severityColor(finding.severity)}`}>
                                            {finding.severity || 'signal'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-white/42">{finding.desc || finding.description || 'Aus dem passiven Website-Check übernommen.'}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                )}

                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Demo workspace */}
                    <motion.section
                        {...anim(0.35)}
                        className="relative overflow-hidden rounded-[1.75rem] border border-violet-300/10 bg-gradient-to-br from-violet-950/40 to-black/30 p-5 backdrop-blur-xl"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
                        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
                        <div className="mb-4 flex items-center gap-2">
                            <motion.div
                                className="h-1.5 w-1.5 rounded-full bg-violet-400"
                                animate={{ opacity: [1, 0.25, 1] }}
                                transition={{ duration: 1.8, repeat: Infinity }}
                            />
                            <span className="text-[10px] uppercase tracking-[0.26em] text-violet-300/60">Demo-Workspace</span>
                        </div>
                        <p className="text-base font-light text-white/86">Simple Coffee Group</p>
                        <p className="mt-2 text-sm leading-relaxed text-white/52">
                            Erkunde ein voll eingerichtetes SAIMÔR OS mit echten Betriebsdaten — Security, Betrieb, Wachstum und Dossier. Deine 20-Tage Preview beginnt mit deiner Email.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {(['Security', 'Betrieb', 'Wachstum', 'Dossier'] as const).map((label) => (
                                <div key={label} className="rounded-xl border border-violet-300/[0.08] bg-violet-400/[0.04] px-3 py-2 text-xs text-violet-100/50">
                                    {label}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={openGuidedDemo}
                            disabled={!guidedDemoCompany}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/16 bg-violet-400/[0.08] px-4 py-3 text-sm text-violet-50 transition-colors hover:bg-violet-400/[0.14] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/28"
                        >
                            {guidedDemoCompany ? 'Geführte Simple Coffee Demo öffnen' : 'Demo wird vorbereitet'}
                            <ArrowRight size={14} />
                        </button>
                    </motion.section>

                    <div className="flex flex-col gap-5">
                        {/* Timer */}
                        <motion.section
                            {...anim(0.42)}
                            className="rounded-[1.75rem] border border-emerald-300/12 bg-emerald-400/[0.055] p-5 backdrop-blur-xl"
                        >
                            <div className="flex items-center gap-2 text-emerald-100/76">
                                <Timer size={15} />
                                <span className="text-[10px] uppercase tracking-[0.24em]">Dein Preview-Raum</span>
                            </div>
                            <p className="mt-3 text-sm text-white/60">Scan gespeichert. Dossier angelegt. Preview läuft bis:</p>
                            <p className="mt-1.5 text-lg font-light text-emerald-50">{expiresLabel}</p>
                        </motion.section>

                        {/* Wall */}
                        <motion.section
                            {...anim(0.5)}
                            className="rounded-[1.75rem] border border-white/[0.07] bg-black/28 p-5 backdrop-blur-xl"
                        >
                            <div className="flex items-center gap-2 text-white/64">
                                <UploadCloud size={15} />
                                <span className="text-[10px] uppercase tracking-[0.24em]">Auf die Wall?</span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-white/48">
                                Du entscheidest, ob dein Signal öffentlich sichtbar wird.
                            </p>
                            <motion.button
                                type="button"
                                onClick={submitWallSignal}
                                disabled={wallDisabled}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.10] px-4 py-3 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/30"
                                whileTap={{ scale: 0.98 }}
                            >
                                {wallButtonLabel}
                                <ExternalLink size={13} />
                            </motion.button>
                            {wallState === 'error' && (
                                <p className="mt-3 text-xs text-red-100/55">Wall-Freigabe konnte nicht vorbereitet werden.</p>
                            )}
                            {wallState === 'pending' && (
                                <p className="mt-3 text-xs text-emerald-100/55">Wall-Signal ist vorgemerkt. Sichtbar erst nach Bestätigung.</p>
                            )}
                        </motion.section>
                    </div>
                </div>

                {/* Data separation notice */}
                <motion.section
                    {...anim(0.58)}
                    className="rounded-[1.5rem] border border-white/[0.055] bg-black/20 p-5 text-xs leading-relaxed text-white/38"
                >
                    <div className="flex items-center gap-2 text-white/52">
                        <ShieldCheck size={14} />
                        <span className="uppercase tracking-[0.22em]">Datentrennung</span>
                    </div>
                    <p className="mt-2.5">
                        Demo-Daten zeigen nur das Muster der Simple Coffee Group. Kundendaten aus deinem Security Check bleiben als eigener Preview-Kontext gespeichert und laufen ab, solange kein Account verbunden wird.
                    </p>
                </motion.section>
            </div>
        </main>
    );
}
