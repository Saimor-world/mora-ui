'use client';

import React, { useState } from 'react';
import { WebsiteEntryTokenLogin } from './WebsiteEntryTokenLogin';
import { WebsiteEntryPersistence } from './WebsiteEntryPersistence';
import { scoreBreakdown, buildScoreNarrative } from '@/lib/dossier/scoreBreakdown';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';
import { useNavStore } from '@/lib/store/navStore';
import {
    markWebsiteEntryContextForHomeOpen,
    markWebsiteEntryPreviewSession,
} from '@/lib/websiteEntryStorage';

interface Props {
    context: WebsiteEntryContext;
}

const STATUS_STYLES = {
    critical: { bar: 'from-red-500 to-red-300',     text: 'text-red-300' },
    warn:     { bar: 'from-amber-500 to-amber-300', text: 'text-amber-300' },
    ok:       { bar: 'from-emerald-500 to-emerald-300', text: 'text-emerald-300' },
} as const;

export function SecurityCheckEntry({ context }: Props) {
    const [authReady, setAuthReady] = useState(false);
    const [authError, setAuthError] = useState(!context.entryToken);
    const [waiting,   setWaiting]   = useState(false);

    const dimensions = scoreBreakdown(context);
    const narrative  = buildScoreNarrative(context);
    const domain     = context.domain ?? context.companyName;

    function handleCta() {
        if (authReady) {
            window.location.href = '/home';
        } else {
            setWaiting(true);
        }
    }

    function handleReady() {
        // Persist scan context so /home bootstrap skips stale-session teardown
        // (fresh preview visitors have no last_activity → tier 'neustart').
        markWebsiteEntryPreviewSession();
        markWebsiteEntryContextForHomeOpen(context);
        useNavStore.getState().setActiveMode('private_preview');
        setAuthReady(true);
        if (waiting) window.location.href = '/home';
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#05040d] text-white">
            {/* Ambient glows */}
            <div className="pointer-events-none absolute top-[-200px] left-[-100px] h-[600px] w-[700px] rounded-full bg-violet-600/[0.10] blur-[140px]" />
            <div className="pointer-events-none absolute bottom-[-200px] right-[-100px] h-[500px] w-[600px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Persist entry context immediately (same as other /entry paths) so a later
                /home mount does not treat this visitor as a stale neustart session. */}
            <WebsiteEntryPersistence context={context} />

            {/* Private preview auth runs in the background while the visitor reads. */}
            {context.entryToken ? (
                <WebsiteEntryTokenLogin
                    token={context.entryToken}
                    redirectOnSuccess={false}
                    onSuccess={handleReady}
                />
            ) : null}

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-14 pt-7">
                <div className="text-[15px] font-semibold tracking-[0.08em] text-white/85">
                    SAIM<span className="text-violet-400/85">Ô</span>R
                </div>
                <div className="font-mono text-[11px] text-white/20">
                    hq.saimor.world · Security Check Entry
                </div>
            </div>

            {/* Two-column layout */}
            <div className="relative z-10 grid min-h-[calc(100vh-72px)] grid-cols-2">

                {/* ── Left: Personal + Score ── */}
                <div className="flex flex-col justify-center px-14 py-12">
                    {/* Eyebrow */}
                    <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/[0.18] bg-violet-500/[0.08] px-4 py-1.5">
                        <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-violet-400/80" />
                        <span className="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Dein Workspace ist bereit</span>
                    </div>

                    {/* Greeting */}
                    <h1 className="mb-1.5 text-[50px] font-light leading-[1.08] tracking-[-0.03em] text-white/92">
                        Hallo,<br />{context.companyName}.
                    </h1>
                    <p className="mb-10 font-mono text-[13px] text-white/25">{domain}</p>

                    {/* Score */}
                    <div className="mb-4 flex items-end gap-3">
                        <span
                            data-testid="entry-score"
                            className="bg-gradient-to-br from-amber-400 to-red-400 bg-clip-text text-[72px] font-black leading-none text-transparent"
                        >
                            {context.score ?? '—'}
                        </span>
                        <div className="pb-2">
                            <div className="text-[18px] font-light text-white/[0.18]">/ 100</div>
                            <div className="mt-1 text-[11px] text-amber-300/65">⚠ {context.level ?? 'Mittleres Risiko'}</div>
                        </div>
                    </div>

                    {/* Narrative (C) */}
                    <p data-testid="entry-narrative" className="mb-2 max-w-[440px] text-[16px] font-light leading-[1.55] tracking-[-0.01em] text-white/75">
                        {narrative}
                    </p>
                    <p className="mb-6 max-w-[420px] text-[12px] leading-relaxed text-white/30">
                        Der Score misst Sicherheit, Performance und Erreichbarkeit — jede Dimension mit konkreten Befunden.
                    </p>

                    {/* Dimension bars (B) */}
                    <div className="mb-9 flex flex-col gap-3">
                        {dimensions.map(dim => (
                            <div key={dim.id} data-testid="score-dimension" className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-white/48">{dim.label}</span>
                                    <span className={`text-[11px] font-semibold ${STATUS_STYLES[dim.status].text}`}>
                                        {dim.value}
                                    </span>
                                </div>
                                <div className="h-[4px] overflow-hidden rounded-full bg-white/[0.05]">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${STATUS_STYLES[dim.status].bar}`}
                                        style={{ width: `${dim.barPercent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleCta}
                            disabled={authError}
                            className="inline-flex items-center gap-2.5 rounded-[14px] border border-violet-400/30 bg-violet-600/85 px-7 py-3.5 text-[14px] font-medium text-white transition-all hover:bg-violet-500/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {waiting ? 'Wird vorbereitet…' : 'Workspace öffnen'}&nbsp;→
                        </button>
                        <span className="text-[11px] text-white/20">
                            {authError ? 'Preview-Link ungültig — bitte neu starten.' : '20 Tage Preview-Account · Private Demo'}
                        </span>
                    </div>
                </div>

                {/* ── Right: What is SAIMÔR ── */}
                <div className="flex flex-col justify-center border-l border-white/[0.05] px-14 py-12">
                    <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-white/20">Was dich erwartet</p>
                    <h2 className="mb-3 text-[28px] font-light leading-[1.3] tracking-[-0.02em] text-white/88">
                        Dein Scan-Ergebnis<br />
                        als{' '}
                        <span className="bg-gradient-to-r from-cyan-300/90 to-violet-300/90 bg-clip-text text-transparent">
                            lebender Workspace.
                        </span>
                    </h2>
                    <p className="mb-9 max-w-[420px] text-[13px] leading-[1.75] text-white/38">
                        SAIMÔR OS verbindet dein Dossier, KI und Struktur zu einem echten Workspace — gebaut um deine Findings.
                    </p>

                    {/* Feature tiles */}
                    <div className="mb-8 flex flex-col gap-2.5">
                        {([
                            { icon: '🌐', title: 'Universe — Org als Karte',       desc: 'Bereiche, Verbindungen, Signale. Kein Organigramm — eine lebende Topographie.' },
                            { icon: '📁', title: 'Finder — Dossier liegt drin',    desc: 'Alle Findings als Dokument. Öffne es, bearbeite es, frag Môra dazu.' },
                            { icon: '✦',  title: 'Môra — kennt deinen Score',      desc: 'Frag sie nach Maßnahmen — sie antwortet mit deinen konkreten Daten.' },
                        ] as const).map(f => (
                            <div key={f.title} className="flex items-start gap-3.5 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-4 py-3.5">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-violet-400/[0.18] bg-violet-500/10 text-[13px]">
                                    {f.icon}
                                </div>
                                <div>
                                    <div className="mb-0.5 text-[13px] font-medium text-white/80">{f.title}</div>
                                    <div className="text-[11px] leading-relaxed text-white/32">{f.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Môra strip */}
                    <div className="flex items-center gap-3.5 rounded-[14px] border border-violet-500/[0.18] bg-violet-500/[0.07] px-5 py-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-violet-400/[0.28] bg-violet-500/20 text-[15px]">
                            ✦
                        </div>
                        <p className="text-[12px] leading-relaxed text-white/40">
                            <span className="font-medium text-violet-300/85">Môra kennt bereits dein Ergebnis.</span>
                            <br />Frag sie: &#x201E;Was sind meine drei dringendsten Maßnahmen?&#x201D;
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/[0.04] px-14 py-5 text-[10px] text-white/15">
                <span>© 2026 SAIMÔR · Demo-Space · Keine echten Daten gespeichert</span>
                <div className="flex gap-5">
                    <a href="https://saimor.world/de/datenschutz" className="hover:text-white/40">Datenschutz</a>
                    <a href="https://saimor.world" className="hover:text-white/40">saimor.world</a>
                </div>
            </div>
        </main>
    );
}
