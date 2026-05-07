// components/content/VisibilityModal.tsx
'use client';

import React, { useState } from 'react';
import { Building2, Link, Lock, Users, X } from 'lucide-react';
import type { NodeVisibility } from '@/lib/types/core';

const OPTIONS: Array<{
    value: NodeVisibility;
    label: string;
    description: string;
    icon: React.ElementType;
}> = [
    {
        value: 'private',
        icon: Lock,
        label: 'Nur ich',
        description: 'Privat in deinem OS. Niemand im Workspace sieht diesen Inhalt.',
    },
    {
        value: 'department',
        icon: Users,
        label: 'Bereich',
        description: 'Sichtbar fuer Mitglieder des passenden Bereichs.',
    },
    {
        value: 'company',
        icon: Building2,
        label: 'Workspace',
        description: 'Sichtbar fuer angemeldete Mitglieder dieses Workspaces.',
    },
    {
        value: 'public',
        icon: Link,
        label: 'Freigabelink',
        description: 'Nur mit bewusst erzeugtem Link erreichbar.',
    },
];

interface VisibilityModalProps {
    fileName: string;
    defaultVisibility?: NodeVisibility;
    onConfirm: (visibility: NodeVisibility) => void;
    onCancel: () => void;
}

/**
 * VisibilityModal -- shown at upload or content creation time.
 *
 * The caller is responsible for the actual upload/create API call.
 */
export const VisibilityModal: React.FC<VisibilityModalProps> = ({
    fileName,
    defaultVisibility = 'department',
    onConfirm,
    onCancel,
}) => {
    const [selected, setSelected] = useState<NodeVisibility>(defaultVisibility);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e1117] p-6 shadow-2xl">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <div className="max-w-[220px] truncate text-sm font-medium text-white">
                            {fileName}
                        </div>
                        <div className="mt-0.5 text-xs text-white/40">Wer kann das sehen?</div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-white/30 transition-colors hover:text-white/60"
                        aria-label="Schliessen"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="mb-5 flex flex-col gap-2">
                    {OPTIONS.map(({ value, icon: Icon, label, description }) => (
                        <label
                            key={value}
                            className={[
                                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all',
                                selected === value
                                    ? 'border-white/20 bg-white/5'
                                    : 'border-transparent hover:bg-white/[0.03]',
                            ].join(' ')}
                        >
                            <input
                                type="radio"
                                name="visibility"
                                value={value}
                                checked={selected === value}
                                onChange={() => setSelected(value)}
                                className="sr-only"
                                aria-label={label}
                            />
                            <Icon size={14} className="mt-0.5 shrink-0 text-white/50" />
                            <div>
                                <div className="text-sm text-white/80">{label}</div>
                                <div className="text-[10px] text-white/30">{description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={() => onConfirm(selected)}
                        className="rounded-lg bg-white/10 px-4 py-1.5 text-xs text-white transition-colors hover:bg-white/15"
                    >
                        Anwenden
                    </button>
                </div>
            </div>
        </div>
    );
};

