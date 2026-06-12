"use client";

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface NeuralGridProps {
    active?: boolean;
    state?: string;
}

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
        if (typeof document === 'undefined') return;
        const handleVisibilityChange = () => setIsDocumentVisible(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary grid — uses --scene-rgb so it reacts to scene switches */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(var(--scene-rgb, 16, 185, 129), 0.14) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(var(--scene-rgb, 16, 185, 129), 0.14) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                    maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 30%, transparent 80%)'
                }}
            />
            {/* Micro grid */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(var(--scene-rgb, 16, 185, 129), 0.018) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(var(--scene-rgb, 16, 185, 129), 0.018) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px',
                    maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 15%, transparent 55%)'
                }}
            />
            {/* Bottom depth glow */}
            <div
                className="absolute inset-x-0 bottom-0 h-[40%]"
                style={{
                    background: `linear-gradient(to top, rgba(var(--scene-rgb, 16, 185, 129), 0.05) 0%, transparent 100%)`,
                    maskImage: 'radial-gradient(ellipse 90% 60% at 50% 100%, black 0%, transparent 70%)'
                }}
            />
            {/* Neural pulse (only when AI is active) */}
            {animateGrid && (
                <div
                    className={`absolute inset-0 ${
                        state === 'thinking' ? 'neural-grid-pulse-fast' : 'neural-grid-pulse-slow'
                    }`}
                    style={{
                        background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(var(--scene-rgb, 16, 185, 129), 0.04) 0%, transparent 70%)`,
                        willChange: 'opacity',
                    }}
                />
            )}
            {/* Corner markers */}
            <div className="absolute top-8 left-8 w-20 h-20 border-t border-l pointer-events-none" style={{ borderColor: `rgba(var(--scene-rgb, 16, 185, 129), 0.12)` }} />
            <div className="absolute top-8 right-8 w-20 h-20 border-t border-r pointer-events-none" style={{ borderColor: `rgba(var(--scene-rgb, 16, 185, 129), 0.12)` }} />
            <div className="absolute bottom-24 left-8 w-20 h-20 border-b border-l pointer-events-none" style={{ borderColor: `rgba(var(--scene-rgb, 16, 185, 129), 0.12)` }} />
            <div className="absolute bottom-24 right-8 w-20 h-20 border-b border-r pointer-events-none" style={{ borderColor: `rgba(var(--scene-rgb, 16, 185, 129), 0.12)` }} />
            {/* Corner dots */}
            <div className="absolute top-8 left-8 w-1.5 h-1.5 rounded-full" style={{ background: `rgba(var(--scene-rgb, 16, 185, 129), 0.30)` }} />
            <div className="absolute top-8 right-8 w-1.5 h-1.5 rounded-full" style={{ background: `rgba(var(--scene-rgb, 16, 185, 129), 0.30)` }} />
            <div className="absolute bottom-24 left-8 w-1.5 h-1.5 rounded-full" style={{ background: `rgba(var(--scene-rgb, 16, 185, 129), 0.30)` }} />
            <div className="absolute bottom-24 right-8 w-1.5 h-1.5 rounded-full" style={{ background: `rgba(var(--scene-rgb, 16, 185, 129), 0.30)` }} />
            {/* Scan line */}
            {showScanLine && (
                <div
                    className="absolute inset-x-0 h-px neural-grid-scanline"
                    style={{
                        background: `linear-gradient(90deg, transparent 5%, rgba(var(--scene-rgb, 16, 185, 129), 0.22) 30%, rgba(var(--scene-rgb, 16, 185, 129), 0.45) 50%, rgba(var(--scene-rgb, 16, 185, 129), 0.22) 70%, transparent 95%)`,
                        willChange: 'transform, opacity',
                        boxShadow: `0 0 10px rgba(var(--scene-rgb, 16, 185, 129), 0.25), 0 0 4px rgba(var(--scene-rgb, 16, 185, 129), 0.3)`,
                    }}
                />
            )}
        </div>
    );
};
