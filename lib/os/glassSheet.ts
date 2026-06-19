/**
 * Shared glass-sheet presentation for universe-native app panes.
 * Universe stays visible behind dimmed blur — not full-bleed takeovers.
 */

export const GLASS_SHEET_PRESENTATION = {
    dimBackground: true,
    dimOpacity: 0.28,
    blurIntensity: 24,
    opacity: 0.38,
} as const;

/** ~70% viewport sheet — leaves starfield + dock breathing room */
export const GLASS_SHEET_SIZE = {
    width: 920,
    height: 640,
} as const;

export const GLASS_SHEET_SIZE_WIDE = {
    width: 1040,
    height: 680,
} as const;

export const GLASS_SHEET_SIZE_COMPACT = {
    width: 780,
    height: 560,
} as const;

/** Default open request fields for core workspace apps */
export function glassSheetPaneDefaults(size = GLASS_SHEET_SIZE) {
    return {
        size,
        ...GLASS_SHEET_PRESENTATION,
    };
}
