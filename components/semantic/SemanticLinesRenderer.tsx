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
        <svg
            className="absolute inset-0 pointer-events-none z-0 overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
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

                {/* Gradient: Subtle white/emerald - very faint */}
                <linearGradient id="constellationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
                </linearGradient>

                {/* Pure Light Gradient - very subtle */}
                <linearGradient id="lightThreadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
                </linearGradient>
            </defs>

            <AnimatePresence>
                {lines.map((line) => {
                    const isHighScore = line.score > 0.8;
                    const baseOpacity = Math.max(0.03, Math.min(0.15, line.score * 0.2));

                    // 🍄 MYCELIUM UPGRADE: Curved bezier paths (not straight lines!)
                    const dx = line.to.x - line.from.x;
                    const dy = line.to.y - line.from.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Control points for smooth curve (perpendicular to connection)
                    const curvature = 0.15 + (distance * 0.002); // Subtle curve
                    const angle = Math.atan2(dy, dx);
                    const perpAngle = angle + Math.PI / 2;

                    // Offset control point perpendicular to line
                    const midX = (line.from.x + line.to.x) / 2;
                    const midY = (line.from.y + line.to.y) / 2;
                    const ctrlX = midX + Math.cos(perpAngle) * curvature * distance;
                    const ctrlY = midY + Math.sin(perpAngle) * curvature * distance;

                    // Organic bezier path (not straight!)
                    const myceliumPath = `M ${line.from.x} ${line.from.y} Q ${ctrlX} ${ctrlY} ${line.to.x} ${line.to.y}`;

                    return (
                        <g key={line.id}>
                            {/* Background Glow Layer (Softer, Wider) */}
                            <motion.path
                                d={myceliumPath}
                                stroke="url(#constellationGradient)"
                                strokeWidth={isHighScore ? 1.5 : 0.5}
                                strokeLinecap="round"
                                fill="none"
                                filter="url(#semanticGlow)"
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

                            {/* Core Light Thread (Sharp, Bright) - PULSING! */}
                            <motion.path
                                d={myceliumPath}
                                stroke="url(#lightThreadGradient)"
                                strokeWidth={isHighScore ? 0.6 : 0.3}
                                strokeLinecap="round"
                                fill="none"
                                strokeDasharray={isHighScore ? "5 5" : undefined}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{
                                    pathLength: 1,
                                    opacity: isHighScore ? [0.4, 0.8, 0.4] : baseOpacity,
                                    strokeDashoffset: isHighScore ? [0, -10] : undefined
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    pathLength: { duration: 0.5 },
                                    opacity: {
                                        duration: isHighScore ? 2 : 0.5,
                                        repeat: isHighScore ? Infinity : 0,
                                        ease: "easeInOut"
                                    },
                                    strokeDashoffset: {
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }
                                }}
                            />
                        </g>
                    );
                })}
            </AnimatePresence>
        </svg>
    );
};
