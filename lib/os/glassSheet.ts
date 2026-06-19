/**
 * Shared glass-sheet presentation for universe-native app panes.
 * Universe stays visible behind dimmed blur — not full-bleed takeovers.
 */

import type { PaneType } from '@/lib/surface/surfaceRegistry';

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

/**
 * Sheet anchor model — where an app sheet first appears over the cosmos.
 *
 * Universe stays alive behind every sheet (dim backdrop), so anchoring is purely
 * a sensible *starting* edge. The sheet remains fully draggable afterwards.
 *
 *   left   → hugs the left edge (e.g. Mail — reading column on the left)
 *   right  → hugs the right edge (e.g. Team — roster rail on the right)
 *   center → balanced default for everything else
 */
export type SheetAnchor = 'left' | 'right' | 'center';

/** Apps with an opinionated default anchor. Unlisted apps fall back to center. */
export const APP_SHEET_ANCHORS: Partial<Record<PaneType, SheetAnchor>> = {
    mail: 'left',
    team: 'right',
};

/** Resolve the default anchor for a pane type (center when unspecified). */
export function getSheetAnchor(type: PaneType): SheetAnchor {
    return APP_SHEET_ANCHORS[type] ?? 'center';
}
