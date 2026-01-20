"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpeakEventDetail {
    targetX?: number;
    targetY?: number;
}

/**
 * OrbMessageEffect
 * 
 * Visualizes MÔRA's voice as a particle traveling from the Orb (bottom-right)
 * to the chat interface (or target position).
 */
export const OrbMessageEffect: React.FC = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [target, setTarget] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    useEffect(() => {
        const handleSpeak = (e: CustomEvent<SpeakEventDetail>) => {
            // Update target if provided, otherwise default to center/chat area
            if (e.detail?.targetX && e.detail?.targetY) {
                setTarget({ x: e.detail.targetX, y: e.detail.targetY });
            } else {
                // Default to roughly where the TeamPane chat usually is (center-leftish if docked, or center screen)
                // For now, center screen is a safe bet for "general attention"
                setTarget({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            }

            setIsSpeaking(true);

            // Reset after animation
            setTimeout(() => {
                setIsSpeaking(false);
            }, 1000);
        };

        window.addEventListener('mora:speak', handleSpeak as EventListener);
        return () => window.removeEventListener('mora:speak', handleSpeak as EventListener);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            <AnimatePresence>
                {isSpeaking && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            x: window.innerWidth - 100, // Orb position approx
                            y: window.innerHeight - 100,
                            scale: 0.5
                        }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            x: target.x,
                            y: target.y,
                            scale: [1, 2, 0.5],
                        }}
                        transition={{
                            duration: 0.8,
                            ease: "circOut",
                            times: [0, 0.1, 0.8, 1]
                        }}
                        className="absolute w-4 h-4"
                    >
                        {/* Core Particle */}
                        <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[2px] shadow-[0_0_20px_rgba(52,211,153,0.8)]" />

                        {/* Trail/Comet Head */}
                        <div className="absolute inset-[-4px] bg-white rounded-full mix-blend-overlay opacity-80 blur-[1px]" />

                        {/* Trailing Tail (CSS animation or SVG could go here for more detail) */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1.5 }}
                            className="absolute inset-0 bg-mora-gold rounded-full opacity-20 blur-md"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
