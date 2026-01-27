/**
 * useKeyboardShortcuts - Global Keyboard Shortcuts
 *
 * Handles:
 * - Cmd+K / Ctrl+K = Toggle Spotlight
 */

import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
    onToggleSpotlight: () => void;
}

export function useKeyboardShortcuts({ onToggleSpotlight }: UseKeyboardShortcutsOptions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K = Spotlight
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onToggleSpotlight();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToggleSpotlight]);
}
