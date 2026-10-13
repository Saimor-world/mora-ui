/**
 * Licht nach Tageszeit – eine Quelle für das Universe und die Raum-Vorschau.
 * Der Sonnenstand dreht den Terminator der Planeten, die Tönung folgt dem Tag.
 */
export type SunLight = { rot: number; tint: string; night: number };

export function sunLight(hour: number): SunLight {
  const h = ((hour % 24) + 24) % 24;
  const rot = Math.max(-70, Math.min(70, (h - 13) * 10));
  const tint = h < 6 || h >= 21 ? 'rgba(110,130,190,0.16)' : h < 10 ? 'rgba(255,214,150,0.10)' : h < 17 ? 'rgba(255,250,235,0)' : 'rgba(240,150,100,0.13)';
  const night = h < 6 || h >= 21 ? 0.18 : 0;
  return { rot, tint, night };
}

/** Als CSS-Variablen, wie sie PlanetSphere (.uv2-sun / .uv2-sun-tint) liest. */
export function sunLightVars(hour: number): Record<string, string> {
  const l = sunLight(hour);
  return { '--uv2-sun-rot': l.rot.toFixed(1) + 'deg', '--uv2-sun-tint': l.tint, '--uv2-sun-night': String(l.night) };
}
