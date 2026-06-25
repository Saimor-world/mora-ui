"use client";

/**
 * useKeyboardShortcuts - global OS keyboard shortcuts.
 *
 * Browser-reserved shortcuts stay out of the public contract where possible.
 * Alt+N is used for notes because Ctrl/Cmd+N is owned by the browser.
 */

import { useEffect } from 'react';
import {
    getPlatformModifier,
    getSpotlightShortcutKeys,
    isSpotlightShortcut,
} from '@/lib/hooks/usePlatformModifier';

export function getKeyboardShortcuts(mod?: string) {
    const m = mod || getPlatformModifier();
    return [
        { keys: getSpotlightShortcutKeys(m), label: 'Spotlight', description: 'Command Palette öffnen' },
        { keys: [m, 'J'], label: 'Chat', description: 'Mora Chat öffnen' },
        { keys: [m, 'F'], label: 'Finder', description: 'Dateien durchsuchen' },
        { keys: ['Alt', 'N'], label: 'Notes', description: 'Notizen öffnen' },
        { keys: [m, ','], label: 'System', description: 'Einstellungen öffnen' },
        { keys: [m, 'H'], label: 'Start', description: 'Zur Uebersicht' },
        { keys: ['Alt', 'A'], label: 'Sprache', description: 'Voice-Overlay öffnen (Push-to-Talk)' },
        { keys: [m, 'L'], label: 'Larry', description: 'Larry Dashboard öffnen' },
        { keys: ['Esc'], label: 'Schliessen', description: 'Oberstes Panel schliessen' },
        { keys: ['?'], label: 'Hilfe', description: 'Shortcuts anzeigen' },
    ];
}

interface UseKeyboardShortcutsOptions {
    onToggleSpotlight: () => void;
    onOpenChat?: () => void;
    onOpenFinder?: () => void;
    onOpenNotes?: () => void;
    onOpenSettings?: () => void;
    onGoHome?: () => void;
    onOpenAmbient?: () => void;
    onOpenLarry?: () => void;
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
    onOpenAmbient,
    onOpenLarry,
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
            const key = e.key.toLowerCase();

            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseTopPane?.();
                return;
            }

            if (isSpotlightShortcut(e)) {
                e.preventDefault();
                onToggleSpotlight();
                return;
            }

            if (isInputField) return;

            if (meta && key === 'j') {
                e.preventDefault();
                onOpenChat?.();
                return;
            }

            if (meta && key === 'f') {
                e.preventDefault();
                onOpenFinder?.();
                return;
            }

            if ((meta && key === 'n') || (e.altKey && !meta && key === 'n')) {
                e.preventDefault();
                onOpenNotes?.();
                return;
            }

            if (meta && key === ',') {
                e.preventDefault();
                onOpenSettings?.();
                return;
            }

            if (meta && key === 'h') {
                e.preventDefault();
                onGoHome?.();
                return;
            }

            if (e.altKey && !meta && (key === 'a' || e.code === 'KeyA')) {
                e.preventDefault();
                e.stopPropagation();
                onOpenAmbient?.();
                return;
            }

            if (meta && key === 'l') {
                e.preventDefault();
                onOpenLarry?.();
                return;
            }

            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                onShowShortcuts?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [
        onToggleSpotlight,
        onOpenChat,
        onOpenFinder,
        onOpenNotes,
        onOpenSettings,
        onGoHome,
        onOpenAmbient,
        onOpenLarry,
        onCloseTopPane,
        onShowShortcuts,
    ]);
}
