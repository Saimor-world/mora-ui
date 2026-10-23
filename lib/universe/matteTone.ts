/**
 * matteTone(name, data) — leitet für jeden Planeten ein mattes Material ab.
 *
 * Regel:
 * 1. Bekannte Bereiche bekommen ihr Basismaterial (Sand, Ton, Salbei, Stein).
 * 2. Alle anderen: Farbton aus einem stabilen Hash des Namens, aber nur in erdigen
 *    Bändern (Sand/Ocker 30–52°, Ton/Terrakotta 14–28°, Salbei/Moos 88–138°,
 *    Stein/Schiefer 196–222°). Sättigung niedrig (10–24 %), nie Neon.
 * 3. Daten verändern das Material nur leise: mehr Aktivität macht den Grundton
 *    bis zu 4 Punkte heller und 4 Punkte satter. Leere Planeten werden nicht grau,
 *    sondern bleiben in ihrem Ton, nur etwas zurückhaltender.
 * 4. Die Helligkeitsleiter ist fest: Licht 80, Grund 66, Mitte 52, Schatten 26, Nacht 12.
 *    Monde: jede Stufe +6 (eine Stufe heller). Horizont: Kante 50, Oberfläche 20, Körper 12.
 * Ausgabe sind die CSS-Variablen aus materials.css; die Klasse ist `.planet--tone`.
 */

export type MatteFamily = 'sand' | 'ton' | 'salbei' | 'stein';
export type MatteData = { count?: number; activity?: number };
export type MatteTone = { family: MatteFamily | 'tone'; className: string; vars: Record<string, string> };

const KNOWN: Array<[RegExp, MatteFamily]> = [
  [/termin|kalender|post|mail/, 'sand'],
  [/kund|client|kontakt|crm/, 'ton'],
  [/geld|finanz|finance|kasse|buchhalt/, 'salbei'],
  [/material|lager|bestand|einkauf/, 'stein'],
];

const BANDS: Array<[number, number]> = [[30, 52], [14, 28], [88, 138], [196, 222]];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

function hsl(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${x(f(0))}${x(f(8))}${x(f(4))}`;
}

export function matteFamily(name: string): MatteFamily | null {
  const n = (name || '').toLowerCase();
  for (const [re, fam] of KNOWN) if (re.test(n)) return fam;
  return null;
}

export function matteTone(name: string, data: MatteData = {}): MatteTone {
  const fam = matteFamily(name);
  if (fam) return { family: fam, className: `planet--${fam}`, vars: {} };

  const h = hash((name || '').trim().toLowerCase());
  const [lo, hi] = BANDS[h % BANDS.length];
  const hue = lo + ((h >>> 8) % (hi - lo + 1));
  const sat = 10 + ((h >>> 16) % 15);
  const signal = Math.min(1, Math.log10(1 + (data.count ?? 0) + (data.activity ?? 0)) / 2); // 0..1
  const lift = Math.round(signal * 4);
  const s = sat + lift;

  const L = { hi: 80, base: 66, mid: 52, shadow: 26, deep: 12 };
  const vars: Record<string, string> = {
    '--p-hi': hsl(hue, s, L.hi + lift), '--p-base': hsl(hue, s, L.base + lift), '--p-mid': hsl(hue, s, L.mid + lift),
    '--p-shadow': hsl(hue, Math.max(6, s - 4), L.shadow), '--p-deep': hsl(hue, Math.max(6, s - 6), L.deep),
    '--m-hi': hsl(hue, s, L.hi + 6 + lift), '--m-base': hsl(hue, s, L.base + 6 + lift), '--m-mid': hsl(hue, s, L.mid + 6 + lift),
    '--m-shadow': hsl(hue, Math.max(6, s - 4), L.shadow + 6), '--m-deep': hsl(hue, Math.max(6, s - 6), L.deep + 4),
    '--h-edge': hsl(hue, s, 50), '--h-top': hsl(hue, Math.max(6, s - 4), 20), '--h-body': hsl(hue, Math.max(6, s - 6), 12),
  };
  return { family: 'tone', className: 'planet--tone', vars };
}
