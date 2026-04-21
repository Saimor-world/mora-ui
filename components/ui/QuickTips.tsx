"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Sparkles, Command, Folder, MessageCircle } from 'lucide-react';
import { usePaneStore } from '@/lib/store/paneStore';
import { usePlatformModifier } from '@/lib/hooks/usePlatformModifier';

/**
 * V12: Quick Tips
 *
 * Shows helpful tips for new users.
 * Dismissible and remembers state in localStorage.
 */

type QuickTip = {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
};

export const QuickTips: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTip, setCurrentTip] = useState(0);
    const modifier = usePlatformModifier();
    // Return count (primitive) directly so Zustand doesn't trigger on every render
    // due to Array reference inequality from .filter().
    const visiblePanesCount = usePaneStore((s) => s.panes.filter(p => !p.minimized).length);

    const tips: QuickTip[] = [
        {
            icon: Command,
            title: 'Spotlight Suche',
            description: `Druecke ${modifier}+K um schnell zu suchen`,
            color: 'emerald'
        },
        {
            icon: Sparkles,
            title: 'Mora fragen',
            description: 'Klicke auf den Orb rechts unten für KI-Hilfe',
            color: 'cyan'
        },
        {
            icon: Folder,
            title: 'Finder öffnen',
            description: `${modifier}+F öffnet den Datei-Explorer`,
            color: 'blue'
        },
        {
            icon: MessageCircle,
            title: 'Chat starten',
            description: `${modifier}+J startet den Chat mit Mora`,
            color: 'violet'
        }
    ];

    useEffect(() => {
        // Check if user has seen tips before
        const hasSeenTips = localStorage.getItem('saimor_tips_seen');
        if (!hasSeenTips) {
            // Show tips after 3 seconds
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Auto-dismiss when any pane is opened
    useEffect(() => {
        if (visiblePanesCount > 0 && isVisible) {
            setIsVisible(false);
            localStorage.setItem('saimor_tips_seen', 'true');
        }
    }, [visiblePanesCount, isVisible]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('saimor_tips_seen', 'true');
    };

    const handleNext = () => {
        if (currentTip < tips.length - 1) {
            setCurrentTip(prev => prev + 1);
        } else {
            handleDismiss();
        }
    };

    const tip = tips[currentTip];
    const Icon = tip.icon;

    const colorClasses: Record<string, string> = {
        emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
        cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
        blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        violet: 'bg-violet-500/20 border-violet-500/30 text-violet-400'
    };

    return (
        <AnimatePresence>
            {isVisible && (
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-32 left-8 z-[50]"
            >
                <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 w-72 shadow-2xl">
                    {/* Glow */}
                    <div className="absolute -inset-1 bg-emerald-500/10 rounded-2xl blur-xl -z-10" />

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={14} className="text-amber-400" />
                        <span className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold">
                            Tipp {currentTip + 1}/{tips.length}
                        </span>
                    </div>

                    {/* Tip Content */}
                    <motion.div
                        key={currentTip}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3"
                    >
                        <div className={`p-2.5 rounded-xl border ${colorClasses[tip.color]}`}>
                            <Icon size={18} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-medium text-sm mb-1">
                                {tip.title}
                            </h4>
                            <p className="text-white/50 text-xs leading-relaxed">
                                {tip.description}
                            </p>
                        </div>
                    </motion.div>

                    {/* Progress + Next */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        {/* Progress Dots */}
                        <div className="flex gap-1.5">
                            {tips.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentTip ? 'bg-emerald-400' : 'bg-white/20'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Next/Done Button */}
                        <button
                            onClick={handleNext}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
                        >
                            {currentTip < tips.length - 1 ? 'Weiter' : 'Verstanden'}
                        </button>
                    </div>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
    );
};

export default QuickTips;
