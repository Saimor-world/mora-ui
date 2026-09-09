"use client";

/**
 * useKeyboardShortcuts - global OS keyboard shortcuts.
 *
 * Browser-reserved shortcuts stay out of the public contract where possible.
 * Alt+N is used for notes because Ctrl/Cmd+N is owned by the browser.
 *
 * Stand 0 invariant: MÔRA is an OS workspace, not a second product or a
 * historical Desk destination. Cmd/Ctrl+J therefore uses the canonical
 * workspace opener directly. Cmd/Ctrl+L is left to the browser.
 */

import { useEffect } from 'react';
import {
    getPlatformModifier,
    getSpotlightShortcutKeys,
    isSpotlightShortcut,
} from '@/lib/hooks/usePlatformModifier';
import { openMoraWorkspace } from '@/lib/os/openMoraWorkspace';
import { usePaneStore } from '@/lib/store/paneStore';

export function getKeyboardShortcuts(mod?: string) {
    const m = mod || getPlatformModifier();
    return [
        { keys: getSpotlightShortcutKeys(m), label: 'Spotlight', description: 'Command Palette öffnen' },
        { keys: ['Alt', '1'], label: 'Fokus', description: 'Aktives Fenster maximieren' },
        { keys: ['Alt', '2'], label: 'Split 50/50', description: 'Zwei Fenster nebeneinander anordnen' },
        { keys: ['Alt', '3'], label: '3 Spalten', description: 'Drei Fenster nebeneinander anordnen' },
        { keys: ['Alt', '0'], label: 'Aufräumen', description: 'Alle Fenster schließen' },
        { keys: [m, 'J'], label: 'MÔRA', description: 'MÔRA öffnen' },
        { keys: [m, 'F'], label: 'Finder', description: 'Dateien durchsuchen' },
        { keys: ['Alt', 'N'], label: 'Notes', description: 'Notizen öffnen' },
        { keys: [m, ','], label: 'System', description: 'Einstellungen öffnen' },
        { keys: [m, 'H'], label: 'Start', description: 'Zur Übersicht' },
        { keys: [m, 'A'], label: 'Sprache', description: 'Voice-Overlay umschalten (Alt+A bleibt Fallback)' },
        { keys: ['Esc'], label: 'Schließen', description: 'Oberstes Panel schließen' },
        { keys: ['?'], label: 'Hilfe', description: 'Shortcuts anzeigen' },
    ];
}

interface UseKeyboardShortcutsOptions {
    onToggleSpotlight: () => void;
    /** @deprecated MÔRA is opened canonically inside this hook. */
    onOpenChat?: () => void;
    onOpenFinder?: () => void;
    onOpenNotes?: () => void;
    onOpenSettings?: () => void;
    onGoHome?: () => void;
    onOpenAmbient?: () => void;
    /** @deprecated Historical Desk/Larry shortcut; retained only for call-site compatibility. */
    onOpenLarry?: () => void;
    onCloseTopPane?: () => void;
    onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts({
    onToggleSpotlight,
    onOpenFinder,
    onOpenNotes,
    onOpenSettings,
    onGoHome,
    onOpenAmbient,
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

            if (e.altKey && !meta) {
                if (key === '1') {
                    e.preventDefault();
                    usePaneStore.getState().applyLayoutPreset('focus_single');
                    return;
                }
                if (key === '2') {
                    e.preventDefault();
                    usePaneStore.getState().applyLayoutPreset('split_50_50');
                    return;
                }
                if (key === '3') {
                    e.preventDefault();
                    usePaneStore.getState().applyLayoutPreset('triple_columns');
                    return;
                }
                if (key === '0') {
                    e.preventDefault();
                    usePaneStore.getState().applyLayoutPreset('close_all');
                    return;
                }
            }

            if (meta && key === 'j') {
                e.preventDefault();
                openMoraWorkspace({ source: 'system' });
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

            if ((meta && key === 'a') || (e.altKey && !meta && (key === 'a' || e.code === 'KeyA'))) {
                e.preventDefault();
                e.stopPropagation();
                onOpenAmbient?.();
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
        onOpenFinder,
        onOpenNotes,
        onOpenSettings,
        onGoHome,
        onOpenAmbient,
        onCloseTopPane,
        onShowShortcuts,
    ]);
}
