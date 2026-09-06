import { getSurfaceProductLabel, SAIMOR_OS_PRODUCT } from '@/lib/os/surfaceContract';

/**
 * Saimôr estate URLs.
 *
 * Product model:
 * - Saimôr OS is the product.
 * - Desk is the personal home surface inside the OS.
 * - dash.saimor.world is a legacy compatibility host during migration.
 */
export const ESTATE = {
  os: 'https://hq.saimor.world',
  api: 'https://api.saimor.world',
  /** Legacy compatibility host for the Desk surface during OS unification. */
  desk: 'https://dash.saimor.world',
  /** OpenClaw/runtime console — not a product name in UI. */
  runtime: 'https://larry.saimor.world',
  yori: 'https://yori.saimor.world',
  world: 'https://saimor.world',
} as const;

export const ESTATE_LABELS = {
  os: SAIMOR_OS_PRODUCT.name,
  desk: getSurfaceProductLabel('desk'),
  yori: 'YORI',
  world: 'Saimôr World',
  runtime: 'Runtime',
} as const;
