'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, FileText, Globe2, ShieldAlert, ShieldCheck, Timer, UploadCloud } from 'lucide-react';
import { submitDossierToWall } from '@/lib/api/wallClient';
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';
import { useDossierView } from '@/lib/queries/useDossierView';
import { usePaneStore } from '@/lib/store/paneStore';

type VisitorFinding = {
    title?: string;
    severity?: string;
    desc?: string;
    description?: string;
};

function riskTone(score?: number | null) {
    if (score === undefined || score === null) return 'text-white/58 border-white/10 bg-white/[0.04]';
    if (score < 50) return 'text-red-100 border-red-300/24 bg-red-400/[0.10]';
    if (score < 80) return 'text-amber-100 border-amber-300/22 bg-amber-400/[0.09]';
    return 'text-emerald-100 border-emerald-300/20 bg-emerald-400/[0.08]';
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

export function VisitorHomeSurface() {
    const context = useWebsiteEntryContext();
    const { nodeId: dossierNodeId, isCreating: isCreatingDossierNode } = useCreateDossierNode(context);
    const { data: view } = useDossierView(context?.id);
    const openPane = usePaneStore((s) => s.openPane);
    const [wallState, setWallState] = useState<'idle' | 'submitting' | 'pending' | 'error'>('idle');

    const audit = view?.audit;
    const companyName = view?.company?.name || context?.companyName || 'Deine Firma';
    const domain = audit?.domain || context?.domain || '';
    const score = audit?.score ?? context?.score ?? null;
    const level = audit?.level || context?.level || context?.grade || 'Security Check';
    const summary = audit?.summary || context?.summary || 'Dein Security Check wurde als isolierter OS-Raum vorbereitet.';
    const logoUrl = domainLogo(domain, audit?.logo_url);
    const expiresLabel = formatDate(audit?.expires_at);

    const findings = useMemo<VisitorFinding[]>(() => {
        const fromAudit = audit?.findings ?? [];
        if (fromAudit.length > 0) return fromAudit.slice(0, 5);
        return (context?.tasks ?? []).slice(0, 4).map((task) => ({
            title: task.title,
            severity: task.priority,
            desc: 'Aus dem Security-Check als naechste Aufgabe vorbereitet.',
        }));
    }, [audit?.findings, context?.tasks]);

    const openDossier = () => {
        if (!context) return;
        openPane({
            id: 'website-dossier-current',
            type: 'website-dossier',
            title: `${companyName} Dossier`,
            size: { width: 860, height: 680 },
            data: { context },
        });
    };

    const submitWallSignal = async () => {
        if (!dossierNodeId || wallState === 'submitting') return;
        setWallState('submitting');
        try {
            await submitDossierToWall({
                node_id: dossierNodeId,
                visibility: 'domain-only',
                message: `${companyName} prueft Security-Befunde aus dem SAIMOR Preview-Raum.`,
            });
            setWallState('pending');
        } catch {
            setWallState('error');
        }
    };

    const wallDisabled = !dossierNodeId || isCreatingDossierNode || wallState === 'submitting' || wallState === 'pending';
    const wallButtonLabel = wallState === 'submitting'
        ? 'Signal wird vorbereitet'
        : wallState === 'pending'
            ? 'Wartet auf Bestaetigung'
            : 'Signal veroeffentlichen';

    return (
        <main className="pointer-events-auto relative z-10 h-full overflow-y-auto px-5 pb-28 pt-24 text-white sm:px-8 lg:px-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/32 p-6 shadow-[0_24px_120px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
                                <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-100/50">Dein Security Check</p>
                                <h1 className="mt-2 truncate text-3xl font-light tracking-[-0.03em] text-white/92 sm:text-5xl">{companyName}</h1>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/48">
                                    {domain ? <span>{domain}</span> : null}
                                    {context?.email ? <span>{context.email}</span> : null}
                                </div>
                            </div>
                        </div>
                        <div className={`rounded-3xl border px-6 py-5 text-right ${riskTone(score)}`}>
                            <p className="text-[10px] uppercase tracking-[0.2em] opacity-55">Score</p>
                            <p className="mt-1 text-5xl font-light tabular-nums">{score ?? '--'}</p>
                            <p className="text-xs opacity-65">{level}</p>
                        </div>
                    </div>
                    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/62">{summary}</p>
                </section>

                <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                    <section className="rounded-[1.5rem] border border-white/[0.075] bg-black/28 p-5 backdrop-blur-xl">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-amber-100/72">
                                <ShieldAlert size={17} />
                                <span className="text-[10px] uppercase tracking-[0.24em]">Deine Befunde</span>
                            </div>
                            <button onClick={openDossier} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/64 hover:bg-white/[0.07]">
                                Dossier
                                <ArrowRight size={13} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {findings.length > 0 ? findings.map((finding, index) => (
                                <div key={`${finding.title}-${index}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="text-sm font-medium text-white/82">{finding.title || 'Security Befund'}</h2>
                                        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.13em] text-white/42">
                                            {finding.severity || 'signal'}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-white/46">{finding.desc || finding.description || 'Aus dem passiven Website-Check uebernommen.'}</p>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-5 text-sm text-white/48">
                                    Noch keine Detailbefunde im OS angekommen. Das Dossier bleibt trotzdem isoliert vorbereitet.
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="flex flex-col gap-5">
                        <section className="rounded-[1.5rem] border border-white/[0.075] bg-black/28 p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-2 text-cyan-100/70">
                                <FileText size={16} />
                                <span className="text-[10px] uppercase tracking-[0.24em]">So sieht dein OS aus</span>
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-white/58">
                                Die Demo-Struktur dient als Geruest. Deine Firmendaten, dein Scan und dein Dossier bleiben separat markiert.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/54">
                                <div className="rounded-2xl border border-white/[0.055] bg-white/[0.032] p-3">Security</div>
                                <div className="rounded-2xl border border-white/[0.055] bg-white/[0.032] p-3">Betrieb</div>
                                <div className="rounded-2xl border border-white/[0.055] bg-white/[0.032] p-3">Wachstum</div>
                                <div className="rounded-2xl border border-white/[0.055] bg-white/[0.032] p-3">Dossier</div>
                            </div>
                        </section>

                        <section className="rounded-[1.5rem] border border-emerald-300/12 bg-emerald-400/[0.055] p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-2 text-emerald-100/76">
                                <Timer size={16} />
                                <span className="text-[10px] uppercase tracking-[0.24em]">Dein persoenlicher Raum</span>
                            </div>
                            <p className="mt-4 text-sm text-white/64">Scan gespeichert. Dossier angelegt. Preview laeuft bis:</p>
                            <p className="mt-2 text-lg font-light text-emerald-50">{expiresLabel}</p>
                        </section>

                        <section className="rounded-[1.5rem] border border-white/[0.075] bg-black/28 p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-2 text-white/68">
                                <UploadCloud size={16} />
                                <span className="text-[10px] uppercase tracking-[0.24em]">Auf die Wall?</span>
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-white/52">
                                Du entscheidest, ob dein Signal oeffentlich sichtbar wird. Ohne Freigabe bleibt es nur in deinem Preview-Raum.
                            </p>
                            <button
                                type="button"
                                onClick={submitWallSignal}
                                disabled={wallDisabled}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.10] px-4 py-3 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-400/[0.15] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/34"
                            >
                                {wallButtonLabel}
                                <ExternalLink size={14} />
                            </button>
                            {wallState === 'error' ? (
                                <p className="mt-3 text-xs leading-relaxed text-red-100/58">
                                    Wall-Freigabe konnte nicht vorbereitet werden. Dein Preview-Raum bleibt unveraendert privat.
                                </p>
                            ) : null}
                            {wallState === 'pending' ? (
                                <p className="mt-3 text-xs leading-relaxed text-emerald-100/58">
                                    Wall-Signal ist vorgemerkt. Sichtbar wird es erst nach Bestaetigung.
                                </p>
                            ) : null}
                        </section>
                    </aside>
                </div>

                <section className="rounded-[1.5rem] border border-white/[0.065] bg-black/24 p-5 text-xs leading-relaxed text-white/42">
                    <div className="flex items-center gap-2 text-white/58">
                        <ShieldCheck size={15} />
                        <span className="uppercase tracking-[0.22em]">Trennung</span>
                    </div>
                    <p className="mt-3">
                        Demo-Daten zeigen nur das Muster. Kundendaten aus dem Security Check bleiben als eigener Preview-Kontext gespeichert und laufen ab, solange kein Account verbunden wird.
                    </p>
                </section>
            </div>
        </main>
    );
}
