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
        return Array.from({ length: 200 }).map((_, i) => ({
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
        return Array.from({ length: 6 }).map((_, i) => ({
            id: i,
            delay: i * 3,
            duration: 25 + Math.random() * 15,
            y: 15 + Math.random() * 70,
            opacity: 0.04 + Math.random() * 0.04
        }));
    }, [mounted]);

    const isThinking = orbState === 'thinking';

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Base - VIEL HELLER für Boomer-Freundlichkeit! */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#142e28] via-[#0e241e] to-[#081815]" />

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
                        radial-gradient(ellipse 80% 60% at 20% 30%, rgba(16, 185, 129, 0.25) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 50% at 80% 70%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
                        radial-gradient(ellipse 50% 50% at 50% 50%, rgba(212, 175, 55, 0.12) 0%, transparent 40%)
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
                            backgroundColor: star.id % 3 === 0
                                ? 'rgba(16, 185, 129, 0.9)' // Emerald
                                : star.id % 3 === 1
                                    ? 'rgba(255, 255, 255, 0.8)' // White
                                    : 'rgba(6, 182, 212, 0.7)', // Cyan
                            boxShadow: `0 0 ${star.size * 2}px ${star.size}px rgba(16, 185, 129, 0.3)`
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
                        className="absolute h-[1px] w-1/3 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent blur-[1px]"
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
