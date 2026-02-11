"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '@/lib/hooks/shell/useKeyboardShortcuts';

interface KeyboardShortcutsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({
    isOpen,
    onClose,
}) => {
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    <motion.div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[601] w-[420px] max-w-[90vw]"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <Keyboard size={18} className="text-emerald-400/70" />
                                    <span className="text-sm font-medium text-white/90 tracking-wide">
                                        Tastenkurzeln
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                                {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                                                {shortcut.label}
                                            </span>
                                            <span className="text-[11px] text-white/30">
                                                {shortcut.description}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <kbd
                                                    key={keyIndex}
                                                    className="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-[11px] text-white/70 font-mono min-w-[24px] text-center"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02]">
                                <div className="flex items-center justify-between text-[10px] text-white/30">
                                    <span>
                                        Drucke <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-1">?</kbd> um dieses Menu zu oeffnen
                                    </span>
                                    <span className="text-emerald-400/50">SAIMOR OS</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default KeyboardShortcutsOverlay;
