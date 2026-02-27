"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useMoraStore } from "@/lib/store/moraState";

/**
 * MoraLivingBackground - Premium Animated Starfield
 * 
 * Features:
 * - Animated twinkling emerald stars
 * - Lighter green nebula gradient (not so dark)
 * - Subtle breathing aurora effect
 * - Neural threads for the conscious stream
 * - Performance optimized with CSS animations
 */
export const MoraLivingBackground: React.FC = () => {
    const orbState = useMoraStore((s) => s.orbState);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Stars - MORE STARS! Much brighter universe (user request)
    const stars = useMemo(() => {
        if (!mounted) return [];
        return Array.from({ length: 380 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 0.5, // Bigger stars
            opacity: Math.random() * 0.8 + 0.4, // Brighter
            delay: Math.random() * 5,
            duration: 2 + Math.random() * 3
        }));
    }, [mounted]);

    // Neural threads
    const threads = useMemo(() => {
        if (!mounted) return [];
        return Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            delay: i * 1.8,
            duration: 20 + Math.random() * 18,
            y: 8 + Math.random() * 84,
            opacity: 0.05 + Math.random() * 0.06,
            color: i % 4 === 0 ? 'emerald-400' : i % 4 === 1 ? 'cyan-400' : i % 4 === 2 ? 'amber-400' : 'violet-400'
        }));
    }, [mounted]);

    const isThinking = orbState === 'thinking';

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Base - VIEL HELLER für Boomer-Freundlichkeit! */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a3830] via-[#0f2922] to-[#091c18]" />

            {/* Nebula Glow - BRIGHTER */}
            <motion.div
                animate={{
                    opacity: isThinking ? 0.35 : 0.25, // Much brighter
                    scale: isThinking ? 1.05 : 1.0,
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-full h-full"
                style={{
                    background: `
                        radial-gradient(ellipse 90% 70% at 20% 30%, rgba(16, 185, 129, 0.32) 0%, transparent 60%),
                        radial-gradient(ellipse 70% 55% at 80% 70%, rgba(6, 182, 212, 0.22) 0%, transparent 55%),
                        radial-gradient(ellipse 55% 55% at 50% 50%, rgba(212, 175, 55, 0.18) 0%, transparent 45%),
                        radial-gradient(ellipse 50% 60% at 78% 18%, rgba(139, 92, 246, 0.20) 0%, transparent 50%),
                        radial-gradient(ellipse 45% 45% at 12% 78%, rgba(244, 63, 94, 0.13) 0%, transparent 48%)
                    `
                }}
            />

            {/* Animated Twinkling Stars */}
            <div className="absolute inset-0">
                {stars.map((star) => (
                    <motion.div
                        key={star.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: star.size,
                            height: star.size,
                            backgroundColor: star.id % 5 === 0
                                ? 'rgba(16, 185, 129, 0.9)'  // Emerald
                                : star.id % 5 === 1
                                    ? 'rgba(255, 255, 255, 0.85)' // White
                                    : star.id % 5 === 2
                                        ? 'rgba(6, 182, 212, 0.80)'  // Cyan
                                        : star.id % 5 === 3
                                            ? 'rgba(251, 191, 36, 0.75)'  // Gold
                                            : 'rgba(167, 139, 250, 0.70)', // Violet
                            boxShadow: star.id % 5 === 3
                                ? `0 0 ${star.size * 2}px ${star.size}px rgba(251, 191, 36, 0.35)`
                                : star.id % 5 === 4
                                    ? `0 0 ${star.size * 2}px ${star.size}px rgba(167, 139, 250, 0.30)`
                                    : `0 0 ${star.size * 2}px ${star.size}px rgba(16, 185, 129, 0.30)`
                        }}
                        animate={{
                            opacity: [star.opacity * 0.4, star.opacity, star.opacity * 0.4],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: star.duration,
                            repeat: Infinity,
                            delay: star.delay,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Moving Neural Threads (The Conscious Stream) */}
            <div className="absolute inset-0">
                {threads.map((thread) => (
                    <motion.div
                        key={thread.id}
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{
                            x: "200%",
                            opacity: [0, thread.opacity, 0],
                        }}
                        transition={{
                            duration: isThinking ? thread.duration * 0.6 : thread.duration,
                            repeat: Infinity,
                            delay: thread.delay,
                            ease: "linear",
                        }}
                        style={{ top: `${thread.y}%` }}
                        className={`absolute h-[1px] w-1/3 bg-gradient-to-r from-transparent ${
                              thread.color === 'cyan-400' ? 'via-cyan-400/40'
                              : thread.color === 'amber-400' ? 'via-amber-400/35'
                              : thread.color === 'violet-400' ? 'via-violet-400/35'
                              : 'via-emerald-400/45'
                          } to-transparent blur-[1px]`}
                    />
                ))}
            </div>

            {/* Soft Vignette (almost invisible now) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_50%,_rgba(0,0,0,0.15)_100%)]" />

            {/* Subtle Grid Lines (very faint) */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px'
                }}
            />
        </div>
    );
};
