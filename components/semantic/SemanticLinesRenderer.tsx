import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticLine } from '@/lib/hooks/useSemanticConstellation';

interface SemanticLinesRendererProps {
    lines: SemanticLine[];
}

export const SemanticLinesRenderer: React.FC<SemanticLinesRendererProps> = ({ lines }) => {
    return (
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
            <AnimatePresence>
                {lines.map((line) => (
                    <motion.line
                        key={line.id}
                        x1={line.from.x}
                        y1={line.from.y}
                        x2={line.to.x}
                        y2={line.to.y}
                        stroke="white"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: 1,
                            opacity: Math.max(0.15, Math.min(0.6, line.score)) // Clamp opacity
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 0.4,
                            ease: "easeOut"
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Optional: Glow effect definitions could go here if we wanted fancier lines */}
        </svg>
    );
};
