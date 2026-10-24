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

/**
 * Eine Saimôr-Palette für alle Planeten (Marius, 24.10.: „die Farben passen nicht zum Gesamtbild“).
 * Abgeleitet vom MÔRA-Stein: Jade, Meer-Jade, tiefes Petrol, Salbei, Sandgold, warmer Stein.
 * Gleiche Sättigung und gleiche Helligkeitsleiter – die Planeten unterscheiden sich, wirken aber
 * wie aus einem Material. Bekannte Bereiche bekommen einen festen Platz in der Palette.
 */
export const SAIMOR_PALETTE: ReadonlyArray<{ id: string; hue: number; sat: number }> = [
  { id: 'jade', hue: 158, sat: 20 },
  { id: 'meerjade', hue: 172, sat: 18 },
  { id: 'petrol', hue: 188, sat: 16 },
  { id: 'salbei', hue: 128, sat: 14 },
  { id: 'sandgold', hue: 42, sat: 22 },
  { id: 'stein', hue: 30, sat: 12 },
];
const FAMILY_SLOT: Record<MatteFamily, number> = { sand: 4, ton: 5, salbei: 3, stein: 2 };

export function matteTone(name: string, data: MatteData = {}, index?: number): MatteTone {
  const fam = matteFamily(name);
  const h = hash((name || '').trim().toLowerCase());
  // Reihenfolge schlägt Name: Nachbarn bekommen nie denselben Ton.
  const slot = index != null ? ((index % SAIMOR_PALETTE.length) + SAIMOR_PALETTE.length) % SAIMOR_PALETTE.length : fam ? FAMILY_SLOT[fam] : h % SAIMOR_PALETTE.length;
  const { hue, sat } = SAIMOR_PALETTE[slot];
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
