/**
 * Planets and moons from data — stylebook 22.10.2026 (Bauauftrag part 3).
 *
 * A planet is a department from CORE, a moon is a space or a derived group that
 * actually holds data. Sizes, orbit placement, depth order and the matte tone are
 * pure functions here so every surface (universe, planet row, planet interior,
 * mini universe) uses the same numbers.
 */

export type Device = 'desktop' | 'phone';

/**
 * Upper bound for moons. The stylebook formula has none; a space with 100 documents
 * would be 934 px wide. Proposed cap, open for Marius' decision (see PR).
 */
export const MOON_MAX = { desktop: 128, phone: 96 } as const;

/** Moon diameter grows with what it holds; never below the 56-px touch target. */
export function moonSize(count: number, device: Device = 'desktop'): number {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const raw = device === 'phone' ? Math.max(56, 22 + n * 5) : Math.max(56, 34 + n * 9);
  return Math.min(MOON_MAX[device], raw);
}

/** Planet sizes: 60 px in the planet row, 58–72 px in the universe. */
export const PLANET_ROW_SIZE = 60;
export const UNIVERSE_PLANET_MIN = 58;
export const UNIVERSE_PLANET_MAX = 72;

export function universePlanetSize(size: number): number {
  const value = Number.isFinite(size) ? size : UNIVERSE_PLANET_MIN;
  return Math.round(Math.min(UNIVERSE_PLANET_MAX, Math.max(UNIVERSE_PLANET_MIN, value)));
}

/** Count badge: outside at the top-right edge, 22 px. */
export const COUNT_BADGE_SIZE = 22;

/**
 * Depth order: a planet lower in the field (larger y, closer to the viewer) is drawn
 * above one further back. y is the planet centre in % of the field height.
 */
export function depthZ(y: number): number {
  return 10 + Math.round(Math.min(100, Math.max(0, y)));
}

export interface OrbitPoint { x: number; y: number }

/** A point on an orbit ellipse centred in the field (% units, same formula for orbit and planet). */
export function pointOnOrbit(rx: number, aspect: number, angleDeg: number): OrbitPoint {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 50 + rx * Math.cos(rad), y: 50 + rx * aspect * Math.sin(rad) };
}

/**
 * Space between a planet's edge and MÔRA's circle in the field centre, in px.
 * Negative means the planet would touch or sit on MÔRA.
 */
export function clearanceFromMora(
  point: OrbitPoint,
  planetSize: number,
  field: { width: number; height: number },
  moraSize: number,
): number {
  const dx = ((point.x - 50) / 100) * field.width;
  const dy = ((point.y - 50) / 100) * field.height;
  return Math.hypot(dx, dy) - planetSize / 2 - moraSize / 2;
}

/** Matte planet tones from the stylebook prototype (no highlights, soft shade only). */
export const MATTE_TONES = [
  { key: 'sand', light: '#d9c9a8', dark: '#a8956f' },
  { key: 'clay', light: '#c9a08a', dark: '#8f6a55' },
  { key: 'sage', light: '#b5c3b0', dark: '#7e917a' },
  { key: 'stone', light: '#a9adb2', dark: '#6c7075' },
] as const;

export type MatteTone = (typeof MATTE_TONES)[number] & { background: string };

function hashName(name: string): number {
  let h = 2166136261;
  for (const ch of name.trim().toLowerCase()) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable matte tone for a name: the same department always gets the same colour. */
export function matteTone(name: string): MatteTone {
  const tone = MATTE_TONES[hashName(name || '?') % MATTE_TONES.length];
  return { ...tone, background: `radial-gradient(circle at 35% 30%, ${tone.light}, ${tone.dark} 70%)` };
}

/**
 * Moons that hold data. Derived groups with nothing in them do not appear;
 * spaces the user created stay, even while still empty.
 */
export function visibleMoons<T extends { count: number; derived?: boolean }>(moons: T[]): T[] {
  return moons.filter((moon) => !moon.derived || moon.count > 0);
}
