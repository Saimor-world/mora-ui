'use client';

import { useState, useEffect, useCallback } from 'react';

// Default accent colors
export const ACCENT_COLORS = {
    emerald: '#10B981',
    gold: '#D4AF37',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    rose: '#F43F5E',
    orange: '#F97316',
    cyan: '#06B6D4',
} as const;

export type AccentColorKey = keyof typeof ACCENT_COLORS;

const STORAGE_KEY = 'saimor_accent_color';
const DEFAULT_COLOR = ACCENT_COLORS.emerald;

/**
 * useAccentColor - Global accent color hook
 * 
 * Reads from localStorage and provides reactive updates.
 * Used for:
 * - Orb glow color
 * - Button highlights
 * - Connection lines
 * - Company branding
 */
export function useAccentColor() {
    const [accentColor, setAccentColorState] = useState<string>(DEFAULT_COLOR);

    // Load initial value
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setAccentColorState(stored);
            }
        }
    }, []);

    // Listen for changes from other components
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                setAccentColorState(e.newValue);
            }
        };

        // Also listen for custom event for same-tab updates
        const handleAccentChange = (e: CustomEvent<string>) => {
            setAccentColorState(e.detail);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('accent-color-change' as any, handleAccentChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('accent-color-change' as any, handleAccentChange);
        };
    }, []);

    // Setter that also updates localStorage and broadcasts
    const setAccentColor = useCallback((color: string) => {
        setAccentColorState(color);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, color);
            // Broadcast to other components in same tab
            window.dispatchEvent(new CustomEvent('accent-color-change', { detail: color }));
        }
    }, []);

    // Get CSS variables based on accent color
    const getCssVars = useCallback(() => ({
        '--accent-color': accentColor,
        '--accent-color-light': accentColor + '40',
        '--accent-color-dark': accentColor + 'CC',
        '--accent-glow': `0 0 20px ${accentColor}40`,
    } as React.CSSProperties), [accentColor]);

    return {
        accentColor,
        setAccentColor,
        getCssVars,
        isGold: accentColor === ACCENT_COLORS.gold,
        isEmerald: accentColor === ACCENT_COLORS.emerald,
    };
}

export default useAccentColor;
