"use client";

/**
 * useKeyboardShortcuts - Global keyboard shortcuts
 *
 * Handles:
 * - Strg/Cmd+K: Toggle spotlight
 * - Strg/Cmd+J: Open chat
 * - Strg/Cmd+F: Open finder
 * - Strg/Cmd+N: Open notes
 * - Strg/Cmd+,: Open settings
 * - Strg/Cmd+T: Open terminal
 * - Strg/Cmd+H: Go home (core view)
 * - Strg/Cmd+.: Open Mora Nexus
 * - Strg/Cmd+Shift+M: Open memory
 * - Escape: Close top pane
 * - ?: Show shortcuts overlay
 */

import { useEffect } from 'react';
import { getPlatformModifier } from '@/lib/hooks/usePlatformModifier';

/**
 * Returns keyboard shortcuts with platform-aware modifier key label.
 * @param mod - 'Strg' (Windows/Linux) or 'Cmd' (Mac). Defaults to auto-detect.
 */
export function getKeyboardShortcuts(mod?: string) {
    const m = mod || getPlatformModifier();
    return [
        // 1.0 Core Work shortcuts
        { keys: [m, 'K'], label: 'Spotlight', description: 'Command Palette oeffnen' },
        { keys: [m, 'J'], label: 'Chat', description: 'Mora Chat oeffnen' },
        { keys: [m, 'F'], label: 'Finder', description: 'Dateien durchsuchen' },
        { keys: [m, 'N'], label: 'Notes', description: 'Notizen oeffnen' },
        { keys: [m, ','], label: 'System', description: 'Einstellungen oeffnen' },
        { keys: [m, 'H'], label: 'Start', description: 'Zur Uebersicht' },
        { keys: ['Esc'], label: 'Schliessen', description: 'Oberstes Panel schliessen' },
        { keys: ['?'], label: 'Hilfe', description: 'Shortcuts anzeigen' },
        // 1.0 gated (future-tier): Terminal (Cmd+T), Mora Nexus (Cmd+.), Memory (Cmd+Shift+M)
    ];
}

interface UseKeyboardShortcutsOptions {
    onToggleSpotlight: () => void;
    onOpenChat?: () => void;
    onOpenFinder?: () => void;
    onOpenNotes?: () => void;
    onOpenSettings?: () => void;
    // 1.0 gated: onOpenTerminal, onOpenMoraHub, onOpenMemory removed (future-tier)
    onGoHome?: () => void;
    onCloseTopPane?: () => void;
    onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts({
    onToggleSpotlight,
    onOpenChat,
    onOpenFinder,
    onOpenNotes,
    onOpenSettings,
    onGoHome,
    onCloseTopPane,
    onShowShortcuts,
}: UseKeyboardShortcutsOptions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputField =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            const meta = e.metaKey || e.ctrlKey;

            if (meta && e.key === 'k') {
                e.preventDefault();
                onToggleSpotlight();
                return;
            }

            if (isInputField) return;

            if (meta && e.key === 'j') {
                e.preventDefault();
                onOpenChat?.();
                return;
            }

            if (meta && e.key === 'f') {
                e.preventDefault();
                onOpenFinder?.();
                return;
            }

            if (meta && e.key === 'n') {
                e.preventDefault();
                onOpenNotes?.();
                return;
            }

            if (meta && e.key === ',') {
                e.preventDefault();
                onOpenSettings?.();
                return;
            }

            // 1.0 gated: Cmd+T (Terminal), Cmd+. (MoraHub), Cmd+Shift+M (Memory) removed

            if (meta && e.key === 'h') {
                e.preventDefault();
                onGoHome?.();
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseTopPane?.();
                return;
            }

            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                onShowShortcuts?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        onToggleSpotlight,
        onOpenChat,
        onOpenFinder,
        onOpenNotes,
        onOpenSettings,
        onGoHome,
        onCloseTopPane,
        onShowShortcuts,
    ]);
}
