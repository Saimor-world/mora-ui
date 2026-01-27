"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, AlertCircle, Info } from 'lucide-react';

interface MoraHintProps {
    /** Hint message text */
    message: string;
    /** Hint type: info, warning, insight */
    type?: 'info' | 'warning' | 'insight';
    /** Show/hide */
    visible?: boolean;
    /** Position variant */
    position?: 'top-right' | 'below-title' | 'bottom-left';
}

/**
 * Mora HINT BAR
 * 
 * Displays heuristic hints from Môra.
 * No AI - just simple pattern-based suggestions.
 */
export function MoraHint({
    message,
    type = 'info',
    visible = true,
    position = 'top-right'
}: MoraHintProps) {
    if (!visible || !message) return null;

    const icons = {
        info: Info,
        warning: AlertCircle,
        insight: Brain
    };

    const colors = {
        info: {
            bg: 'rgba(59, 130, 246, 0.05)',
            border: 'rgba(59, 130, 246, 0.2)',
            text: 'text-blue-400/80',
            icon: 'text-blue-400'
        },
        warning: {
            bg: 'rgba(251, 191, 36, 0.05)',
            border: 'rgba(251, 191, 36, 0.2)',
            text: 'text-amber-400/80',
            icon: 'text-amber-400'
        },
        insight: {
            bg: 'rgba(206, 182, 118, 0.05)',
            border: 'rgba(206, 182, 118, 0.2)',
            text: 'text-mora-gold/80',
            icon: 'text-mora-gold'
        }
    };

    const Icon = icons[type];
    const colorScheme = colors[type];

    const positionClasses = {
        'top-right': 'absolute top-4 right-4',
        'below-title': 'mt-2',
        'bottom-left': 'absolute bottom-4 left-4'
    };

    return (
        <AnimatePresence>
            <motion.div
                className={`${positionClasses[position]} z-20 pointer-events-none select-none`}
                initial={{ opacity: 0, y: position === 'bottom-left' ? 10 : -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div
                    className="flex items-start gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border max-w-xs"
                    style={{
                        backgroundColor: colorScheme.bg,
                        borderColor: colorScheme.border
                    }}
                >
                    <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colorScheme.icon}`} />
                    <p className={`text-[10px] leading-relaxed ${colorScheme.text}`}>
                        {message}
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
