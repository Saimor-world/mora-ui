"use client";

/**
 * MORA INSIGHT POPUP
 *
 * Mora's proactive thought bubble — appears above the Dock when she forms
 * an organic insight from MindLoop events. NOT a chat response.
 * Feels like a gentle tap on the shoulder: "ich hab was bemerkt..."
 *
 * States:
 * - Floats in from bottom-right, above dock
 * - Soft entrance, auto-dismisses after 8s unless interacted with
 * - User can confirm (→ saves to memory) or dismiss
 * - Mora's orb briefly pulses 'insight' state during display
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, Brain } from 'lucide-react';
import { dispatchMoraPresence } from '@/lib/mora/presenceEvents';

export interface MoraInsight {
    id: string;
    content: string;           // Mora's observation in natural language
    source?: string;           // Where it came from: 'mindloop' | 'context' | 'pattern'
    confidence?: number;       // 0-1, how certain Mora is
    timestamp: string;
    confirmed?: boolean;
}

interface MoraInsightPopupProps {
    insight: MoraInsight | null;
    onConfirm?: (insight: MoraInsight) => void;
    onDismiss?: (insight: MoraInsight) => void;
    autoHideMs?: number;
}

export const MoraInsightPopup: React.FC<MoraInsightPopupProps> = ({
    insight,
    onConfirm,
    onDismiss,
    autoHideMs = 8000,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [progress, setProgress] = useState(100);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        if (insight) onDismiss?.(insight);
    }, [insight, onDismiss]);

    useEffect(() => {
        if (!insight) {
            setIsVisible(false);
            return;
        }
        setIsVisible(true);
        setProgress(100);

        const presenceTimer = window.setTimeout(() => {
            dispatchMoraPresence({
                action: 'point',
                targetId: 'mora-insight-popup',
                message: 'Insight verfügbar'
            });
        }, 500);

        // Auto-dismiss countdown
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / autoHideMs) * 100);
            setProgress(remaining);
            if (remaining === 0) {
                handleDismiss();
            }
        }, 50);

        return () => {
            window.clearTimeout(presenceTimer);
            clearInterval(interval);
        };
    }, [autoHideMs, handleDismiss, insight]);

    const handleConfirm = useCallback(() => {
        setIsVisible(false);
        if (insight) onConfirm?.(insight);
    }, [insight, onConfirm]);

    // Confidence → color signal
    const getConfidenceColor = (c?: number) => {
        if (!c) return '#10B981';
        if (c > 0.85) return '#10B981'; // Emerald — strong
        if (c > 0.6) return '#3B82F6';  // Blue — medium
        return '#6B7280';               // Gray — weak
    };

    const accentColor = getConfidenceColor(insight?.confidence);

    return (
        <AnimatePresence>
            {isVisible && insight && (
                <motion.div
                    key={insight.id}
                    id="mora-insight-popup"
                    className="fixed bottom-28 right-6 z-[8000] pointer-events-auto"
                    initial={{ opacity: 0, y: 24, scale: 0.92, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 16, scale: 0.94, filter: 'blur(3px)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                >
                    {/* Main card */}
                    <div
                        className="relative rounded-2xl backdrop-blur-xl border overflow-hidden max-w-[320px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(8,12,18,0.92) 100%)',
                            borderColor: `${accentColor}30`,
                            boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 40px ${accentColor}18, inset 0 1px 0 rgba(255,255,255,0.07)`,
                        }}
                    >
                        {/* Progress bar — auto-dismiss countdown */}
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/5">
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)`,
                                }}
                                transition={{ duration: 0.05 }}
                            />
                        </div>

                        {/* Animated glow edge */}
                        <motion.div
                            className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full"
                            style={{ background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)` }}
                            animate={{ opacity: [0.4, 0.9, 0.4] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        />

                        <div className="px-4 pt-4 pb-3 pl-5">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-2.5">
                                <motion.div
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}35` }}
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <Brain size={12} style={{ color: accentColor }} />
                                </motion.div>
                                <span
                                    className="text-[10px] uppercase tracking-[0.2em] font-medium"
                                    style={{ color: accentColor }}
                                >
                                    Mora bemerkt
                                </span>
                                {insight.confidence !== undefined && (
                                    <span className="ml-auto text-[9px] text-white/25 tracking-wider">
                                        {Math.round(insight.confidence * 100)}%
                                    </span>
                                )}
                                {/* Dismiss X */}
                                <button
                                    onClick={handleDismiss}
                                    className="ml-1 p-1 rounded-full text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors"
                                >
                                    <X size={11} />
                                </button>
                            </div>

                            {/* Insight text */}
                            <p className="text-sm text-white/85 leading-snug font-light mb-3 pr-1">
                                {insight.content}
                            </p>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <motion.button
                                    onClick={handleConfirm}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                                    style={{
                                        background: `${accentColor}18`,
                                        border: `1px solid ${accentColor}35`,
                                        color: accentColor,
                                    }}
                                    whileHover={{ scale: 1.03, background: `${accentColor}28` } as any}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <Check size={11} />
                                    Merken
                                </motion.button>
                                <motion.button
                                    onClick={handleDismiss}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white/35 hover:text-white/60 transition-colors border border-white/8 hover:border-white/15"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Jetzt nicht
                                </motion.button>
                                {insight.source === 'pattern' && (
                                    <span className="ml-auto text-[9px] text-white/20 flex items-center gap-1">
                                        <Sparkles size={8} />
                                        Pattern
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Atmospheric outer glow */}
                    <div
                        className="absolute inset-0 rounded-2xl pointer-events-none -z-10 blur-[30px] opacity-20"
                        style={{ background: accentColor }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MoraInsightPopup;
