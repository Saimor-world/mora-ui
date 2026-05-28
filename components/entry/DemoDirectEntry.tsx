'use client';

/**
 * DemoDirectEntry — shown when a visitor clicks "OS-Demo öffnen" on the website.
 *
 * This is NOT the security-audit dossier flow. It's a pure product showcase:
 * - No company analysis, no Nightwatch tasks
 * - Authenticates silently in the background
 * - Shows compelling marketing copy while the workspace loads
 * - Sets activeMode = 'personal_demo' before redirecting to /home
 */

import React from 'react';
import { FolderOpen, Globe, Sparkles, Zap } from 'lucide-react';
import { WebsiteEntryTokenLogin } from './WebsiteEntryTokenLogin';
import { useNavStore } from '@/lib/store/navStore';

const FEATURES = [
    {
        icon: <Globe size={18} />,
        title: 'Universe',
        body: 'Deine Organisation als lebende Karte — Bereiche, Verbindungen, Signale.',
        accent: 'rgba(34,211,238,0.80)',
        bg: 'rgba(34,211,238,0.06)',
        border: 'rgba(34,211,238,0.18)',
    },
    {
        icon: <FolderOpen size={18} />,
        title: 'Finder',
        body: 'Myzel-Struktur: jede Datei, jedes Dokument sofort greifbar — ohne Ordner-Chaos.',
        accent: 'rgba(52,211,153,0.80)',
        bg: 'rgba(16,185,129,0.06)',
        border: 'rgba(52,211,153,0.18)',
    },
    {
        icon: <Sparkles size={18} />,
        title: 'Môra',
        body: 'Dein KI-Betriebssystem. Frag Môra — sie kennt deine gesamte Organisation.',
        accent: 'rgba(167,139,250,0.80)',
        bg: 'rgba(139,92,246,0.06)',
        border: 'rgba(167,139,250,0.18)',
    },
    {
        icon: <Zap size={18} />,
        title: 'Echtzeit',
        body: 'Signale aus Mail, Kalender, Feeds und Team — keine Dashboards mehr, nur echte Lage.',
        accent: 'rgba(251,191,36,0.80)',
        bg: 'rgba(245,158,11,0.06)',
        border: 'rgba(251,191,36,0.18)',
    },
] as const;

export function DemoDirectEntry({ token }: { token: string }) {
    function handleSuccess() {
        // Mark this session as a product demo so HomeSurface shows the right copy.
        useNavStore.getState().setActiveMode('personal_demo');
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#05040d] text-white flex flex-col items-center justify-center px-6 py-16">
            {/* Ambient backing glow */}
            <div className="pointer-events-none absolute top-[-10%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-violet-600/[0.08] blur-[140px]" />
            <div className="pointer-events-none absolute bottom-[-5%] left-1/4 h-[400px] w-[500px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />

            {/* Silent auth — handles login + redirect in background */}
            <WebsiteEntryTokenLogin token={token} onSuccess={handleSuccess} />

            {/* Marketing content */}
            <div className="relative z-10 w-full max-w-2xl space-y-10 text-center">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-violet-300/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                    SAIMÔR OS — Dein Workspace wird vorbereitet
                </div>

                {/* Headline */}
                <div className="space-y-4">
                    <h1 className="text-[clamp(36px,5vw,58px)] font-light leading-[1.05] tracking-[-0.03em] text-white/95">
                        So sieht dein{' '}
                        <span
                            className="font-light"
                            style={{
                                background: 'linear-gradient(135deg, rgba(103,232,249,0.95), rgba(167,139,250,0.95))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Unternehmen
                        </span>
                        {' '}von innen aus.
                    </h1>
                    <p className="mx-auto max-w-lg text-[15px] font-light leading-relaxed text-white/52">
                        SAIMÔR OS verbindet Dokumente, Team und KI zu einem einzigen, lebenden System.
                        Keine Tools mehr — nur Klarheit.
                    </p>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-2 gap-3 text-left">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className="rounded-2xl p-4 transition-all"
                            style={{ border: `1px solid ${f.border}`, background: f.bg }}
                        >
                            <div
                                className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl"
                                style={{
                                    background: f.accent.replace('0.80', '0.10'),
                                    border: `1px solid ${f.accent.replace('0.80', '0.22')}`,
                                    color: f.accent,
                                }}
                            >
                                {f.icon}
                            </div>
                            <div className="text-[13px] font-medium text-white/90">{f.title}</div>
                            <div className="mt-1 text-[12px] leading-relaxed text-white/50">{f.body}</div>
                        </div>
                    ))}
                </div>

                {/* Loading indicator */}
                <div className="flex items-center justify-center gap-2 text-[12px] text-white/35">
                    <span className="inline-flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                className="h-1 w-1 rounded-full bg-white/30 animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }}
                            />
                        ))}
                    </span>
                    Myzel-Struktur wird initialisiert…
                </div>
            </div>
        </main>
    );
}
