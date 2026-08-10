/**
 * Saimôr estate URLs — shared across OS surfaces.
 * Product names: Saimôr OS · Saimôr Desk · YORI · Saimôr World
 */
export const ESTATE = {
  os: 'https://hq.saimor.world',
  api: 'https://api.saimor.world',
  desk: 'https://dash.saimor.world',
  /** OpenClaw/runtime console — not a product name in UI */
  runtime: 'https://larry.saimor.world',
  yori: 'https://yori.saimor.world',
  world: 'https://saimor.world',
} as const;

export const ESTATE_LABELS = {
  os: 'Saimôr OS',
  desk: 'Saimôr Desk',
  yori: 'YORI',
  world: 'Saimôr World',
  runtime: 'Runtime',
} as const;
