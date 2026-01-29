import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticLine } from '@/lib/hooks/useSemanticConstellation';

interface SemanticLinesRendererProps {
    lines: SemanticLine[];
}

/**
 * SEMANTIC LINES RENDERER - SUBTLE LIGHT THREADS
 *
 * Design Philosophy:
 * - Hair-thin filigree connections (not bulky cables!)
 * - Only visible when meaningful
 * - Fade in/out gracefully
 * - "Spider silk in moonlight" aesthetic
 */
export const SemanticLinesRenderer: React.FC<SemanticLinesRendererProps> = ({ lines }) => {
    // Don't render if no lines
    if (!lines || lines.length === 0) return null;

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-0 overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            <defs>
                {/* Subtle glow - very soft */}
                <filter id="hairlineGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="0.3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <AnimatePresence>
                {lines.filter(line => (
                    Number.isFinite(line.from?.x) &&
                    Number.isFinite(line.from?.y) &&
                    Number.isFinite(line.to?.x) &&
                    Number.isFinite(line.to?.y)
                )).map((line) => {
                    // Score determines visibility (0.3 = barely visible, 1.0 = clear)
                    const opacity = Math.max(0.25, Math.min(0.75, line.score * 0.7));

                    // Simple curved path
                    const dx = line.to.x - line.from.x;
                    const dy = line.to.y - line.from.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Gentle curve
                    const curvature = 0.1 + (distance * 0.001);
                    const angle = Math.atan2(dy, dx);
                    const perpAngle = angle + Math.PI / 2;

                    const midX = (line.from.x + line.to.x) / 2;
                    const midY = (line.from.y + line.to.y) / 2;
                    const ctrlX = midX + Math.cos(perpAngle) * curvature * distance;
                    const ctrlY = midY + Math.sin(perpAngle) * curvature * distance;

                    const path = `M ${line.from.x} ${line.from.y} Q ${ctrlX} ${ctrlY} ${line.to.x} ${line.to.y}`;

                    return (
                        <motion.path
                            key={line.id}
                            d={path}
                            stroke="rgba(255, 255, 255, 0.4)"
                            strokeWidth={0.35}  // Visible but still delicate
                            strokeLinecap="round"
                            fill="none"
                            filter="url(#hairlineGlow)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: opacity
                            }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.2 }
                            }}
                            transition={{
                                pathLength: { duration: 0.4, ease: "easeOut" },
                                opacity: { duration: 0.3 }
                            }}
                        />
                    );
                })}
            </AnimatePresence>
        </svg>
    );
};
