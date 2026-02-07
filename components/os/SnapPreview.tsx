"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SnapZone } from '@/lib/hooks/useWindowSnapping';

/**
 * SNAP PREVIEW OVERLAY
 *
 * Shows visual preview of where window will snap when released.
 * Appears when dragging a window near screen edges.
 */

interface SnapPreviewProps {
    zone: SnapZone;
    visible: boolean;
}

export const SnapPreview: React.FC<SnapPreviewProps> = ({ zone, visible }) => {
    if (!zone || !visible) return null;

    const getZoneDimensions = () => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const vh = typeof window !== 'undefined' ? window.innerHeight - 80 : 1000;
        const padding = 8;
        const topOffset = 48;

        switch (zone) {
            case 'left':
                return { left: padding, top: topOffset, width: Math.floor(vw / 2) - padding * 1.5, height: vh - topOffset - padding };
            case 'right':
                return { left: Math.floor(vw / 2) + padding / 2, top: topOffset, width: Math.floor(vw / 2) - padding * 1.5, height: vh - topOffset - padding };
            case 'maximize':
                return { left: padding, top: topOffset, width: vw - padding * 2, height: vh - topOffset - padding };
            case 'top-left':
                return { left: padding, top: topOffset, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - topOffset };
            case 'top-right':
                return { left: Math.floor(vw / 2) + padding / 2, top: topOffset, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - topOffset };
            case 'bottom-left':
                return { left: padding, top: Math.floor(vh / 2) + padding / 2, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - padding };
            case 'bottom-right':
                return { left: Math.floor(vw / 2) + padding / 2, top: Math.floor(vh / 2) + padding / 2, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - padding };
            default:
                return null;
        }
    };

    const getZoneLabel = () => {
        switch (zone) {
            case 'left': return 'Links';
            case 'right': return 'Rechts';
            case 'maximize': return 'Maximieren';
            case 'top-left': return 'Oben Links';
            case 'top-right': return 'Oben Rechts';
            case 'bottom-left': return 'Unten Links';
            case 'bottom-right': return 'Unten Rechts';
            default: return '';
        }
    };

    const dims = getZoneDimensions();
    if (!dims) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="fixed pointer-events-none z-[9998]"
                    style={{
                        left: dims.left,
                        top: dims.top,
                        width: dims.width,
                        height: dims.height,
                    }}
                >
                    {/* Background fill */}
                    <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm rounded-xl" />

                    {/* Border glow */}
                    <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-xl" />

                    {/* Corner accents */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400/60 rounded-tl-lg" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400/60 rounded-tr-lg" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400/60 rounded-bl-lg" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400/60 rounded-br-lg" />

                    {/* Label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-4 py-2 bg-black/80 backdrop-blur-xl rounded-lg border border-emerald-500/30"
                        >
                            <span className="text-xs font-medium text-emerald-300">{getZoneLabel()}</span>
                        </motion.div>
                    </div>

                    {/* Animated pulse effect */}
                    <motion.div
                        className="absolute inset-0 border border-emerald-500/20 rounded-xl"
                        animate={{
                            scale: [1, 1.02, 1],
                            opacity: [0.5, 0.2, 0.5],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SnapPreview;
