/**
 * ORBIT MATH ENGINE
 * Handles all orbital positioning calculations for the Mora system
 *
 * Used for:
 * - Owner View: Company bubbles orbiting Mora
 * - Company View: Department bubbles orbiting company center
 * - Space/Folder Views: Entity positioning
 */

export interface OrbitPosition {
    x: number;
    y: number;
    angle: number; // In radians
    index: number;
}

export interface AnchorPoint {
    id: string;
    x: number;
    y: number;
    radius: number;
    label?: string;
}

/**
 * Calculate evenly distributed positions on a circular orbit or arc
 * @param count - Number of items to place
 * @param radius - Orbit radius in pixels
 * @param center - Center point {x, y}, defaults to {0, 0}
 * @param startAngle - Starting angle in radians, defaults to -π/2 (top)
 * @param arcAngle - Arc angle in radians (optional, defaults to 2π for full circle)
 * @returns Array of position objects with x, y coordinates
 */
export function calculateOrbitPositions(
    count: number,
    radius: number,
    center: { x: number; y: number } = { x: 0, y: 0 },
    startAngle: number = -Math.PI / 2,
    arcAngle?: number
): OrbitPosition[] {
    if (count === 0) return [];

    // If arcAngle provided, use it; otherwise use full circle
    const totalAngle = arcAngle ?? (2 * Math.PI);
    const step = count > 1 ? totalAngle / (count - 1) : 0;

    return Array.from({ length: count }, (_, i) => {
        const angle = startAngle + i * step;
        return {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
            angle,
            index: i
        };
    });
}

/**
 * Calculate dynamic radius based on item count
 * Ensures items don't overlap and maintains visual balance
 * @param itemCount - Number of items
 * @param itemSize - Size of each item bubble (diameter)
 * @param minRadius - Minimum orbit radius
 * @param maxRadius - Maximum orbit radius
 * @returns Optimal radius in pixels
 */
export function calculateDynamicRadius(
    itemCount: number,
    itemSize: number = 80,
    minRadius: number = 200,
    maxRadius: number = 500
): number {
    // Calculate circumference needed for all items with spacing
    const spacingFactor = 1.5; // 50% spacing between items
    const requiredCircumference = itemCount * itemSize * spacingFactor;

    // Calculate radius from circumference (C = 2πr)
    const calculatedRadius = requiredCircumference / (2 * Math.PI);

    // Clamp to min/max bounds
    return Math.max(minRadius, Math.min(maxRadius, calculatedRadius));
}

/**
 * Convert OrbitPositions to AnchorPoints for canvas rendering
 * @param positions - Orbit positions
 * @param idPrefix - Prefix for anchor IDs
 * @param bubbleRadius - Radius of each bubble
 * @returns Array of AnchorPoints
 */
export function positionsToAnchorPoints(
    positions: OrbitPosition[],
    idPrefix: string = 'anchor',
    bubbleRadius: number = 40
): AnchorPoint[] {
    return positions.map((pos, i) => ({
        id: `${idPrefix}-${i}`,
        x: pos.x,
        y: pos.y,
        radius: bubbleRadius
    }));
}

/**
 * Calculate positions for grouped orbits (e.g., departments by category)
 * @param groups - Array of group objects with count and category
 * @param radius - Base orbit radius
 * @param center - Center point
 * @returns Map of category to positions
 */
export function calculateGroupedOrbitPositions(
    groups: { category: string; count: number }[],
    radius: number,
    center: { x: number; y: number } = { x: 0, y: 0 }
): Record<string, OrbitPosition[]> {
    const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
    const step = (2 * Math.PI) / totalCount;
    const startAngle = -Math.PI / 2;

    const result: Record<string, OrbitPosition[]> = {};
    let currentIndex = 0;

    for (const group of groups) {
        const positions: OrbitPosition[] = [];
        for (let i = 0; i < group.count; i++) {
            const angle = startAngle + (currentIndex + i) * step;
            positions.push({
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle),
                angle,
                index: currentIndex + i
            });
        }
        result[group.category] = positions;
        currentIndex += group.count;
    }

    return result;
}

/**
 * Calculate screen-center accounting for sidebars
 * @param screenWidth - Total viewport width
 * @param leftSidebarWidth - Width of left sidebar (e.g., TreeSidebar = 72px)
 * @param rightPanelWidth - Width of right panel (e.g., IntelligencePlayfield = 350px)
 * @returns Adjusted center point {x, y}
 */
export function calculateVisualCenter(
    screenWidth: number,
    screenHeight: number,
    leftSidebarWidth: number = 72,
    rightPanelWidth: number = 350
): { x: number; y: number } {
    // Available width after sidebars
    const availableWidth = screenWidth - leftSidebarWidth - rightPanelWidth;

    // Visual center is in the middle of available space, offset by left sidebar
    const x = leftSidebarWidth + availableWidth / 2;
    const y = screenHeight / 2;

    return { x, y };
}
