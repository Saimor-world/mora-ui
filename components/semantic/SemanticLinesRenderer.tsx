import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticLine } from '@/lib/hooks/useSemanticConstellation';

interface SemanticLinesRendererProps {
    lines: SemanticLine[];
}

/**
 * SEMANTIC LINES RENDERER - FILIGREE THREADS
 *
 * Goals:
 * - Clean SVG (no invalid tokens)
 * - Subtle but readable connections
 * - Only render when coordinates are valid
 */
export const SemanticLinesRenderer: React.FC<SemanticLinesRendererProps> = ({ lines }) => {
    if (!lines || lines.length === 0) return null;

    const safeLines = lines.filter((line) => (
        Number.isFinite(line.from?.x) &&
        Number.isFinite(line.from?.y) &&
        Number.isFinite(line.to?.x) &&
        Number.isFinite(line.to?.y)
    ));

    if (safeLines.length === 0) return null;

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-0 overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            <defs>
                <filter id="semanticLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <AnimatePresence>
                {safeLines.map((line) => {
                    const dx = line.to.x - line.from.x;
                    const dy = line.to.y - line.from.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    const curvature = Math.min(0.25, 0.08 + distance * 0.0012);
                    const angle = Math.atan2(dy, dx);
                    const perpAngle = angle + Math.PI / 2;
                    const midX = (line.from.x + line.to.x) / 2;
                    const midY = (line.from.y + line.to.y) / 2;
                    const ctrlX = midX + Math.cos(perpAngle) * curvature * distance;
                    const ctrlY = midY + Math.sin(perpAngle) * curvature * distance;

                    const path = `M ${line.from.x} ${line.from.y} Q ${ctrlX} ${ctrlY} ${line.to.x} ${line.to.y}`;
                    const opacity = Math.max(0.2, Math.min(0.7, 0.15 + line.score * 0.6));
                    const strokeWidth = 0.5 + line.score * 0.7;

                    return (
                        <motion.path
                            key={line.id}
                            d={path}
                            stroke="rgba(16, 185, 129, 0.7)"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="none"
                            filter="url(#semanticLineGlow)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity }}
                            exit={{ opacity: 0, transition: { duration: 0.2 } }}
                            transition={{
                                pathLength: { duration: 0.45, ease: 'easeOut' },
                                opacity: { duration: 0.3 }
                            }}
                        />
                    );
                })}
            </AnimatePresence>
        </svg>
    );
};

export default SemanticLinesRenderer;
