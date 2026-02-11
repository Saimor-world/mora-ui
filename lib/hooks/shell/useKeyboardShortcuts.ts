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

export const KEYBOARD_SHORTCUTS = [
    { keys: ['Strg', 'K'], label: 'Spotlight', description: 'Command Palette oeffnen' },
    { keys: ['Strg', 'J'], label: 'Chat', description: 'Mora Chat oeffnen' },
    { keys: ['Strg', 'F'], label: 'Finder', description: 'Dateien durchsuchen' },
    { keys: ['Strg', 'N'], label: 'Notes', description: 'Notizen oeffnen' },
    { keys: ['Strg', ','], label: 'Settings', description: 'Einstellungen oeffnen' },
    { keys: ['Strg', 'T'], label: 'Terminal', description: 'Terminal oeffnen' },
    { keys: ['Strg', 'H'], label: 'Home', description: 'Zur Uebersicht' },
    { keys: ['Strg', '.'], label: 'Mora Nexus', description: 'AI Hub oeffnen' },
    { keys: ['Strg', 'Shift', 'M'], label: 'Memory', description: 'Memory Panel oeffnen' },
    { keys: ['Esc'], label: 'Schliessen', description: 'Oberstes Panel schliessen' },
    { keys: ['?'], label: 'Hilfe', description: 'Shortcuts anzeigen' },
] as const;

interface UseKeyboardShortcutsOptions {
    onToggleSpotlight: () => void;
    onOpenChat?: () => void;
    onOpenFinder?: () => void;
    onOpenNotes?: () => void;
    onOpenSettings?: () => void;
    onOpenTerminal?: () => void;
    onGoHome?: () => void;
    onOpenMoraHub?: () => void;
    onOpenMemory?: () => void;
    onCloseTopPane?: () => void;
    onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts({
    onToggleSpotlight,
    onOpenChat,
    onOpenFinder,
    onOpenNotes,
    onOpenSettings,
    onOpenTerminal,
    onGoHome,
    onOpenMoraHub,
    onOpenMemory,
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

            if (meta && e.key === 't') {
                e.preventDefault();
                onOpenTerminal?.();
                return;
            }

            if (meta && e.key === 'h') {
                e.preventDefault();
                onGoHome?.();
                return;
            }

            if (meta && e.key === '.') {
                e.preventDefault();
                onOpenMoraHub?.();
                return;
            }

            if (meta && e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                onOpenMemory?.();
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
        onOpenTerminal,
        onGoHome,
        onOpenMoraHub,
        onOpenMemory,
        onCloseTopPane,
        onShowShortcuts,
    ]);
}
