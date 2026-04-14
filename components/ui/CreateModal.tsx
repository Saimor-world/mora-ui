"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavStore } from '@/lib/store/navStore';

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, title, children }) => {
    const isStandardMode = useNavStore(state => state.isStandardMode);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={`fixed inset-0 z-50 ${
                            isStandardMode
                                ? 'bg-black/30'
                                : 'bg-black/60 backdrop-blur-sm'
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[85vh] flex flex-col"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div
                            className={`flex flex-col overflow-hidden ${
                                isStandardMode
                                    ? 'bg-white border border-[#E1E1E1] rounded shadow-lg'
                                    : 'glass-panel border border-white/10 rounded-3xl shadow-2xl'
                            }`}
                        >
                            {/* Header */}
                            <div className={`flex items-center justify-between p-6 pb-4 shrink-0 ${
                                isStandardMode ? 'border-b border-[#E1E1E1]' : ''
                            }`}>
                                <h3 className={`text-xl font-light tracking-widest uppercase ${
                                    isStandardMode
                                        ? 'text-[#1F1F1F] font-semibold tracking-normal normal-case'
                                        : 'text-emerald-50'
                                }`}>
                                    {title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className={`p-2 rounded-full transition-colors ${
                                        isStandardMode
                                            ? 'hover:bg-gray-100'
                                            : 'hover:bg-white/5'
                                    }`}
                                >
                                    <X className={`w-5 h-5 ${
                                        isStandardMode ? 'text-gray-600' : 'text-emerald-400'
                                    }`} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 pt-2 overflow-y-auto custom-scrollbar">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
