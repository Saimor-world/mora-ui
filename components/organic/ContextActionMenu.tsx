"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, FileText, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';

export interface AIAction {
    label: string;
    action_type: string;
    confidence: number;
    payload?: any;
}

interface ContextActionMenuProps {
    x: number;
    y: number;
    actions: AIAction[];
    loading: boolean;
    onSelect: (action: AIAction) => void;
    onClose: () => void;
}

export const ContextActionMenu: React.FC<ContextActionMenuProps> = ({
    x, y, actions, loading, onSelect, onClose
}) => {

    // Prevent menu from going off-screen
    const style = {
        left: Math.min(x, window.innerWidth - 250),
        top: Math.min(y, window.innerHeight - 300),
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'chat': return <MessageSquare size={14} />;
            case 'summarize': return <FileText size={14} />;
            case 'open': return <ExternalLink size={14} />;
            case 'explain': return <Sparkles size={14} />;
            default: return <ArrowRight size={14} />;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2 }}
                className="fixed z-50 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                style={style}
                onMouseLeave={onClose}
            >
                {/* Header */}
                <div className="px-3 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
                        <Sparkles size={10} className="text-emerald-400" />
                        AI Context Actions
                    </span>
                    {loading && <Loader2 size={10} className="animate-spin text-white/50" />}
                </div>

                {/* Content */}
                <div className="p-1 flex flex-col gap-1">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-white/30 italic">
                            Thinking...
                        </div>
                    ) : actions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-white/30 italic">
                            No actions available
                        </div>
                    ) : (
                        actions.map((action, i) => (
                            <motion.button
                                key={i}
                                onClick={() => onSelect(action)}
                                className={`
                                    w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all
                                    ${action.confidence > 0.8
                                        ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'}
                                `}
                                whileHover={{ x: 2 }}
                            >
                                {getIcon(action.action_type)}
                                <span className="flex-1 truncate">{action.label}</span>
                                {action.confidence > 0.8 && (
                                    <span className="text-[9px] opacity-50">{Math.round(action.confidence * 100)}%</span>
                                )}
                            </motion.button>
                        ))
                    )}
                </div>
            </motion.div>

            {/* Click outside listener overlay */}
            <div className="fixed inset-0 z-40" onClick={onClose} />
        </AnimatePresence>
    );
};
