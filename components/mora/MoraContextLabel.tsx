'use client';

import React from 'react';

export type MoraScope = 'personal' | 'shared' | 'object';

interface MoraContextLabelProps {
    scope?: MoraScope;
    sourceName?: string;
}

const SCOPE_CONFIG: Record<MoraScope, { color: string; bg: string; label: (src?: string) => string }> = {
    personal: {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        label: () => 'persönlicher Kontext',
    },
    shared: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        label: (src) => src ?? 'Unternehmenskontext',
    },
    object: {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        label: (src) => src ?? 'dieses Dokument',
    },
};

/**
 * MoraContextLabel -- scope indicator on each Mora response.
 *
 * Spec (Section 5, "Memory Scope Visibility Rule"):
 * Mora must always indicate which scope she is drawing from.
 * This is a trust model requirement, not just a UX nicety.
 *
 * Label design is an open decision (spec Section 10, item 4).
 * This is the functional MVC.
 */
export const MoraContextLabel: React.FC<MoraContextLabelProps> = ({ scope, sourceName }) => {
    if (!scope) return null;

    const config = SCOPE_CONFIG[scope];

    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${config.color} ${config.bg}`}
            title={`Mora spricht aus: ${config.label(sourceName)}`}
        >
            <span className="w-1 h-1 rounded-full bg-current opacity-60" />
            {config.label(sourceName)}
        </span>
    );
};
