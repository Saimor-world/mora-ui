'use client';

import React from 'react';
import { CheckSquare, Square, Trash2, X } from 'lucide-react';

interface MailSelectionBarProps {
    selectedCount: number;
    totalCount: number;
    allSelected: boolean;
    trashing: boolean;
    confirmingTrash: boolean;
    onToggleAll: () => void;
    onTrash: () => void;
    onExit: () => void;
}

export function MailSelectionBar({
    selectedCount,
    totalCount,
    allSelected,
    trashing,
    confirmingTrash,
    onToggleAll,
    onTrash,
    onExit,
}: MailSelectionBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-white/[0.025] px-4 py-2.5">
            <button
                type="button"
                onClick={onToggleAll}
                disabled={trashing || totalCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-semibold text-white/62 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
            >
                {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
            </button>

            <span className="text-[10px] tabular-nums text-white/34">
                {selectedCount} / {totalCount}
            </span>

            <button
                type="button"
                onClick={onTrash}
                disabled={trashing || selectedCount === 0}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors disabled:opacity-35 ${
                    confirmingTrash
                        ? 'border-red-300/25 bg-red-400/15 text-red-100'
                        : 'border-red-300/12 bg-red-400/[0.07] text-red-200/72 hover:bg-red-400/[0.12]'
                }`}
            >
                <Trash2 size={12} />
                {trashing ? 'Verschiebe…' : confirmingTrash ? `${selectedCount} wirklich verschieben?` : 'In Papierkorb'}
            </button>

            <button
                type="button"
                onClick={onExit}
                disabled={trashing}
                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-white/38 transition-colors hover:bg-white/[0.05] hover:text-white/65 disabled:opacity-40"
            >
                <X size={12} />
                Fertig
            </button>
        </div>
    );
}
