export type SurfaceKind = 'gas' | 'ocean' | 'forest' | 'ice' | 'marble' | 'dune' | 'volcanic' | 'rock';
export interface SurfaceEnvironment { width: number; height: number; rgba: Uint8ClampedArray; key: string }
export interface PlanetSurfaceOptions {
  width: number;
  kind: SurfaceKind;
  hue: [number, number, number];
  seed: number;
  lit: number;
  quiet?: boolean;
  environment?: SurfaceEnvironment;
  center?: [number, number];
  radius?: [number, number];
}
export interface PlanetSurfaceResult { width: number; rgba: Uint8ClampedArray }
export function renderPlanetSurface(options: PlanetSurfaceOptions): PlanetSurfaceResult;
