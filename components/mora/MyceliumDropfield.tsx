"use client";

import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Upload } from 'lucide-react';

type DropVisualFile = {
    id: string;
    name: string;
    type: string;
    size: number;
};

type MyceliumDropfieldProps = {
    active: boolean;
    files: DropVisualFile[];
    onComplete?: () => void;
};

const MAX_RENDERED_PARTICLES = 12;

const hueForType = (type: string) => {
    if (type.startsWith('image/')) return 'rgba(34, 211, 238, 0.85)';
    if (type.includes('pdf') || type.includes('document')) return 'rgba(251, 191, 36, 0.82)';
    return 'rgba(52, 211, 153, 0.82)';
};

export const MyceliumDropfield: React.FC<MyceliumDropfieldProps> = ({ active, files, onComplete }) => {
    const prefersReducedMotion = useReducedMotion();

    const particles = useMemo(() => {
        return files.slice(0, MAX_RENDERED_PARTICLES).map((file, index) => {
            const column = index % 4;
            const row = Math.floor(index / 4);
            const x = 18 + column * 16 + (row % 2 === 0 ? 0 : 4);
            const y = 28 + row * 10;
            const scale = 0.8 + (index % 3) * 0.12;
            return {
                ...file,
                x,
                y,
                scale,
                color: hueForType(file.type),
            };
        });
    }, [files]);

    useEffect(() => {
        if (!active) return;
        const timeout = window.setTimeout(() => {
            onComplete?.();
        }, prefersReducedMotion ? 900 : 2100);
        return () => window.clearTimeout(timeout);
    }, [active, onComplete, prefersReducedMotion]);

    const extraCount = Math.max(0, files.length - MAX_RENDERED_PARTICLES);

    return (
        <AnimatePresence>
            {active && files.length > 0 && (
                <motion.div
                    className="fixed inset-0 z-[945] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0.15 : 0.35 }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(12,40,36,0.18),rgba(0,0,0,0.55)_72%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(720px_280px_at_50%_62%,rgba(16,185,129,0.12),transparent_72%)]" />

                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative h-[76vh] w-[82vw] max-w-[1200px] overflow-hidden rounded-[36px] border border-emerald-400/12 bg-black/20 backdrop-blur-[2px]">
                            <motion.div
                                className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                initial={{ opacity: 0.12, scale: 0.9 }}
                                animate={{ opacity: 0.34, scale: 1.08 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0.2 : 1.4, ease: 'easeOut' }}
                                style={{
                                    background: 'radial-gradient(circle, rgba(16,185,129,0.34) 0%, rgba(34,211,238,0.16) 32%, rgba(0,0,0,0) 72%)',
                                    filter: 'blur(12px)'
                                }}
                            />

                            {particles.map((particle, index) => (
                                <motion.div
                                    key={particle.id}
                                    className="absolute"
                                    initial={{
                                        left: `${particle.x}%`,
                                        top: `${particle.y}%`,
                                        opacity: 0,
                                        scale: 0.3,
                                    }}
                                    animate={prefersReducedMotion ? {
                                        left: '50%',
                                        top: '54%',
                                        opacity: 0.75,
                                        scale: 0.82,
                                    } : {
                                        left: ['50%', `${particle.x}%`, '50%'],
                                        top: ['72%', `${particle.y}%`, '54%'],
                                        opacity: [0, 0.95, 0.78],
                                        scale: [0.25, particle.scale, 0.72],
                                    }}
                                    exit={{ opacity: 0, scale: 0.35 }}
                                    transition={{
                                        duration: prefersReducedMotion ? 0.45 : 1.8,
                                        delay: prefersReducedMotion ? 0 : index * 0.05,
                                        ease: 'easeInOut'
                                    }}
                                >
                                    <div
                                        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 shadow-[0_0_40px_rgba(16,185,129,0.18)]"
                                        style={{
                                            background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.42), ${particle.color} 38%, rgba(4,18,18,0.94) 100%)`
                                        }}
                                    >
                                        <div className="absolute inset-[5px] rounded-full border border-white/12 bg-black/18" />
                                        <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 22px ${particle.color}` }} />
                                        <div className="relative h-2.5 w-2.5 rounded-full bg-white/80" />
                                    </div>
                                </motion.div>
                            ))}

                            <div className="absolute inset-x-0 bottom-10 flex justify-center px-6">
                                <motion.div
                                    className="rounded-[28px] border border-emerald-400/20 bg-black/55 px-6 py-4 backdrop-blur-xl shadow-[0_0_60px_rgba(16,185,129,0.12)]"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    transition={{ duration: prefersReducedMotion ? 0.15 : 0.4, delay: prefersReducedMotion ? 0 : 0.1 }}
                                >
                                    <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.28em] text-emerald-300/70 font-bold">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>Mycelium Intake</span>
                                    </div>
                                    <div className="mt-3 text-center text-2xl font-light tracking-[0.08em] text-white">
                                        {files.length === 1 ? '1 Datei aufgenommen' : `${files.length} Dateien aufgenommen`}
                                    </div>
                                    <p className="mt-2 max-w-xl text-center text-sm leading-relaxed text-white/68">
                                        Mora sammelt die Rohdateien, bereitet Routing-Vorschläge vor und übergibt sie an den Review-Stapel.
                                    </p>
                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-100/80">
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>Batch wird in Mycelium Intake überführt</span>
                                        {extraCount > 0 && (
                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/65">
                                                +{extraCount} weitere
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MyceliumDropfield;
