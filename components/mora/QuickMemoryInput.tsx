"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, X, Lightbulb, Check } from 'lucide-react';
import { learnInsight } from '@/lib/api/coreClient';
import { guessCategory, shouldAutoCommit } from '@/lib/memory';
import { showMemoryLearnedToast } from '@/lib/memory/memoryNotifications';
import { useNavStore } from '@/lib/store/navStore';

/**
 * QUICK MEMORY INPUT
 *
 * Kompaktes Overlay für schnelle Memory-Eingabe.
 * Erscheint über dem Dock wenn User auf Brain-Icon klickt.
 *
 * Features:
 * - Auto-Kategorisierung basierend auf Inhalt
 * - Sofortiges Feedback
 * - Keyboard shortcuts (Enter = Submit, Escape = Close)
 */

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const QuickMemoryInput: React.FC<Props> = ({ isOpen, onClose }) => {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setInput('');
            setShowSuccess(false);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!input.trim() || isSubmitting || !activeCompanyId) return;

        setIsSubmitting(true);

        try {
            const insight = input.trim();
            const category = guessCategory(insight);
            const autoCommit = shouldAutoCommit(category);

            await learnInsight({
                insight,
                category,
                auto_commit: autoCommit,
                company_id: activeCompanyId
            });

            // Show success feedback
            setShowSuccess(true);
            showMemoryLearnedToast(insight, category);

            // Close after brief delay
            setTimeout(() => {
                onClose();
            }, 800);

        } catch (err) {
            console.error('[QuickMemory] Learn failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Determine category hint based on current input
    const categoryHint = input.length > 5 ? guessCategory(input) : null;
    const isLowRisk = categoryHint ? shouldAutoCommit(categoryHint) : true;
    const isMissingCompany = !activeCompanyId;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[600] bg-black/20 backdrop-blur-sm"
                    />

                    {/* Input Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[601] w-[480px] max-w-[90vw]"
                    >
                        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-violet-400" />
                                    <span className="text-xs font-medium text-white/80">
                                        Schnell merken
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-white/30 hover:text-white/60 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Input Area */}
                            <div className="p-4">
                                {showSuccess ? (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex items-center justify-center gap-3 py-4"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                            <Check className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <span className="text-sm text-emerald-400">
                                            Mora hat es sich gemerkt!
                                        </span>
                                    </motion.div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder={isMissingCompany ? "Bitte erst eine Company auswaehlen" : "Was soll Mora sich merken?"}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                                                disabled={isSubmitting || isMissingCompany}
                                            />
                                            <button
                                                onClick={handleSubmit}
                                                disabled={!input.trim() || isSubmitting || isMissingCompany}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>

                                        {/* Category Hint */}
                                        {categoryHint && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-2 mt-3 px-1"
                                            >
                                                <Lightbulb size={12} className="text-white/30" />
                                                <span className="text-[10px] text-white/40">
                                                    Kategorie: <span className={isLowRisk ? 'text-emerald-400/70' : 'text-amber-400/70'}>{categoryHint}</span>
                                                    {!isLowRisk && ' (zur Prüfung)'}
                                                </span>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer Hint */}
                            {!showSuccess && (
                                <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/20">
                                    <span>Beispiel: &quot;Ich bevorzuge kurze Antworten&quot;</span>
                                    <span>Enter ↵ zum Speichern</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default QuickMemoryInput;
