/**
 * Pure layout math for the Universe view (planet placement + route curves).
 * Extracted verbatim from components/home/UniverseView.tsx — no behavior change.
 * All functions are deterministic and side-effect-free.
 */

/** Percentage bounds for planet placement — tighter cluster around viewport centre. */
export const UNIVERSE_SAFE_BOUNDS = {
    minX: 28,
    maxX: 72,
    minY: 24,
    maxY: 68,
};

export const UNIVERSE_CORE_POINT = {
    x: 50,
    y: 50,
};

export const clampUniverseCoordinate = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

/** FNV-1a string hash → stable unsigned 32-bit int. */
export const stableUniverseHash = (value: string) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

export const routePointToward = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    offset: number
) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.max(0.01, Math.hypot(dx, dy));
    return {
        x: from.x + (dx / distance) * offset,
        y: from.y + (dy / distance) * offset,
    };
};

export const distancePointToSegment = (
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number }
) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
    const projection = {
        x: start.x + t * dx,
        y: start.y + t * dy,
    };
    return Math.hypot(point.x - projection.x, point.y - projection.y);
};

export const buildSoftUniverseRoute = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    key: string,
    endpointOffset: number,
    baseCurveRatio: number,
    curveMin: number,
    curveMax: number
) => {
    const start = routePointToward(from, to, endpointOffset);
    const end = routePointToward(to, from, endpointOffset);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const curveSign = stableUniverseHash(key) % 2 === 0 ? 1 : -1;
    const baseCurve = Math.min(curveMax, Math.max(curveMin, distance * baseCurveRatio)) * curveSign;
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const coreDistance = distancePointToSegment(UNIVERSE_CORE_POINT, start, end);
    const avoidStrength = coreDistance < 10 ? (10 - coreDistance) * 0.9 : 0;
    const avoidVector = {
        x: mid.x - UNIVERSE_CORE_POINT.x,
        y: mid.y - UNIVERSE_CORE_POINT.y,
    };
    const avoidDistance = Math.max(1, Math.hypot(avoidVector.x, avoidVector.y));
    const control = {
        x: mid.x + normalX * baseCurve + (avoidVector.x / avoidDistance) * avoidStrength,
        y: mid.y + normalY * baseCurve + (avoidVector.y / avoidDistance) * avoidStrength,
    };
    const c1 = {
        x: start.x * 0.58 + control.x * 0.42,
        y: start.y * 0.58 + control.y * 0.42,
    };
    const c2 = {
        x: end.x * 0.58 + control.x * 0.42,
        y: end.y * 0.58 + control.y * 0.42,
    };

    return {
        d: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
        labelX: (start.x * 0.24) + (control.x * 0.52) + (end.x * 0.24),
        labelY: (start.y * 0.24) + (control.y * 0.52) + (end.y * 0.24),
    };
};

export const buildOrganicUniverseLayout = (
    departments: Array<any>,
    metricsMap: Record<string, { nodes: number; spaces: number; folders: number; health: number }>,
) => {
    const count = departments.length;
    if (count === 0) return [];

    const maxSignal = Math.max(
        1,
        ...departments.map((dept) => {
            const metrics = metricsMap[dept.id];
            return (metrics?.nodes || 0) + (metrics?.folders || 0) * 2 + (metrics?.spaces || 0) * 3;
        })
    );

    const orderedDepartments = departments
        .map((dept) => ({
            dept,
            seed: stableUniverseHash(`${dept.id || ''}:${dept.name || ''}`),
        }))
        .sort((a, b) => a.seed - b.seed);

    const points = orderedDepartments.map(({ dept, seed }, index) => {
        const angleStep = (Math.PI * 2) / Math.max(1, count);
        const angularJitter = ((((seed >>> 8) % 100) / 100) - 0.5) * Math.min(0.22, angleStep * 0.34);
        const angle = (-Math.PI / 2) + (index * angleStep) + angularJitter;
        const metrics = metricsMap[dept.id];
        const signal = (metrics?.nodes || 0) + (metrics?.folders || 0) * 2 + (metrics?.spaces || 0) * 3;
        const vitality = Math.min(1, signal / maxSignal);
        const radialJitter = (((seed >>> 12) % 100) / 100) * 0.05;
        const radiusBias = 0.42 + (1 - vitality) * 0.10 + radialJitter;
        const rx = 8 + radiusBias * 12;
        const ry = 5 + radiusBias * 8;

        return {
            ...dept,
            color: dept.color,
            x: clampUniverseCoordinate(
                UNIVERSE_CORE_POINT.x + (rx * Math.cos(angle)),
                UNIVERSE_SAFE_BOUNDS.minX,
                UNIVERSE_SAFE_BOUNDS.maxX
            ),
            y: clampUniverseCoordinate(
                UNIVERSE_CORE_POINT.y + (ry * Math.sin(angle)),
                UNIVERSE_SAFE_BOUNDS.minY,
                UNIVERSE_SAFE_BOUNDS.maxY
            ),
            angle,
            rx,
            ry,
            ringIndex: Math.floor(radiusBias * 3),
        };
    });

    const minDistance = count > 14 ? 5.2 : count > 8 ? 6.2 : 7.4;
    for (let iteration = 0; iteration < 28; iteration += 1) {
        for (const point of points) {
            const dx = point.x - UNIVERSE_CORE_POINT.x;
            const dy = (point.y - UNIVERSE_CORE_POINT.y) * 1.18;
            const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
            const coreDistance = count > 10 ? 5.5 : 6.5;
            if (distance >= coreDistance) continue;

            const push = (coreDistance - distance) * 0.34;
            point.x = clampUniverseCoordinate(point.x + (dx / distance) * push, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);
            point.y = clampUniverseCoordinate(point.y + ((dy / distance) * push) / 1.18, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);
        }

        for (let i = 0; i < points.length; i += 1) {
            for (let j = i + 1; j < points.length; j += 1) {
                const a = points[i];
                const b = points[j];
                const dx = a.x - b.x;
                const dy = (a.y - b.y) * 1.15;
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
                if (distance >= minDistance) continue;

                const push = (minDistance - distance) * 0.28;
                const nx = dx / distance;
                const ny = dy / distance;
                a.x = clampUniverseCoordinate(a.x + nx * push, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);
                a.y = clampUniverseCoordinate(a.y + (ny * push) / 1.15, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);
                b.x = clampUniverseCoordinate(b.x - nx * push, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);
                b.y = clampUniverseCoordinate(b.y - (ny * push) / 1.15, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);
            }
        }
    }

    return points;
};
