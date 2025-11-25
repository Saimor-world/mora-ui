"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = ""
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
            <div className="p-6 rounded-full bg-white/5 border border-white/5 mb-6 group hover:border-emerald-500/30 transition-colors">
                <Icon className="w-12 h-12 text-emerald-500/40 group-hover:text-emerald-400 transition-colors" />
            </div>

            <h3 className="text-lg font-light text-emerald-50 tracking-widest uppercase mb-2">
                {title}
            </h3>

            <p className="text-sm text-emerald-400/60 max-w-xs mb-8 leading-relaxed">
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-8 py-3 rounded-full glass-panel border border-emerald-500/30 hover:border-mora-gold/50 hover:bg-white/5 text-sm text-emerald-300 hover:text-mora-gold transition-all tracking-wider uppercase"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
