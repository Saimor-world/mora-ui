"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavStore } from "@/lib/store/navStore";
import { useOrbStore } from "@/lib/store/orbStore";
import { useActiveRitualScene } from "@/lib/hooks/useActiveRitualScene";
import { RITUAL_SCENE_ORDER, type RitualSceneId } from "@/lib/os/ritualMode";

/**
 * MoraLivingBackground - Premium Ambient Universe
 *
 * Features:
 * - 500 twinkling multi-color stars (seeded random for SSR safety)
 * - Aurora curtain: 3 sweeping gradient bands (Northern Lights effect)
 * - Floating sacred geometry (hexagons + diamonds)
 * - 14 neural consciousness threads
 * - Scanline sweep overlay
 * - Rich 6-layer nebula glow
 */

// Deterministic pseudo-random — avoids SSR/hydration mismatch
function sr(seed: number): number {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
}

const STAR_COLORS = [
    'rgba(16, 185, 129, 0.9)',   // emerald
    'rgba(255, 255, 255, 0.85)', // white
    'rgba(6, 182, 212, 0.80)',   // cyan
    'rgba(251, 191, 36, 0.75)',  // gold
    'rgba(167, 139, 250, 0.70)', // violet
] as const;

const STAR_GLOWS = [
    'rgba(16, 185, 129, 0.30)',
    'rgba(255, 255, 255, 0.18)',
    'rgba(6, 182, 212, 0.28)',
    'rgba(251, 191, 36, 0.35)',
    'rgba(167, 139, 250, 0.30)',
] as const;

const THREAD_COLORS = ['emerald-400', 'cyan-400', 'amber-400', 'violet-400', 'rose-400'] as const;

const AURORA_BANDS = [
    {
        gradient: 'linear-gradient(108deg, transparent 0%, rgba(16,185,129,0.14) 28%, rgba(6,182,212,0.10) 58%, transparent 100%)',
        top: '6%', height: '34%', duration: 28, delay: 0,
    },
    {
        gradient: 'linear-gradient(96deg, transparent 0%, rgba(139,92,246,0.10) 22%, rgba(16,185,129,0.08) 54%, transparent 100%)',
        top: '34%', height: '30%', duration: 35, delay: 11,
    },
    {
        gradient: 'linear-gradient(118deg, transparent 0%, rgba(6,182,212,0.09) 20%, rgba(251,191,36,0.07) 52%, transparent 100%)',
        top: '60%', height: '36%', duration: 42, delay: 22,
    },
] as const;

const GEO_SHAPES = [
    { type: 'hex',     x: 11,  y: 16,  size: 28, delay: 0,  duration: 16, opacity: 0.07, color: 'rgba(16,185,129,0.65)'  },
    { type: 'diamond', x: 79,  y: 10,  size: 20, delay: 5,  duration: 22, opacity: 0.06, color: 'rgba(6,182,212,0.65)'   },
    { type: 'hex',     x: 89,  y: 64,  size: 36, delay: 8,  duration: 19, opacity: 0.05, color: 'rgba(139,92,246,0.65)'  },
    { type: 'diamond', x: 24,  y: 78,  size: 24, delay: 12, duration: 27, opacity: 0.06, color: 'rgba(251,191,36,0.55)'  },
    { type: 'hex',     x: 55,  y: 89,  size: 18, delay: 3,  duration: 21, opacity: 0.05, color: 'rgba(16,185,129,0.55)'  },
    { type: 'diamond', x: 43,  y: 20,  size: 14, delay: 16, duration: 31, opacity: 0.04, color: 'rgba(6,182,212,0.50)'   },
] as const;

// Per-scene deep-hued base gradients — these replace the static steel-blue base
// so the ENTIRE backdrop shifts colour dramatically when the scene changes.
const SCENE_BASE: Record<RitualSceneId, string> = {
    flow:   'linear-gradient(160deg, #0a2218 0%, #071812 40%, #040c08 100%)',  // deep forest
    build:  'linear-gradient(160deg, #062038 0%, #041628 40%, #020e1e 100%)',  // deep ocean
    lounge: 'linear-gradient(160deg, #2c140a 0%, #1e0e06 40%, #100804 100%)', // deep ember
    night:  'linear-gradient(160deg, #10102e 0%, #0c0a22 40%, #060416 100%)', // deep void
};

