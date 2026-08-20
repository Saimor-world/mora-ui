/**
 * Universe interaction zones — planets are primary in the cosmos band;
 * widgets only capture pointer events at the peripheral edge bands.
 */

/** Normalised viewport rect — tight halo around the planet cluster, not a full-width band. */
export const COSMOS_ZONE = {
    minX: 0.44,
    maxX: 0.56,
    minY: 0.30,
    maxY: 0.64,
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

/** Grid columns reserved for peripheral widget bands (cols 0–4 left, 7–11 right). */
export const WIDGET_LEFT_BAND_MAX_COL = 5;
export const WIDGET_RIGHT_BAND_MIN_COL = 7;
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

/** Opacity for peripheral glance widgets given focus mode.
 *  Widgets stay legible at all times — they recede when exploring planets,
 *  but never fade to ghost levels. Hovering a widget brings it fully forward. */
export function universeWidgetOpacity(focusMode: UniverseFocusMode, planetFocused: boolean): number {
    if (focusMode === 'widget') return 0.94;
    if (focusMode === 'explore') return planetFocused ? 0.30 : 0.42;
    if (planetFocused) return 0.54;
    return 0.72;
}
