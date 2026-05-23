"use client";

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface NeuralGridProps {
    active?: boolean;
    state?: string;
}

/**
 * NEURAL GRID - Tesla/SpaceX Style Decorative Overlay
 * 
 * Provides a subtle technological "texture" to the background.
 * Reacts to the AI's pulse state.
 */
export const NeuralGrid: React.FC<NeuralGridProps> = ({
    active = true,
    state = 'idle'
}) => {
    const prefersReducedMotion = useReducedMotion();
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        typeof document === 'undefined' ? true : !document.hidden
    );
    const animateGrid =
        active &&
        !prefersReducedMotion &&
        isDocumentVisible &&
        (state === 'thinking' || state === 'focus' || state === 'alert');
    const showScanLine = animateGrid && state === 'thinking';

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

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary Grid — emerald-tinted for brand coherence */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(16, 185, 129, 0.055) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(16, 185, 129, 0.055) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                    maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 25%, transparent 75%)'
                }}
            />

            {/* Micro Grid (Tesla Style) */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(16, 185, 129, 0.022) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(16, 185, 129, 0.022) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                    maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 15%, transparent 55%)'
                }}
            />

            {/* Bottom depth glow — pulls grid into perspective */}
            <div
                className="absolute inset-x-0 bottom-0 h-[40%]"
                style={{
                    background: 'linear-gradient(to top, rgba(16, 185, 129, 0.04) 0%, transparent 100%)',
                    maskImage: 'radial-gradient(ellipse 90% 60% at 50% 100%, black 0%, transparent 70%)'
                }}
            />

            {/* Neural Pulse Effect */}
            {animateGrid && (
                <div
                    className={`absolute inset-0 ${
                        state === 'thinking' ? 'neural-grid-pulse-fast' : 'neural-grid-pulse-slow'
                    }`}
                    style={{
                        background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 70%)',
                        willChange: 'opacity',
                    }}
                />
            )}

            {/* Corner Markers — minimal HUD aesthetic */}
            <div className="absolute top-8 left-8 w-20 h-20 border-t border-l pointer-events-none" style={{ borderColor: 'rgba(16, 185, 129, 0.14)' }} />
            <div className="absolute top-8 right-8 w-20 h-20 border-t border-r pointer-events-none" style={{ borderColor: 'rgba(16, 185, 129, 0.14)' }} />
            <div className="absolute bottom-24 left-8 w-20 h-20 border-b border-l pointer-events-none" style={{ borderColor: 'rgba(16, 185, 129, 0.14)' }} />
            <div className="absolute bottom-24 right-8 w-20 h-20 border-b border-r pointer-events-none" style={{ borderColor: 'rgba(16, 185, 129, 0.14)' }} />

            {/* Corner dots */}
            <div className="absolute top-8 left-8 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.35)' }} />
            <div className="absolute top-8 right-8 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.35)' }} />
            <div className="absolute bottom-24 left-8 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.35)' }} />
            <div className="absolute bottom-24 right-8 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.35)' }} />

            {/* Scanning Line (only when thinking) */}
            {showScanLine && (
                <div
                    className="absolute inset-x-0 h-px neural-grid-scanline"
                    style={{
                        background: 'linear-gradient(90deg, transparent 5%, rgba(16, 185, 129, 0.28) 40%, rgba(52, 211, 153, 0.45) 50%, rgba(16, 185, 129, 0.28) 60%, transparent 95%)',
                        willChange: 'transform, opacity',
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)',
                    }}
                />
            )}
        </div>
    );
};
