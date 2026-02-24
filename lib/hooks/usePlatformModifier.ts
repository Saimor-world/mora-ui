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
