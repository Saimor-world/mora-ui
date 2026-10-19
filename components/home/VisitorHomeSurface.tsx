'use client';

/**
 * VisitorHomeSurface — Unified Preview Home (UV2 Design System)
 *
 * Based on Universe V2 design tokens (commit 4d0a9dc9 / hd45):
 * - One accent: Gold (#D6A848)
 * - Type: Cormorant Garamond serif for headlines, Inter sans for body
 * - Cards: Subtle hairline borders, no competing glows
 * - Brighter, airier feel with cream tones on dark ink
 *
 * This surface renders for:
 * - activeMode === 'visitor' (website security check entry)
 * - activeMode === 'private_preview' (demo tenant preview)
 */

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Shield, Sparkles, Timer } from 'lucide-react';
import { useWebsiteEntryContext } from '@/lib/hooks/useWebsiteEntryContext';
import { useCompanies } from '@/lib/queries/useCompanies';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';

const UV2_TOKENS = {
    gold: '#D6A848',
    goldRgb: '214,168,72',
    cream: '#F7F4E9',
    creamRgb: '247,244,233',
    ink: '#050706',
    ink2: '#070B0C',
    hairline: 'rgba(247,244,233,0.09)',
    border: 'rgba(164,190,182,0.22)',
};

const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = 'Inter, -apple-system, system-ui, sans-serif';

function timeGreeting(hour: number): string {
    if (hour < 5) return 'Gute Nacht';
    if (hour < 11) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
}

function MoraStone() {
    return (
        <div className="relative h-14 w-14 shrink-0" aria-hidden>
            <motion.div
                className="absolute inset-[-6px] rounded-full blur-md"
                style={{ background: `rgba(${UV2_TOKENS.goldRgb}, 0.12)` }}
                animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.45, 0.8, 0.45] }}
                transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute inset-0"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Image
                    src="/brand/mora-stone-v1.png"
                    alt=""
                    width={56}
                    height={56}
                    draggable={false}
                    className="h-full w-full select-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                />
            </motion.div>
        </div>
    );
}

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

function Card({ children, className = '' }: CardProps) {
    return (
        <div
            className={`rounded-xl p-5 ${className}`}
            style={{
                background: 'rgba(7,11,12,0.65)',
                border: `0.5px solid ${UV2_TOKENS.hairline}`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            }}
        >
            {children}
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <p
            style={{
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: UV2_TOKENS.gold,
            }}
        >
            {children}
        </p>
    );
}

