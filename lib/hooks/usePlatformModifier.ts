"use client";

import { useState, useEffect } from 'react';

/**
 * Detect whether the user is on macOS/iOS.
 * Returns 'Cmd' for Apple platforms, 'Strg' for everything else (German label for Ctrl).
 */
export function getPlatformModifier(): string {
    if (typeof navigator === 'undefined') return 'Strg';
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? 'Cmd' : 'Strg';
}

/**
 * React hook that returns the correct modifier key label for the current platform.
 * - macOS/iOS → 'Cmd'
 * - Windows/Linux → 'Strg'
 */
export function usePlatformModifier(): string {
    const [modifier, setModifier] = useState('Strg');

    useEffect(() => {
        setModifier(getPlatformModifier());
    }, []);

    return modifier;
}

/** Spotlight: Cmd+K on macOS, Alt+K on Windows/Linux (Ctrl+K is browser-owned). */
export function getSpotlightShortcutKeys(mod?: string): string[] {
    const m = mod || getPlatformModifier();
    return m === 'Cmd' ? [m, 'K'] : ['Alt', 'K'];
}

export function getSpotlightShortcutLabel(mod?: string): string {
    return getSpotlightShortcutKeys(mod).join('+');
}

export function isSpotlightShortcut(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const meta = event.metaKey || event.ctrlKey;
    if (getPlatformModifier() === 'Cmd') {
        return meta && key === 'k';
    }
    return event.altKey && !meta && key === 'k';
}
