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
        <div className={`app-state app-state--empty ${className}`}>
            <div className="app-state__icon">
                <Icon className="w-6 h-6" />
            </div>

            <p className="app-state__eyebrow">Noch nichts hier</p>
            <h3>
                {title}
            </h3>

            <p>
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="app-state__action"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