export function VisitorHomeSurface() {
    const context = useWebsiteEntryContext();
    const openPane = usePaneStore((s) => s.openPane);
    const { data: companies = [] } = useCompanies({ includeDemo: true });
    const setActiveCompany = useNavStore((s) => s.setActiveCompany);
    const navigateToExplore = useNavStore((s) => s.navigateToExplore);
    const guidedDemoCompany = companies.find((c) => c.is_demo && c.name === 'Simple Coffee Group');

    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        const update = () => setNow(new Date());
        update();
        const timer = window.setInterval(update, 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const greeting = now ? timeGreeting(now.getHours()) : 'Willkommen';
    const dateLabel = now
        ? now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
        : '';
    const timeLabel = now
        ? now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : '';

    const companyName = context?.companyName || 'Deine Firma';
    const domain = context?.domain || '';
    const hasRealScore = context?.score !== undefined && context?.score !== null;
    const score = hasRealScore ? context.score : null;
    const tasks = context?.tasks ?? [];
    const expiresLabel = '20 Tage Preview';

    const openGuidedDemo = () => {
        if (!guidedDemoCompany) return;
        setActiveCompany(guidedDemoCompany.id);
        navigateToExplore();
    };

    const ease = [0.22, 1, 0.36, 1] as const;

    return (
        <div
            data-testid="visitor-home-surface"
            className="pointer-events-auto absolute inset-0 overflow-y-auto antialiased"
            style={{
                fontFamily: SANS,
                color: UV2_TOKENS.cream,
                paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
                paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 120px), 140px)',
                paddingLeft: 'max(env(safe-area-inset-left, 0px), 24px)',
                paddingRight: 'max(env(safe-area-inset-right, 0px), 24px)',
            }}
        >
            <div className="uv2-grain" aria-hidden />

            <main className="relative mx-auto w-full max-w-3xl pt-8 sm:pt-12">
                <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease, delay: 0.15 }}
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p
                            style={{
                                fontFamily: SANS,
                                fontSize: 12,
                                fontWeight: 500,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: UV2_TOKENS.gold,
                            }}
                        >
                            {dateLabel.replace(',', ' ·')}{timeLabel ? ` · ${timeLabel}` : ''}
                        </p>
                        <MoraStone />
                    </div>

                    <h1
                        className="mt-6"
                        style={{
                            fontFamily: SERIF,
                            fontSize: 'clamp(36px, 8vw, 56px)',
                            fontWeight: 400,
                            lineHeight: 1.05,
                            letterSpacing: '-0.025em',
                            color: UV2_TOKENS.cream,
                        }}
                    >
                        {greeting}.
                    </h1>

                    <p
                        className="mt-4 max-w-lg"
                        style={{
                            fontSize: 15,
                            fontWeight: 300,
                            lineHeight: 1.6,
                            color: `rgba(${UV2_TOKENS.creamRgb}, 0.78)`,
                        }}
                    >
                        Dein persönlicher Vorschau-Raum für{' '}
                        <span style={{ color: UV2_TOKENS.gold }}>{companyName}</span>.
                        {domain ? ` ${domain}` : ''}
                    </p>
                </motion.section>

                <motion.section
                    className="mt-10"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease, delay: 0.3 }}
                >
                    <Label>Heute</Label>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {hasRealScore ? (
                            <Card>
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Shield size={16} style={{ color: UV2_TOKENS.gold }} />
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    letterSpacing: '0.06em',
                                                    textTransform: 'uppercase',
                                                    color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                                }}
                                            >
                                                Security Check
                                            </span>
                                        </div>
                                        <p
                                            className="mt-2"
                                            style={{
                                                fontFamily: SERIF,
                                                fontSize: 28,
                                                fontWeight: 400,
                                                color: UV2_TOKENS.cream,
                                            }}
                                        >
                                            Score {score}
                                        </p>
                                        <p
                                            className="mt-1"
                                            style={{
                                                fontSize: 13,
                                                color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                            }}
                                        >
                                            {score != null && score < 50
                                                ? 'Kritische Maßnahmen empfohlen'
                                                : score != null && score < 80
                                                    ? 'Mittlere Risiken erkannt'
                                                    : 'Solide Basis'}
                                        </p>
                                    </div>
                                    <div
                                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                                        style={{
                                            background: `rgba(${UV2_TOKENS.goldRgb}, 0.12)`,
                                            border: `1px solid rgba(${UV2_TOKENS.goldRgb}, 0.25)`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontFamily: SERIF,
                                                fontSize: 24,
                                                fontWeight: 400,
                                                color: UV2_TOKENS.gold,
                                            }}
                                        >
                                            {score}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        ) : null}

                        <Card>
                            <div className="flex items-center gap-2">
                                <Timer size={16} style={{ color: UV2_TOKENS.gold }} />
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 500,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                    }}
                                >
                                    Vorschau-Raum
                                </span>
                            </div>
                            <p
                                className="mt-2"
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 22,
                                    fontWeight: 400,
                                    color: UV2_TOKENS.cream,
                                }}
                            >
                                {expiresLabel}
                            </p>
                            <p
                                className="mt-1"
                                style={{
                                    fontSize: 13,
                                    color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                }}
                            >
                                Deine Daten bleiben getrennt und laufen automatisch ab.
                            </p>
                        </Card>
                    </div>

                    {tasks.length > 0 && (
                        <div className="mt-4">
                            <Card>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={16} style={{ color: UV2_TOKENS.gold }} />
                                    <span
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                        }}
                                    >
                                        {tasks.length} {tasks.length === 1 ? 'Befund' : 'Befunde'}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {tasks.slice(0, 4).map((task, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                                            style={{
                                                background: `rgba(${UV2_TOKENS.creamRgb}, 0.03)`,
                                                border: `0.5px solid ${UV2_TOKENS.hairline}`,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    color: `rgba(${UV2_TOKENS.creamRgb}, 0.82)`,
                                                }}
                                            >
                                                {task.title}
                                            </span>
                                            <span
                                                className="shrink-0 rounded px-2 py-0.5"
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                    background:
                                                        task.priority === 'hoch'
                                                            ? 'rgba(214,168,72,0.15)'
                                                            : `rgba(${UV2_TOKENS.creamRgb}, 0.06)`,
                                                    color:
                                                        task.priority === 'hoch'
                                                            ? UV2_TOKENS.gold
                                                            : `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                                }}
                                            >
                                                {task.priority || 'signal'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}
                </motion.section>

                <motion.section
                    className="mt-10"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease, delay: 0.45 }}
                >
                    <Label>Weiter</Label>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={openGuidedDemo}
                            disabled={!guidedDemoCompany}
                            className="group text-left rounded-xl p-5 transition-colors disabled:opacity-50"
                            style={{
                                background: 'rgba(7,11,12,0.65)',
                                border: `0.5px solid ${UV2_TOKENS.hairline}`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: `rgba(${UV2_TOKENS.creamRgb}, 0.45)`,
                                        }}
                                    >
                                        Demo-Workspace
                                    </p>
                                    <p
                                        className="mt-1"
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: 20,
                                            fontWeight: 400,
                                            color: UV2_TOKENS.cream,
                                        }}
                                    >
                                        Simple Coffee Group
                                    </p>
                                    <p
                                        className="mt-2"
                                        style={{
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                        }}
                                    >
                                        Erkunde ein voll eingerichtetes SAIMÔR OS mit echten Beispieldaten.
                                    </p>
                                </div>
                                <ArrowRight
                                    size={18}
                                    className="mt-1 shrink-0 transition-transform group-hover:translate-x-1"
                                    style={{ color: `rgba(${UV2_TOKENS.creamRgb}, 0.35)` }}
                                />
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => navigateToExplore()}
                            className="group text-left rounded-xl p-5 transition-colors"
                            style={{
                                background: 'rgba(7,11,12,0.65)',
                                border: `0.5px solid ${UV2_TOKENS.hairline}`,
                            }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 500,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: `rgba(${UV2_TOKENS.creamRgb}, 0.45)`,
                                        }}
                                    >
                                        Universe
                                    </p>
                                    <p
                                        className="mt-1"
                                        style={{
                                            fontFamily: SERIF,
                                            fontSize: 20,
                                            fontWeight: 400,
                                            color: UV2_TOKENS.cream,
                                        }}
                                    >
                                        Topographie erkunden
                                    </p>
                                    <p
                                        className="mt-2"
                                        style={{
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: `rgba(${UV2_TOKENS.creamRgb}, 0.55)`,
                                        }}
                                    >
                                        Sieh die Organisation als lebendige Struktur im Raum.
                                    </p>
                                </div>
                                <ArrowRight
                                    size={18}
                                    className="mt-1 shrink-0 transition-transform group-hover:translate-x-1"
                                    style={{ color: `rgba(${UV2_TOKENS.creamRgb}, 0.35)` }}
                                />
                            </div>
                        </button>
                    </div>
                </motion.section>

                <motion.p
                    className="mt-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease, delay: 0.6 }}
                    style={{
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: `rgba(${UV2_TOKENS.creamRgb}, 0.38)`,
                    }}
                >
                    Demo-Daten zeigen nur das Muster der Simple Coffee Group. Daten aus deinem Check bleiben getrennt und laufen nach 20 Tagen automatisch ab.
                </motion.p>
            </main>
        </div>
    );
}
