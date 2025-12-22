import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticLine } from '@/lib/hooks/useSemanticConstellation';

interface SemanticLinesRendererProps {
    lines: SemanticLine[];
}

/**
 * SEMANTIC LINES RENDERER - PREMIUM VISUAL UPGRADE
 * 
 * Features:
 * - Ethereal glow effect via SVG filters
 * - Gradient strokes (Emerald → Gold)
 * - Pulsing animation for high-score connections
 * - "Light Thread" aesthetic - filigree and delicate
 */
export const SemanticLinesRenderer: React.FC<SemanticLinesRendererProps> = ({ lines }) => {
    return (
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
            {/* PREMIUM GLOW DEFINITIONS */}
            <defs>
                {/* Soft Glow Filter */}
                <filter id="semanticGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Intense Glow for High-Score Lines */}
                <filter id="semanticGlowIntense" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* Gradient: Emerald to Gold (Knowledge Flow) */}
                <linearGradient id="constellationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.9" />
                </linearGradient>

                {/* Pure Light Gradient */}
                <linearGradient id="lightThreadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
            </defs>

            <AnimatePresence>
                {lines.map((line) => {
                    const isHighScore = line.score > 0.6;
                    const baseOpacity = Math.max(0.1, Math.min(0.5, line.score * 0.6));

                    return (
                        <g key={line.id}>
                            {/* Background Glow Layer (Softer, Wider) */}
                            <motion.line
                                x1={line.from.x}
                                y1={line.from.y}
                                x2={line.to.x}
                                y2={line.to.y}
                                stroke="url(#constellationGradient)"
                                strokeWidth={isHighScore ? 4 : 2}
                                strokeLinecap="round"
                                filter={isHighScore ? "url(#semanticGlowIntense)" : "url(#semanticGlow)"}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                    opacity: baseOpacity * 0.5
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 0.6,
                                    ease: "easeOut"
                                }}
                            />

                            {/* Core Light Thread (Sharp, Bright) */}
                            <motion.line
                                x1={line.from.x}
                                y1={line.from.y}
                                x2={line.to.x}
                                y2={line.to.y}
                                stroke={isHighScore ? "#FFFFFF" : "url(#lightThreadGradient)"}
                                strokeWidth={isHighScore ? 1.2 : 0.8}
                                strokeLinecap="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                    opacity: isHighScore ? [0.4, 0.8, 0.4] : baseOpacity
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: isHighScore ? 2 : 0.5,
                                    repeat: isHighScore ? Infinity : 0,
                                    ease: "easeInOut"
                                }}
                            />
                        </g>
                    );
                })}
            </AnimatePresence>
        </svg>
    );
};
