/**

 * Pure layout math for the Universe view (planet placement + route curves).

 * Extracted verbatim from components/home/UniverseView.tsx — no behavior change.

 * All functions are deterministic and side-effect-free.

 */



/** Percentage bounds for planet placement — wide enough to breathe across the
 *  canvas, still clear of the corner widget clusters (x<26 / x>74, y<24 / y>72). */

export const UNIVERSE_SAFE_BOUNDS = {

    minX: 26,

    maxX: 74,

    minY: 24,

    maxY: 72,

};



export const UNIVERSE_CORE_POINT = {

    x: 50,

    y: 50,

};



/** Minimum centre-to-centre gap in viewport % (clears ~118px planet + halo on 1080p). */

export const universeMinPlanetSeparation = (count: number) => {
    if (count <= 4) return 18;
    if (count <= 8) return 14;
    if (count <= 14) return 10;
    return 7.5;
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



type UniverseLayoutPoint = {

    x: number;

    y: number;

    [key: string]: unknown;

};



const universePairDistance = (a: UniverseLayoutPoint, b: UniverseLayoutPoint) => {

    const dx = a.x - b.x;

    const dy = (a.y - b.y) * 1.15;

    return Math.max(0.01, Math.sqrt(dx * dx + dy * dy));

};



const clampUniversePoint = (point: UniverseLayoutPoint) => {

    point.x = clampUniverseCoordinate(point.x, UNIVERSE_SAFE_BOUNDS.minX, UNIVERSE_SAFE_BOUNDS.maxX);

    point.y = clampUniverseCoordinate(point.y, UNIVERSE_SAFE_BOUNDS.minY, UNIVERSE_SAFE_BOUNDS.maxY);

};



const resolveUniverseCollisions = (

    points: UniverseLayoutPoint[],

    minDistance: number,

    coreDistance: number,

    iterations: number,

) => {

    const pushStrength = points.length <= 6 ? 0.36 : 0.28;



    for (let iteration = 0; iteration < iterations; iteration += 1) {

        for (const point of points) {

            const dx = point.x - UNIVERSE_CORE_POINT.x;

            // Vertical units render shorter than horizontal (stretched 100×100
            // viewBox), so weight y BELOW 1 here — that pushes top/bottom planets
            // further out in real pixels and keeps them clear of the core sphere.
            const dy = (point.y - UNIVERSE_CORE_POINT.y) * 0.82;

            const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));

            if (distance >= coreDistance) continue;



            const push = (coreDistance - distance) * 0.34;

            point.x += (dx / distance) * push;

            point.y += ((dy / distance) * push) / 0.82;

            clampUniversePoint(point);

        }



        for (let i = 0; i < points.length; i += 1) {

            for (let j = i + 1; j < points.length; j += 1) {

                const a = points[i];

                const b = points[j];

                const dx = a.x - b.x;

                const dy = (a.y - b.y) * 1.15;

                const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));

                if (distance >= minDistance) continue;



                const push = (minDistance - distance) * pushStrength;

                const nx = dx / distance;

                const ny = dy / distance;

                a.x += nx * push;

                a.y += (ny * push) / 1.15;

                b.x -= nx * push;

                b.y -= (ny * push) / 1.15;

                clampUniversePoint(a);

                clampUniversePoint(b);

            }

        }

    }

};



const minUniversePairDistance = (points: UniverseLayoutPoint[]) => {

    let minDistance = Infinity;

    for (let i = 0; i < points.length; i += 1) {

        for (let j = i + 1; j < points.length; j += 1) {

            minDistance = Math.min(minDistance, universePairDistance(points[i], points[j]));

        }

    }

    return minDistance;

};



const expandUniverseCluster = (points: UniverseLayoutPoint[], targetMinDistance: number) => {

    const currentMin = minUniversePairDistance(points);

    if (!Number.isFinite(currentMin) || currentMin >= targetMinDistance) return;



    const scale = (targetMinDistance / currentMin) * 1.04;

    for (const point of points) {

        point.x = UNIVERSE_CORE_POINT.x + (point.x - UNIVERSE_CORE_POINT.x) * scale;

        point.y = UNIVERSE_CORE_POINT.y + (point.y - UNIVERSE_CORE_POINT.y) * scale;

        clampUniversePoint(point);

    }

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

    const compactCluster = count <= 6;

    const points = orderedDepartments.map(({ dept, seed }, index) => {
        const angleStep = (Math.PI * 2) / Math.max(1, count);
        const angularJitterScale = compactCluster ? 0.08 : 0.12;
        const angularJitter = ((((seed >>> 8) % 100) / 100) - 0.5)
            * Math.min(angularJitterScale, angleStep * (compactCluster ? 0.15 : 0.25));
        const angle = (-Math.PI / 2) + (index * angleStep) + angularJitter;
        const metrics = metricsMap[dept.id];
        const signal = (metrics?.nodes || 0) + (metrics?.folders || 0) * 2 + (metrics?.spaces || 0) * 3;
        const vitality = Math.min(1, signal / maxSignal);
        const radialJitter = (((seed >>> 12) % 100) / 100) * 0.03;
        const radiusBias = 0.40 + (1 - vitality) * 0.10 + radialJitter;

        // Generous orbit radius scaling so department planet nodes breathe clear of the central core
        const countRadiusFactor = count <= 4 ? 2.1 : count <= 6 ? 1.85 : count <= 10 ? 1.5 : 1.2;
        const rx = (12 + radiusBias * 10) * countRadiusFactor;
        const ry = (9.5 + radiusBias * 8) * countRadiusFactor;

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



    const minDistance = universeMinPlanetSeparation(count);

    // Min radial gap from the central Saimôr core so no planet hides behind it.
    // The 100×100 layout space is stretched to a ~2.25:1 viewport, so vertical
    // units render shorter — a top planet needs a large gap (~18u ≈ 106px) to
    // clear the solid core sphere on a short window.
    const coreDistance = count > 10 ? 4.5 : count <= 4 ? 18 : count <= 6 ? 11 : 6;

    const iterations = compactCluster ? 36 : 28;



    expandUniverseCluster(points, minDistance);

    resolveUniverseCollisions(points, minDistance, coreDistance, iterations);



    if (compactCluster && minUniversePairDistance(points) < minDistance * 0.98) {

        expandUniverseCluster(points, minDistance);

        resolveUniverseCollisions(points, minDistance, coreDistance, iterations);

    }



    return points;

};


