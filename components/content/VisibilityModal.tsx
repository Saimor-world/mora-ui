// components/content/VisibilityModal.tsx
'use client';

import React, { useState } from 'react';
import { Lock, Users, Globe, Link, X } from 'lucide-react';
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
        label: 'Privat',
        description: 'Nur du siehst diesen Inhalt',
    },
    {
        value: 'department',
        icon: Users,
        label: 'Abteilung',
        description: 'Alle Mitglieder deiner Abteilung',
    },
    {
        value: 'company',
        icon: Globe,
        label: 'Alle',
        description: 'Alle authentifizierten Unternehmensmitglieder',
    },
    {
        value: 'public',
        icon: Link,
        label: 'Öffentlicher Link',
        description: 'Jeder mit dem Link — keine Anmeldung nötig',
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
 * The user chooses who can see the new content before it is submitted.
 * Default: 'department' — safe default that doesn't over-expose.
 *
 * onConfirm is called with the selected NodeVisibility.
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
            <div className="bg-[#0e1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm font-medium text-white truncate max-w-[220px]">
                            {fileName}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">Wer kann das sehen?</div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-white/30 hover:text-white/60 transition-colors"
                        aria-label="Schließen"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Visibility options */}
                <div className="flex flex-col gap-2 mb-5">
                    {OPTIONS.map(({ value, icon: Icon, label, description }) => (
                        <label
                            key={value}
                            className={[
                                'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border',
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
                            <Icon size={14} className="mt-0.5 text-white/50 shrink-0" />
                            <div>
                                <div className="text-sm text-white/80">{label}</div>
                                <div className="text-[10px] text-white/30">{description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={() => onConfirm(selected)}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg transition-colors"
                    >
                        Hochladen
                    </button>
                </div>
            </div>
        </div>
    );
};