// Per-scene colour overlays painted on top of the base via screen blend.
// Opacities bumped so they read clearly on the deeper, darker bases.
const SCENE_TINT: Record<RitualSceneId, string> = {
    // Flow: fresh emerald + teal
    flow: [
        'radial-gradient(ellipse 120% 85% at 15% 20%, rgba(16,185,129,0.72) 0%, transparent 62%)',
        'radial-gradient(ellipse 80% 65% at 80% 72%, rgba(34,211,238,0.50) 0%, transparent 58%)',
        'radial-gradient(ellipse 55% 45% at 55% 98%, rgba(6,182,212,0.28) 0%, transparent 52%)',
    ].join(', '),
    // Build: sharp sky-blue + amber
    build: [
        'radial-gradient(ellipse 120% 85% at 18% 18%, rgba(14,165,233,0.78) 0%, transparent 60%)',
        'radial-gradient(ellipse 80% 65% at 82% 65%, rgba(251,191,36,0.52) 0%, transparent 58%)',
        'radial-gradient(ellipse 60% 48% at 50% 100%, rgba(56,189,248,0.34) 0%, transparent 52%)',
    ].join(', '),
    // Lounge: warm amber + rose
    lounge: [
        'radial-gradient(ellipse 120% 85% at 22% 28%, rgba(251,146,60,0.76) 0%, transparent 60%)',
        'radial-gradient(ellipse 80% 65% at 80% 62%, rgba(244,114,182,0.58) 0%, transparent 58%)',
        'radial-gradient(ellipse 60% 48% at 45% 98%, rgba(239,68,68,0.32) 0%, transparent 52%)',
    ].join(', '),
    // Night: deep indigo + violet
    night: [
        'radial-gradient(ellipse 120% 85% at 18% 25%, rgba(99,102,241,0.80) 0%, transparent 60%)',
        'radial-gradient(ellipse 80% 65% at 82% 75%, rgba(139,92,246,0.60) 0%, transparent 58%)',
        'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(30,27,75,0.40) 0%, transparent 62%)',
    ].join(', '),
};

