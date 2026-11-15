"use client";

import React from 'react';

/**
 * Nur noch die Kapsel-Schaltfläche des Docks.
 *
 * `components/os-shell/OsDock.tsx` importiert `CapsuleDockIcon` von hier. Der
 * alte, große Dock (Suche, Mitteilungen, Fokus, Firmenwechsel …) liegt in
 * `./LegacyDock.tsx` und wird nur noch von der klassischen Oberfläche
 * (`MoraShell`) geladen. So zieht `/os` den alten Dock nicht mehr mit.
 */

// ─── Capsule Dock Icon (Unified rounded icon with custom tooltips) ────────────────────────
export interface CapsuleDockIconProps {
    icon: React.ComponentType<any>;
    label: string;
    description: string;
    shortcut?: string | null;
    active?: boolean;
    onClick: () => void;
    onDoubleClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    badge?: number;
    isStandardMode: boolean;
    pulse?: boolean;
    children?: React.ReactNode;
}

export const CapsuleDockIcon: React.FC<CapsuleDockIconProps> = ({
    icon: Icon,
    label,
    description,
    shortcut,
    active = false,
    onClick,
    onDoubleClick,
    onContextMenu,
    badge,
    isStandardMode,
    pulse = false,
    children,
}) => {
    return (
        <button
            type="button"
            aria-label={label}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all relative group duration-75 ease-out will-change-transform ${
                active
                    ? isStandardMode
                        ? 'bg-[#0078D4]/10 text-[#0078D4]'
                        : 'bg-cyan-400/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.15)] border border-cyan-300/30'
                    : isStandardMode
                        ? 'text-gray-600 hover:text-[#0078D4] hover:bg-gray-100 hover:scale-110 active:scale-95'
                        : 'text-cyan-50/64 hover:text-cyan-100 hover:bg-cyan-200/[0.075] hover:shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:scale-110 active:scale-95'
            }`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
        >
            <Icon size={20} strokeWidth={1.45} className={pulse ? 'animate-pulse' : ''} />
            {children}

            {/* Badge */}
            {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-violet-500 text-[10px] text-white font-bold items-center justify-center">
                        {badge > 9 ? '!' : badge}
                    </span>
                </span>
            )}

            {/* Tooltip (bei geöffnetem Fächer stumm) */}
            {!active && <div className="absolute -top-3 left-0 w-full h-3 bg-transparent z-50 pointer-events-auto opacity-0 hidden group-hover:block" />}
            <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 ${active ? 'hidden' : ''} group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-75 delay-150 ease-out pointer-events-none z-[9999]`}>
                <div className={`rounded-lg px-3 py-2 min-w-[140px] text-center shadow-2xl ${
                    isStandardMode
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-black/95 backdrop-blur-xl border border-white/10'
                }`}>
                    <div className="text-white text-xs font-medium">{label}</div>
                    <div className="text-white/50 text-[10px] mt-0.5">{description}</div>
                    {shortcut && (
                        <kbd className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${
                            isStandardMode ? 'bg-gray-700 text-blue-300' : 'bg-white/10 text-emerald-400'
                        }`}>
                            {shortcut}
                        </kbd>
                    )}
                </div>
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
                    isStandardMode
                        ? 'bg-gray-800 border-r border-b border-gray-700'
                        : 'bg-black/95 border-r border-b border-white/10'
                }`} />
            </div>
        </button>
    );
};
