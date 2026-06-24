'use client';

/**
 * ISOLATED PROTOTYPE — Planet → Welt Redesign (Design-only)
 * Spec: docs/superpowers/specs/2026-06-24-planet-to-world-redesign.md
 *
 * Self-contained: imports ONLY framer-motion + lucide. Touches NO production
 * files (no UniverseView / DepartmentSurface / navStore / widget-registry).
 * All data here is explicit DEMO data — not a claim about real system state.
 * Route: /proto/planet-world
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft, FolderTree, Lock, EyeOff, ListChecks, Activity, Target,
    Hexagon, Cloud, HardDrive, Home as HomeIcon,
} from 'lucide-react';

// ── DEMO DATA (explicitly fake — prototype only) ──────────────────────────────

type Access = 'open' | 'locked' | 'hidden';
interface Moon { id: string; name: string; activity: number; tasks: number }
interface Planet {
    id: string;
    name: string;
    accent: string;       // department identity colour
    glow: string;         // rgba for atmosphere
    x: number;            // viewport %  (L1 position → entry origin)
    y: number;
    r: number;            // visual radius px
    access: Access;
    lockReason?: string;
    tasks: number;
    moons: Moon[];
}

const PLANETS: Planet[] = [
    {
        id: 'product', name: 'Produkt', accent: '#34d399', glow: '16,185,129',
        x: 64, y: 38, r: 44, access: 'open', tasks: 12,
        moons: [
            { id: 'roadmap', name: 'Roadmap', activity: 0.8, tasks: 5 },
            { id: 'launch', name: 'Launch Q3', activity: 0.4, tasks: 3 },
            { id: 'specs', name: 'Specs', activity: 0.2, tasks: 4 },
        ],
    },
    {
        id: 'science', name: 'Science', accent: '#38bdf8', glow: '56,189,248',
        x: 33, y: 32, r: 32, access: 'open', tasks: 6,
        moons: [
            { id: 'lab', name: 'Lab Notes', activity: 0.5, tasks: 2 },
            { id: 'data', name: 'Datensätze', activity: 0.3, tasks: 4 },
        ],
    },
    {
        id: 'finance', name: 'Finanz', accent: '#fbbf24', glow: '251,191,36',
        x: 34, y: 66, r: 30, access: 'locked', lockReason: 'Kein Zutritt für deine Rolle', tasks: 0, moons: [],
    },
    {
        id: 'data', name: 'Daten', accent: '#a78bfa', glow: '167,139,250',
        x: 66, y: 68, r: 30, access: 'open', tasks: 9,
        moons: [{ id: 'graph', name: 'Wissensgraph', activity: 0.6, tasks: 6 }],
    },
    // a 'hidden' planet exists in data but is intentionally never rendered (no leak)
    {
        id: 'secret', name: 'Vorstand', accent: '#f472b6', glow: '244,114,182',
        x: 50, y: 20, r: 26, access: 'hidden', tasks: 0, moons: [],
    },
];

const STARS = Array.from({ length: 46 }, (_, i) => ({
    id: i,
    left: (i * 53 % 100),
    top: (i * 37 % 100),
    size: (i % 3) * 0.4 + 0.5,
    op: 0.25 + (i % 5) * 0.12,
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function withAlpha(rgb: string, a: number) { return `rgba(${rgb},${a})`; }

// ── L1 · Org-Universe ─────────────────────────────────────────────────────────

function OrgUniverse({ onEnter }: { onEnter: (p: Planet, origin: { x: number; y: number }) => void }) {
    const [hovered, setHovered] = useState<string | null>(null);
    const visible = PLANETS.filter((p) => p.access !== 'hidden');

    return (
        <div className="absolute inset-0">
            {/* neutral org starfield */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 46%, #15233f 0%, #0b1228 55%, #070a16 100%)' }} />
            {STARS.map((s) => (
                <span key={s.id} className="absolute rounded-full bg-white" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.op }} />
            ))}

            {/* header */}
            <div className="absolute left-6 top-5 z-10">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Organisation · Universe</div>
                <div className="mt-0.5 text-[11px] text-white/30">Abteilungen als Planeten · gemeinsame Ereignisse</div>
            </div>

            {/* org core */}
            <div className="absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-cyan-300/40 bg-[#0a1424] text-[12px] text-cyan-100/80"
                    style={{ boxShadow: '0 0 60px rgba(94,201,216,0.12)' }}>
                    Saimôr HQ
                </div>
            </div>

            {/* planets */}
            {visible.map((p) => {
                const isHover = hovered === p.id;
                const locked = p.access === 'locked';
                return (
                    <div
                        key={p.id}
                        className="absolute z-[6] -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                        onMouseEnter={() => setHovered(p.id)}
                        onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
                    >
                        {/* atmosphere pre-shimmer on hover (taste of L2 identity) */}
                        {isHover && !locked && (
                            <motion.div
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{ width: p.r * 3.4, height: p.r * 3.4, background: `radial-gradient(circle, ${withAlpha(p.glow, 0.28)} 0%, transparent 65%)` }}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                            />
                        )}
                        <motion.button
                            type="button"
                            disabled={locked}
                            onClick={(e) => {
                                const rect = (e.currentTarget.closest('[data-stage]') as HTMLElement)?.getBoundingClientRect();
                                const ox = rect ? ((e.clientX - rect.left) / rect.width) * 100 : p.x;
                                const oy = rect ? ((e.clientY - rect.top) / rect.height) * 100 : p.y;
                                onEnter(p, { x: ox, y: oy });
                            }}
                            animate={{ scale: isHover && !locked ? 1.08 : 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                            className={`relative flex items-center justify-center rounded-full border-2 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{
                                width: p.r * 2, height: p.r * 2,
                                borderColor: withAlpha(p.glow, locked ? 0.35 : 0.85),
                                background: '#0a1424',
                                boxShadow: isHover && !locked ? `0 0 48px ${withAlpha(p.glow, 0.4)}` : 'none',
                            }}
                        >
                            <span className="text-[10px]" style={{ color: locked ? 'rgba(255,255,255,0.4)' : withAlpha(p.glow, 0.95) }}>{p.name}</span>
                            {locked && (
                                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-black/60">
                                    <Lock size={10} className="text-white/55" />
                                </span>
                            )}
                        </motion.button>

                        {/* hover label / lock reason */}
                        <AnimatePresence>
                            {isHover && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm"
                                >
                                    {locked ? p.lockReason : `${p.tasks} Aufgaben · öffnen ↵`}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}

            {/* org event chip (stays on L1) */}
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[11px] text-white/55 backdrop-blur-sm">
                Org-Termin: All-Hands · Fr 14:00 — auf der Organisationsebene sichtbar
            </div>
        </div>
    );
}

// ── L2 · Planeten-Welt ────────────────────────────────────────────────────────

function PlanetWorld({ planet, onLeave }: { planet: Planet; onLeave: () => void }) {
    const [finderOpen, setFinderOpen] = useState(false);
    const [activeMoon, setActiveMoon] = useState<string | null>(null);

    return (
        <div className="absolute inset-0 text-white">
            {/* department atmosphere — identity-coloured, distinct from L1 */}
            <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 18%, ${withAlpha(planet.glow, 0.22)} 0%, ${withAlpha(planet.glow, 0.06)} 50%, #060f0d 100%)` }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(100% 60% at 50% 100%, rgba(0,0,0,0.5), transparent 60%)' }} />
            {STARS.slice(0, 18).map((s) => (
                <span key={s.id} className="absolute rounded-full" style={{ left: `${s.left}%`, top: `${s.top * 0.5}%`, width: s.size, height: s.size, background: withAlpha(planet.glow, 0.6), opacity: s.op }} />
            ))}

            {/* leave orbit — persistent, worded */}
            <button
                type="button"
                onClick={onLeave}
                className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] backdrop-blur-sm transition-colors"
                style={{ borderColor: withAlpha(planet.glow, 0.3), color: withAlpha(planet.glow, 0.95), background: 'rgba(8,20,16,0.7)' }}
            >
                <ArrowLeft size={13} /> Orbit verlassen
            </button>

            {/* breadcrumb */}
            <div className="absolute left-1/2 top-6 z-10 -translate-x-1/2 text-[11px] tracking-[0.06em] text-white/45">
                <button onClick={onLeave} className="hover:text-white/80">Organisation</button>
                <span className="mx-1.5 opacity-40">›</span>
                <span style={{ color: withAlpha(planet.glow, 0.95) }}>{planet.name}</span>
            </div>

            {/* world identity (no second core) */}
            <div className="absolute left-1/2 top-[22%] z-[5] -translate-x-1/2 text-center">
                <div className="text-2xl font-light tracking-[-0.02em]" style={{ color: withAlpha(planet.glow, 0.96) }}>{planet.name}</div>
                <div className="mt-1 inline-flex items-center gap-2 text-[11px] text-white/55">
                    <Activity size={12} style={{ color: withAlpha(planet.glow, 0.9) }} /> aktiv · {planet.tasks} offene Aufgaben
                </div>
            </div>

            {/* moons = projects/spaces, near orbit */}
            <div className="absolute left-1/2 top-[46%] z-[6] h-0 w-0">
                {planet.moons.length === 0 ? (
                    <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] text-white/40">Noch keine Projekte in dieser Welt</div>
                ) : planet.moons.map((m, i) => {
                    const angle = (-90 + i * (360 / Math.max(1, planet.moons.length))) * (Math.PI / 180);
                    const radius = 150;
                    const mx = Math.cos(angle) * radius;
                    const my = Math.sin(angle) * radius * 0.66;
                    const isActive = activeMoon === m.id;
                    return (
                        <motion.button
                            key={m.id}
                            type="button"
                            onClick={() => setActiveMoon((a) => (a === m.id ? null : m.id))}
                            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border text-center"
                            style={{
                                left: mx, top: my,
                                width: 60 + m.activity * 28, height: 60 + m.activity * 28,
                                borderColor: withAlpha(planet.glow, 0.6),
                                background: 'rgba(10,31,23,0.85)',
                                boxShadow: isActive ? `0 0 36px ${withAlpha(planet.glow, 0.4)}` : 'none',
                            }}
                            animate={{ scale: isActive ? 1.1 : 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        >
                            <span className="block text-[10px] text-white/85">{m.name}</span>
                            <span className="block text-[8px] text-white/45">{m.tasks} Aufgaben</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* world-context widget (right edge) — replaces org widgets */}
            <div className="absolute right-5 top-1/2 z-[8] w-[170px] -translate-y-1/2 rounded-2xl border border-white/[0.12] bg-[rgba(8,20,16,0.78)] p-3.5 backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-white/[0.18]" />
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/45">
                    <Target size={12} style={{ color: withAlpha(planet.glow, 0.9) }} /> Welt-Ziel
                </div>
                <div className="mt-2 text-[13px] text-white/85">Beta bis Quartalsende</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full" style={{ width: '62%', background: withAlpha(planet.glow, 0.8) }} />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-white/45">
                    <ListChecks size={11} /> {planet.tasks} Aufgaben · 3 aktiv
                </div>
            </div>

            {/* Finder = floor surface of the world (always reachable) */}
            <button
                type="button"
                onClick={() => setFinderOpen((v) => !v)}
                className="absolute bottom-5 left-1/2 z-[9] -translate-x-1/2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] backdrop-blur-sm transition-colors"
                style={{ borderColor: withAlpha(planet.glow, 0.3), color: withAlpha(planet.glow, 0.95), background: 'rgba(8,20,16,0.7)' }}
            >
                <FolderTree size={13} /> Finder {finderOpen ? 'schließen' : 'öffnen'}
            </button>

            <AnimatePresence>
                {finderOpen && (
                    <motion.div
                        initial={{ y: 220, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 220, opacity: 0.4 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                        className="absolute inset-x-0 bottom-0 z-[12] h-[170px] border-t backdrop-blur-2xl"
                        style={{ borderColor: withAlpha(planet.glow, 0.25), background: `linear-gradient(180deg, ${withAlpha(planet.glow, 0.10)}, rgba(6,15,13,0.92))` }}
                    >
                        <div className="flex items-center justify-between px-5 pt-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Finder · {planet.name}</div>
                            <button onClick={() => setFinderOpen(false)} className="text-[11px] text-white/45 hover:text-white/80">schließen</button>
                        </div>
                        <div className="flex gap-2 px-5 pt-3">
                            {[
                                { label: 'Privat', icon: <HomeIcon size={12} /> },
                                { label: 'Workspace', icon: <Hexagon size={12} /> },
                                { label: 'Drive (read-only)', icon: <Cloud size={12} /> },
                                { label: 'Gerät (später)', icon: <HardDrive size={12} />, disabled: true },
                            ].map((place) => (
                                <span key={place.label} className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] ${place.disabled ? 'text-white/25' : 'text-white/70'}`} style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    {place.icon}{place.label}
                                </span>
                            ))}
                        </div>
                        <div className="px-5 pt-3 text-[11px] text-white/40">Orte der Welt · kontextgebunden auf {planet.name} · keine Mutationen im Prototyp</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Stage with the L1↔L2 transition ───────────────────────────────────────────

export default function PlanetWorldPrototype() {
    const reduce = useReducedMotion();
    const [entered, setEntered] = useState<Planet | null>(null);
    const [origin, setOrigin] = useState({ x: 50, y: 50 });
    const stageRef = useRef<HTMLDivElement>(null);

    const enter = useCallback((p: Planet, o: { x: number; y: number }) => {
        setOrigin(o);
        setEntered(p);
    }, []);
    const leave = useCallback(() => setEntered(null), []);

    // transform-origin string for the cinematic zoom into / out of the planet
    const originStr = useMemo(() => `${origin.x}% ${origin.y}%`, [origin]);

    return (
        <div className="flex h-screen w-screen flex-col bg-black">
            {/* prototype chrome */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2 text-[11px] text-white/50">
                <span>Prototyp · Planet → Welt <span className="text-white/30">(Demo-Daten, keine Produktion)</span></span>
                <span className="text-white/30">{reduce ? 'reduced-motion: Crossfade' : 'motion: Eintauch-Zoom'} · Esc/„Orbit verlassen" = zurück</span>
            </div>

            <div ref={stageRef} data-stage className="relative flex-1 overflow-hidden"
                onKeyDown={(e) => { if (e.key === 'Escape') leave(); }} tabIndex={0}>
                <AnimatePresence mode="sync" initial={false}>
                    {entered === null ? (
                        <motion.div
                            key="L1"
                            className="absolute inset-0"
                            style={{ transformOrigin: originStr }}
                            initial={reduce ? { opacity: 0 } : { scale: 2.4, opacity: 0 }}
                            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                            exit={reduce ? { opacity: 0 } : { scale: 2.4, opacity: 0 }}
                            transition={{ duration: reduce ? 0.28 : 0.62, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <OrgUniverse onEnter={enter} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="L2"
                            className="absolute inset-0"
                            style={{ transformOrigin: originStr }}
                            initial={reduce ? { opacity: 0 } : { scale: 0.35, opacity: 0 }}
                            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                            exit={reduce ? { opacity: 0 } : { scale: 0.35, opacity: 0 }}
                            transition={{ duration: reduce ? 0.28 : 0.62, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <PlanetWorld planet={entered} onLeave={leave} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
