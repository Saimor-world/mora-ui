// components/content/VisibilityBadge.tsx
'use client';

import React from 'react';
import { Lock, Users, Globe, Link } from 'lucide-react';
import type { NodeVisibility } from '@/lib/types/core';

const CONFIG: Record<NodeVisibility, {
    icon: React.ElementType;
    label: string;
    color: string;
}> = {
    private:    { icon: Lock,  label: 'Privat',           color: 'text-amber-400/70'   },
    department: { icon: Users, label: 'Abteilung',        color: 'text-blue-400/60'    },
    company:    { icon: Globe, label: 'Alle',             color: 'text-white/40'        },
    public:     { icon: Link,  label: 'Öffentlicher Link', color: 'text-emerald-400/70' },
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
    const resolvedConfig = CONFIG[visibility as NodeVisibility] ?? {
        icon: Lock,
        label: visibility || 'Privat',
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
