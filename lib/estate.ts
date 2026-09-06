import { getSurfaceProductLabel, SAIMOR_OS_PRODUCT } from '@/lib/os/surfaceContract';

/**
 * Saimôr estate URLs.
 *
 * Product model:
 * - Saimôr OS is the single user-facing product.
 * - Home/Heute is the personal starting surface inside the OS.
 * - dash.saimor.world is only a temporary compatibility host while its capabilities move into the canonical OS runtime.
 */
export const ESTATE = {
  os: 'https://hq.saimor.world',
  api: 'https://api.saimor.world',
  /** Temporary compatibility hostname. Do not expose it as a separate product or surface name. */
  desk: 'https://dash.saimor.world',
  /** OpenClaw/runtime console — not a product name in UI. */
  runtime: 'https://larry.saimor.world',
  yori: 'https://yori.saimor.world',
  world: 'https://saimor.world',
} as const;

export const ESTATE_LABELS = {
  os: SAIMOR_OS_PRODUCT.name,
  desk: getSurfaceProductLabel('home'),
  yori: 'YORI',
  world: 'Saimôr World',
  runtime: 'Runtime',
} as const;
