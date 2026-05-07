// components/content/VisibilityBadge.tsx
'use client';

import React from 'react';
import { Building2, Link, Lock, Users } from 'lucide-react';
import type { NodeVisibility } from '@/lib/types/core';
import { visibilityFromScope } from '@/lib/utils/visibility';

const CONFIG: Record<NodeVisibility, {
    icon: React.ElementType;
    label: string;
    color: string;
}> = {
    private: { icon: Lock, label: 'Nur ich', color: 'text-amber-300/75' },
    department: { icon: Users, label: 'Bereich sichtbar', color: 'text-blue-300/70' },
    company: { icon: Building2, label: 'Workspace sichtbar', color: 'text-cyan-200/70' },
    public: { icon: Link, label: 'Freigabelink', color: 'text-emerald-300/75' },
};

interface VisibilityBadgeProps {
    visibility: NodeVisibility | string;
    size?: number;
    showLabel?: boolean;
    className?: string;
}

export const VisibilityBadge: React.FC<VisibilityBadgeProps> = ({
    visibility,
    size = 12,
    showLabel = false,
    className = '',
}) => {
    const normalizedVisibility = visibilityFromScope(visibility, visibility) || visibility;
    const resolvedConfig = CONFIG[normalizedVisibility as NodeVisibility] ?? {
        icon: Lock,
        label: visibility || 'Nur ich',
        color: 'text-white/35',
    };
    const { icon: Icon, label, color } = resolvedConfig;
    return (
        <span
            className={`inline-flex items-center gap-1 ${color} ${className}`}
            title={label}
        >
            <Icon size={size} />
            {showLabel && <span className="text-[10px]">{label}</span>}
        </span>
    );
};

