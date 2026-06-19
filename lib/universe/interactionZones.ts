/**
 * Universe interaction zones — planets are primary in the cosmos band;
 * widgets only capture pointer events at the peripheral edge bands.
 */

/** Normalised viewport rect for the planet field (excludes dock + top chrome). */
export const COSMOS_ZONE = {
    minX: 0.22,
    maxX: 0.78,
    minY: 0.12,
    maxY: 0.82,
} as const;

export type UniverseInteractionZone = 'cosmos' | 'peripheral';

export function resolveUniverseInteractionZone(
    normX: number,
    normY: number,
): UniverseInteractionZone {
    const inCosmos =
        normX >= COSMOS_ZONE.minX &&
        normX <= COSMOS_ZONE.maxX &&
        normY >= COSMOS_ZONE.minY &&
        normY <= COSMOS_ZONE.maxY;
    return inCosmos ? 'cosmos' : 'peripheral';
}

/** Grid columns reserved for peripheral widget bands (cols 0–2 left, 9–11 right). */
export const WIDGET_LEFT_BAND_MAX_COL = 3;
export const WIDGET_RIGHT_BAND_MIN_COL = 9;
export const WIDGET_GRID_COLS = 12;

/** True when a widget's grid footprint overlaps the central cosmos columns. */
export function widgetOverlapsCosmosColumns(x: number, w: number): boolean {
    const leftEdge = x;
    const rightEdge = x + w;
    const cosmosLeftCol = WIDGET_LEFT_BAND_MAX_COL;
    const cosmosRightCol = WIDGET_RIGHT_BAND_MIN_COL;
    return leftEdge < cosmosRightCol && rightEdge > cosmosLeftCol;
}

/** Normalised distance from a point to a planet position (both in 0–100 %). */
export function distanceToPlanetPercent(
    normX: number,
    normY: number,
    planetX: number,
    planetY: number,
): number {
    const dx = normX * 100 - planetX;
    const dy = normY * 100 - planetY;
    return Math.hypot(dx, dy);
}

/** Near-planet threshold in %-space (~120px on 1080p width). */
export const PLANET_PROXIMITY_THRESHOLD = 9;

export function isNearAnyPlanet(
    normX: number,
    normY: number,
    planets: ReadonlyArray<{ x: number; y: number }>,
    threshold = PLANET_PROXIMITY_THRESHOLD,
): boolean {
    return planets.some((p) => distanceToPlanetPercent(normX, normY, p.x, p.y) <= threshold);
}

export type UniverseFocusMode = 'explore' | 'peripheral' | 'widget';

/**
 * Derive focus mode from cursor zone, planet proximity, and optional widget hover.
 * explore = cosmos or near-planet → widgets yield pointer events to planets.
 */
export function resolveUniverseFocusMode(input: {
    zone: UniverseInteractionZone;
    nearPlanet: boolean;
    planetHovered: boolean;
    widgetHovered: boolean;
}): UniverseFocusMode {
    if (input.widgetHovered && input.zone === 'peripheral') return 'widget';
    if (input.planetHovered || input.zone === 'cosmos' || input.nearPlanet) return 'explore';
    return 'peripheral';
}

/** Opacity for peripheral glance widgets given focus mode. */
export function universeWidgetOpacity(focusMode: UniverseFocusMode, planetFocused: boolean): number {
    if (focusMode === 'explore') return planetFocused ? 0.14 : 0.18;
    if (planetFocused) return 0.22;
    return 0.38;
}
