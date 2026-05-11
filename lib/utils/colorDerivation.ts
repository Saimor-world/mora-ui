'use client';

/**
 * Derives a consistent, aesthetic accent color from a string (domain or company name).
 * Used to personalize the OS experience for new leads from the website check.
 */

const ADAPTIVE_PALETTE = [
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F43F5E', // Rose
    '#F97316', // Orange
    '#D4AF37', // Gold
    '#0EA5E9', // Sky
    '#6366F1', // Indigo
    '#EC4899', // Pink
];

export function deriveColorFromText(text: string): string {
    if (!text) return ADAPTIVE_PALETTE[0];
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use hash to pick a color from the palette
    const index = Math.abs(hash) % ADAPTIVE_PALETTE.length;
    return ADAPTIVE_PALETTE[index];
}

/**
 * Returns a glow style object based on the derived color.
 */
export function getAdaptiveGlow(color: string, intensity: number = 0.4) {
    return {
        boxShadow: `0 0 40px ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
        borderColor: `${color}40`,
    };
}
