export type SurfaceKind = 'gas' | 'ocean' | 'forest' | 'ice' | 'marble' | 'dune' | 'volcanic' | 'rock';
export interface PlanetSurfaceOptions {
  width: number;
  kind: SurfaceKind;
  hue: [number, number, number];
  seed: number;
  lit: number;
  quiet?: boolean;
}
export interface PlanetSurfaceResult { width: number; rgba: Uint8ClampedArray }
export function renderPlanetSurface(options: PlanetSurfaceOptions): PlanetSurfaceResult;
