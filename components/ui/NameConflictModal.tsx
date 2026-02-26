'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Sparkles, PenLine } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * NameConflictModal
 * 
 * Shown when a 409 name_conflict is returned from the backend.
 * Displays:
 *   - The error message
 *   - Up to 5 AI-generated suggestions (clickable)
 *   - A manual input field for custom names
 *   - Cancel / Confirm actions
 */
export default function NameConflictModal() {
    const nameConflict = useMoraStore(s => s.nameConflict);
    const resolveNameConflict = useMoraStore(s => s.resolveNameConflict);
    const cancelNameConflict = useMoraStore(s => s.cancelNameConflict);

    const [customName, setCustomName] = useState('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset when modal opens
    useEffect(() => {
        if (nameConflict) {
            setCustomName('');
            setSelectedSuggestion(null);
            // Focus the input slightly delayed so animation finishes
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [nameConflict]);

    if (!nameConflict) return null;

    const finalName = selectedSuggestion || customName.trim();
    const canSubmit = finalName.length > 0;

    const entityLabel = ({
        department: 'Department',
        space: 'Space',
        folder: 'Folder'
    } as const)[nameConflict.type];

    const handleSubmit = () => {
        if (!canSubmit) return;
        resolveNameConflict(finalName);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && canSubmit) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape') {
            cancelNameConflict();
        }
    };

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Overlay */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={cancelNameConflict}
                />

                {/* Modal */}
                <motion.div
                    className="relative z-10 w-full max-w-md mx-4"
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl shadow-2xl shadow-amber-500/10 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <AlertTriangle size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm tracking-wide">
                                        Name Conflict
                                    </h3>
                                    <p className="text-white/40 text-xs mt-0.5">
                                        {entityLabel}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={cancelNameConflict}
                                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Message */}
                        <div className="px-6 pb-4">
                            <p className="text-white/60 text-sm leading-relaxed">
                                {nameConflict.message}
                            </p>
                        </div>

                        {/* Suggestions */}
                        {nameConflict.suggestions.length > 0 && (
                            <div className="px-6 pb-4">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <Sparkles size={12} className="text-emerald-400" />
                                    <span className="text-[10px] text-emerald-400/80 uppercase tracking-[0.15em] font-medium">
                                        Suggestions
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {nameConflict.suggestions.map((suggestion, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setSelectedSuggestion(
                                                    selectedSuggestion === suggestion ? null : suggestion
                                                );
                                                setCustomName('');
                                            }}
                                            className={`
                                                w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150
                                                ${selectedSuggestion === suggestion
                                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                                                    : 'bg-white/[0.03] text-white/70 border border-white/5 hover:bg-white/[0.06] hover:text-white/90 hover:border-white/10'
                                                }
                                            `}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="mx-6 border-t border-white/5" />

                        {/* Manual Input */}
                        <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-2.5">
                                <PenLine size={12} className="text-cyan-400" />
                                <span className="text-[10px] text-cyan-400/80 uppercase tracking-[0.15em] font-medium">
                                    Or enter a custom name
                                </span>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={customName}
                                onChange={(e) => {
                                    setCustomName(e.target.value);
                                    setSelectedSuggestion(null);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={`New ${entityLabel.toLowerCase()} name...`}
                                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 
                                    text-white text-sm placeholder-white/20
                                    focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20
                                    transition-colors"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 px-6 pb-5">
                            <button
                                onClick={cancelNameConflict}
                                className="px-4 py-2 rounded-lg text-white/40 text-sm hover:text-white/60 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={`
                                    px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                    ${canSubmit
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10'
                                        : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                                    }
                                `}
                            >
                                Rename &amp; Create
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
