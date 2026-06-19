/**
 * Universe desktop widgets are peripheral glance annotations — not full dashboards.
 * These caps keep saved layouts honest while still allowing user resize within mins.
 */

export const UNIVERSE_GLANCE_BAND = {
    totalCols: 12,
    leftEnd: 3,
    rightStart: 9,
    bandWidth: 3,
} as const;

/** Suggested default footprint per widget type on the universe surface. */
export const UNIVERSE_GLANCE_DEFAULTS: Record<string, { w: number; h: number }> = {
    nightwatch: { w: 3, h: 4 },
    clock: { w: 2, h: 2 },
    orgStats: { w: 3, h: 3 },
    bridgePulse: { w: 3, h: 3 },
    signals: { w: 2, h: 3 },
    team: { w: 2, h: 3 },
    meinTag: { w: 3, h: 4 },
    mora: { w: 3, h: 2 },
    quickActions: { w: 3, h: 2 },
};

/** Hard caps applied on every universe layout load/save (one-time compact reflow). */
export const UNIVERSE_GLANCE_CAPS: Record<string, { maxW: number; maxH: number; minW: number; minH: number }> = {
    clock: { maxW: 2, maxH: 2, minW: 2, minH: 2 },
    nightwatch: { maxW: 3, maxH: 5, minW: 2, minH: 3 },
    orgStats: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    bridgePulse: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    signals: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    team: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    meinTag: { maxW: 3, maxH: 5, minW: 2, minH: 3 },
    mora: { maxW: 3, maxH: 3, minW: 2, minH: 2 },
    quickActions: { maxW: 3, maxH: 3, minW: 2, minH: 2 },
};

export const UNIVERSE_ROW_HEIGHT = 50;

export function universeGlanceMins(type: string) {
    const caps = UNIVERSE_GLANCE_CAPS[type];
    return caps ? { minW: caps.minW, minH: caps.minH } : { minW: 2, minH: 2 };
}