export const MoraLivingBackground: React.FC = () => {
    const orbState = useOrbStore((s) => s.orbState);
    const viewLevel = useNavStore((s) => s.viewLevel);
    const scene = useActiveRitualScene();
    const [mounted, setMounted] = React.useState(false);
    const prefersReducedMotion = useReducedMotion();
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        typeof document === 'undefined' ? true : !document.hidden
    );

    React.useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            setIsDocumentVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const isThinking = orbState === 'thinking';
    const isLayerFocusView = viewLevel === 'department' || viewLevel === 'space' || viewLevel === 'folder';
    const animateAmbient =
        !prefersReducedMotion &&
        isDocumentVisible &&
        (isThinking || orbState === 'focus' || orbState === 'insight' || orbState === 'learning');

    const stars = useMemo(() => {
        if (!mounted) return [];
        const starCount = isLayerFocusView ? 90 : 180;
        return Array.from({ length: starCount }).map((_, i) => {
            const ci = i % 5;
            const size = sr(i * 1.3) * 2.8 + 0.5;
            return {
                id: i,
                x: sr(i * 2.1) * 100,
                y: sr(i * 4.5) * 100,
                size,
                color: STAR_COLORS[ci],
                glow: STAR_GLOWS[ci],
                delay: sr(i * 5.9) * 6,
                duration: 2.5 + sr(i * 7.3) * 3.5,
                opacity: 0.38 + sr(i * 11.1) * 0.52,
            };
        });
    }, [mounted, isLayerFocusView]);

    const threads = useMemo(() => {
        if (!mounted) return [];
        const threadCount = isLayerFocusView ? 0 : 6;
        return Array.from({ length: threadCount }).map((_, i) => ({
            id: i,
            delay: i * 1.5,
            duration: 18 + sr(i * 6.7) * 20,
            y: 4 + sr(i * 3.3) * 92,
            opacity: 0.04 + sr(i * 9.1) * 0.06,
            color: THREAD_COLORS[i % 5],
            width: 24 + sr(i * 4.4) * 20,
        }));
    }, [mounted, isLayerFocusView]);

    const auroraOpacityTrack = isLayerFocusView
        ? [0, 0, 0, 0, 0] // Paused/hidden state
        : [0.45, 1, 0.65, 1, 0.45];
    const auroraXTrack = isLayerFocusView
        ? ['-4%', '-4%', '-4%', '-4%', '-4%']
        : ['-6%', '4%', '-2%', '5%', '-6%'];
    const auroraScaleTrack = isLayerFocusView
        ? [1, 1, 1, 1, 1] // Paused scale
        : [0.90, 1.08, 0.97, 1.05, 0.90];

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">

            {/* Fallback base — near-black so nothing is ever white */}
            <div className="absolute inset-0 bg-[#05080e]" />

            {/* Scene base — cross-fades the entire deep backdrop colour */}
            {RITUAL_SCENE_ORDER.map((sceneId) => (
                <motion.div
                    key={`base-${sceneId}`}
                    className="absolute inset-0"
                    animate={{ opacity: scene.id === sceneId ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    style={{ background: SCENE_BASE[sceneId] }}
                />
            ))}

            {/* Rich nebula — tinted by current scene accent for depth */}
            <motion.div
                animate={{
                    opacity: isThinking ? 0.55 : 0.42,
                    scale:   isThinking ? 1.06 : 1.0,
                }}
                transition={{ duration: 4, ease: 'easeInOut' }}
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse 90% 70% at 18% 28%, ${scene.accent} 0%, transparent 60%),
                        radial-gradient(ellipse 70% 55% at 82% 72%, ${scene.aura} 0%, transparent 55%),
                        radial-gradient(ellipse 55% 55% at 50% 50%, rgba(212,175,55,0.18) 0%, transparent 45%),
                        radial-gradient(ellipse 50% 60% at 75% 15%, rgba(139,92,246,0.22) 0%, transparent 50%),
                        radial-gradient(ellipse 45% 45% at 10% 80%, rgba(244,63,94,0.14) 0%, transparent 48%),
                        radial-gradient(ellipse 40% 50% at 93% 40%, rgba(251,191,36,0.14) 0%, transparent 45%)
                    `,
                    mixBlendMode: 'screen',
                }}
            />

            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(1400px 520px at 50% 46%, rgba(34,211,238,0.08) 0%, transparent 62%),
                        radial-gradient(900px 340px at 50% 58%, rgba(16,185,129,0.07) 0%, transparent 58%),
                        linear-gradient(112deg, transparent 0%, rgba(255,255,255,0.03) 46%, transparent 58%)
                    `,
                    mixBlendMode: 'screen',
                }}
            />

            {/* Scene tint overlays — opacity cross-fades between scenes */}
            {RITUAL_SCENE_ORDER.map((sceneId) => (
                <motion.div
                    key={sceneId}
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: scene.id === sceneId ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' as const }}
                    style={{ background: SCENE_TINT[sceneId], mixBlendMode: 'screen' }}
                />
            ))}

            {/* Night-mode darkness layer — adds depth without killing star visibility */}
            <motion.div
                className="absolute inset-0 pointer-events-none bg-black"
                animate={{ opacity: scene.id === 'night' ? 0.28 : 0 }}
                transition={{ duration: 0.45, ease: 'easeInOut' as const }}
            />

            {/* ── AURORA CURTAIN (Contextual & Trimmed to 2 bands) ── */}
            {AURORA_BANDS.slice(0, 2).map((band, i) => (
                <motion.div
                    key={i}
                    className="absolute w-full"
                    style={{ top: band.top, height: band.height, background: band.gradient }}
                    animate={
                        isLayerFocusView
                            ? { opacity: 0, x: 0, scaleX: 1 } // Stop animating entirely when occluded
                            : animateAmbient
                                ? { opacity: auroraOpacityTrack, x: auroraXTrack, scaleX: auroraScaleTrack }
                                : { opacity: 0.55, x: 0, scaleX: 1 }
                    }
                    transition={{
                        duration: band.duration,
                        repeat: isLayerFocusView || !animateAmbient ? 0 : Infinity,
                        delay: band.delay,
                        ease: 'easeInOut',
                        times: isLayerFocusView || !animateAmbient ? undefined : [0, 0.25, 0.5, 0.75, 1],
                    }}
                />
            ))}

            {/* ── STATIC STARS (reduced count for perf) ── */}
            <div className="absolute inset-0">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left:            `${star.x}%`,
                            top:             `${star.y}%`,
                            width:           star.size,
                            height:          star.size,
                            backgroundColor: star.color,
                            boxShadow:       `0 0 ${star.size * 2}px ${star.size * 0.8}px ${star.glow}`,
                            opacity:         star.opacity * (isLayerFocusView ? 0.62 : 1.08),
                        }}
                    />
                ))}
            </div>

            {/* ── FLOATING SACRED GEOMETRY ── */}
            {mounted && !isLayerFocusView && GEO_SHAPES.slice(0, 3).map((shape, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{ left: `${shape.x}%`, top: `${shape.y}%` }}
                    animate={animateAmbient ? {
                        y:       [0, -22, -9, -26, 0],
                        x:       [0, 11, -6, 13, 0],
                        rotate:  shape.type === 'hex' ? [0, 18, 6, 22, 0] : [45, 78, 58, 74, 45],
                        opacity: [shape.opacity * 0.45, shape.opacity, shape.opacity * 0.70, shape.opacity, shape.opacity * 0.45],
                    } : {
                        y: 0,
                        x: 0,
                        rotate: shape.type === 'hex' ? 0 : 45,
                        opacity: shape.opacity * 0.72,
                    }}
                    transition={{
                        duration: shape.duration,
                        repeat:   animateAmbient ? Infinity : 0,
                        delay:    shape.delay,
                        ease:     'easeInOut',
                        times:    animateAmbient ? [0, 0.25, 0.5, 0.75, 1] : undefined,
                    }}
                >
                    {shape.type === 'hex' ? (
                        <svg width={shape.size} height={shape.size} viewBox="0 0 24 24" fill="none">
                            <polygon
                                points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"
                                stroke={shape.color} strokeWidth="1" fill="none"
                            />
                            <polygon
                                points="12,6 17,9 17,15 12,18 7,15 7,9"
                                stroke={shape.color} strokeWidth="0.5"
                                fill={shape.color} fillOpacity="0.09"
                            />
                        </svg>
                    ) : (
                        <svg width={shape.size} height={shape.size} viewBox="0 0 24 24" fill="none">
                            <polygon
                                points="12,2 22,12 12,22 2,12"
                                stroke={shape.color} strokeWidth="1"
                                fill={shape.color} fillOpacity="0.07"
                            />
                        </svg>
                    )}
                </motion.div>
            ))}

            {/* ── NEURAL THREADS (Conscious Stream) ── */}
            {/* When animateAmbient, run Framer infinite loops. When idle, render plain */}
            {/* static divs — eliminates 6 Framer rAF timelines from Universe idle state. */}
            <div className="absolute inset-0">
                {threads.map((t) => {
                    const colorClass =
                        t.color === 'cyan-400'   ? 'via-cyan-400/45'
                      : t.color === 'amber-400'  ? 'via-amber-400/40'
                      : t.color === 'violet-400' ? 'via-violet-400/40'
                      : t.color === 'rose-400'   ? 'via-rose-400/35'
                      : 'via-emerald-400/50';
                    const baseClass = `absolute h-[1px] bg-gradient-to-r from-transparent ${colorClass} to-transparent blur-[0.5px]`;

                    if (!animateAmbient) {
                        return (
                            <div
                                key={t.id}
                                style={{ top: `${t.y}%`, width: `${t.width}%`, opacity: t.opacity * 0.6 }}
                                className={baseClass}
                            />
                        );
                    }
                    return (
                        <motion.div
                            key={t.id}
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: '210%', opacity: [0, t.opacity, t.opacity * 1.5, t.opacity, 0] }}
                            transition={{
                                duration: isThinking ? t.duration * 0.55 : t.duration,
                                repeat:   Infinity,
                                delay:    t.delay,
                                ease:     'linear',
                            }}
                            style={{ top: `${t.y}%`, width: `${t.width}%` }}
                            className={baseClass}
                        />
                    );
                })}
            </div>

            {/* ── SCANLINE SWEEP ── */}
            {!isLayerFocusView && (
                <motion.div
                    className="absolute left-0 w-full pointer-events-none"
                    style={{
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.09) 38%, rgba(6,182,212,0.07) 62%, transparent 100%)',
                    }}
                    animate={animateAmbient ? { top: ['-2px', '100vh'], opacity: [0.5, 0.9, 0.5] } : { top: '-2px', opacity: 0.16 }}
                    transition={animateAmbient ? { duration: 14, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
                />
            )}

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_42%,_rgba(0,0,0,0.14)_100%)]" />

            {/* Subtle Grid */}
            <div
                className="absolute inset-0 opacity-[0.014]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                }}
            />
        </div>
    );
};
