/**
 * Universe desktop widgets are peripheral glance annotations — not full dashboards.
 * These caps keep saved layouts honest while still allowing user resize within mins.
 */

export const UNIVERSE_GLANCE_BAND = {
    totalCols: 12,
    leftEnd: 5,
    rightStart: 7,
    bandWidth: 5,
} as const;

/** Suggested default footprint per widget type on the universe surface. */
export const UNIVERSE_GLANCE_DEFAULTS: Record<string, { w: number; h: number }> = {
    nightwatch: { w: 3, h: 4 },
    clock: { w: 2, h: 2 },
    orgStats: { w: 3, h: 3 },
    bridgePulse: { w: 3, h: 3 },
    larryWork: { w: 3, h: 5 },
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
    larryWork: { maxW: 3, maxH: 5, minW: 2, minH: 3 },
    signals: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    team: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    meinTag: { maxW: 3, maxH: 5, minW: 2, minH: 3 },
    mora: { maxW: 3, maxH: 3, minW: 2, minH: 2 },
    quickActions: { maxW: 3, maxH: 3, minW: 2, minH: 2 },
};

/** Suggested default footprint per widget type on the department cosmos surface. */
export const DEPARTMENT_GLANCE_DEFAULTS: Record<string, { w: number; h: number }> = {
    deptStats: { w: 3, h: 4 },
    nightwatch: { w: 3, h: 4 },
    signals: { w: 2, h: 3 },
    team: { w: 2, h: 3 },
    quickActions: { w: 3, h: 2 },
    mora: { w: 3, h: 2 },
};

/** Hard caps — department shares universe glance sizing. */
export const DEPARTMENT_GLANCE_CAPS: Record<string, { maxW: number; maxH: number; minW: number; minH: number }> = {
    deptStats: { maxW: 3, maxH: 5, minW: 2, minH: 3 },
    nightwatch: { maxW: 3, maxH: 5, minW: 2, minH: 3 },
    signals: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    team: { maxW: 3, maxH: 4, minW: 2, minH: 2 },
    quickActions: { maxW: 3, maxH: 3, minW: 2, minH: 2 },
    mora: { maxW: 3, maxH: 3, minW: 2, minH: 2 },
};

export function departmentGlanceMins(type: string) {
    const caps = DEPARTMENT_GLANCE_CAPS[type] ?? UNIVERSE_GLANCE_CAPS[type];
    return caps ? { minW: caps.minW, minH: caps.minH } : { minW: 2, minH: 2 };
}

export function departmentWidgetDefaults(type: string): { w: number; h: number } {
    return DEPARTMENT_GLANCE_DEFAULTS[type] ?? UNIVERSE_GLANCE_DEFAULTS[type] ?? { w: 2, h: 2 };
}

export const UNIVERSE_ROW_HEIGHT = 50;

export function universeGlanceMins(type: string) {
    const caps = UNIVERSE_GLANCE_CAPS[type];
    return caps ? { minW: caps.minW, minH: caps.minH } : { minW: 2, minH: 2 };
}
