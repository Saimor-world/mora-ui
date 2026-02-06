/**
 * useKeyboardShortcuts - Global Keyboard Shortcuts
 *
 * Handles:
 * - Cmd+K / Ctrl+K = Toggle Spotlight
 * - Cmd+J = Open Chat
 * - Cmd+F = Open Finder
 * - Cmd+N = Open Notes
 * - Cmd+, = Open Settings
 * - Cmd+T = Open Terminal
 * - Cmd+H = Go Home (Core view)
 * - Cmd+. = Open Mora Nexus
 * - Cmd+Shift+M = Open Memory
 * - Escape = Close top pane
 * - ? = Show shortcuts overlay
 */

import { useEffect } from 'react';

// Export for use in KeyboardShortcutsOverlay
export const KEYBOARD_SHORTCUTS = [
    { keys: ['⌘', 'K'], label: 'Spotlight', description: 'Command Palette öffnen' },
    { keys: ['⌘', 'J'], label: 'Chat', description: 'Mora Chat öffnen' },
    { keys: ['⌘', 'F'], label: 'Finder', description: 'Dateien durchsuchen' },
    { keys: ['⌘', 'N'], label: 'Notes', description: 'Notizen öffnen' },
    { keys: ['⌘', ','], label: 'Settings', description: 'Einstellungen öffnen' },
    { keys: ['⌘', 'T'], label: 'Terminal', description: 'Terminal öffnen' },
    { keys: ['⌘', 'H'], label: 'Home', description: 'Zur Übersicht' },
    { keys: ['⌘', '.'], label: 'Mora Nexus', description: 'AI Hub öffnen' },
    { keys: ['⌘', '⇧', 'M'], label: 'Memory', description: 'Memory Panel öffnen' },
    { keys: ['Esc'], label: 'Schließen', description: 'Oberstes Panel schließen' },
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
            // Skip if user is typing in an input field
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                               target.tagName === 'TEXTAREA' ||
                               target.isContentEditable;

            const meta = e.metaKey || e.ctrlKey;

            // Cmd+K = Spotlight (always works)
            if (meta && e.key === 'k') {
                e.preventDefault();
                onToggleSpotlight();
                return;
            }

            // Skip other shortcuts when typing
            if (isInputField) return;

            // Cmd+J = Chat
            if (meta && e.key === 'j') {
                e.preventDefault();
                onOpenChat?.();
                return;
            }

            // Cmd+F = Finder
            if (meta && e.key === 'f') {
                e.preventDefault();
                onOpenFinder?.();
                return;
            }

            // Cmd+N = Notes
            if (meta && e.key === 'n') {
                e.preventDefault();
                onOpenNotes?.();
                return;
            }

            // Cmd+, = Settings
            if (meta && e.key === ',') {
                e.preventDefault();
                onOpenSettings?.();
                return;
            }

            // Cmd+T = Terminal
            if (meta && e.key === 't') {
                e.preventDefault();
                onOpenTerminal?.();
                return;
            }

            // Cmd+H = Go Home
            if (meta && e.key === 'h') {
                e.preventDefault();
                onGoHome?.();
                return;
            }

            // Cmd+. = Mora Nexus
            if (meta && e.key === '.') {
                e.preventDefault();
                onOpenMoraHub?.();
                return;
            }

            // Cmd+Shift+M = Memory
            if (meta && e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                onOpenMemory?.();
                return;
            }

            // Escape = Close top pane
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseTopPane?.();
                return;
            }

            // ? = Show shortcuts (without Shift, just ?)
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                onShowShortcuts?.();
                return;
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
