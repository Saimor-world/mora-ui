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

/**
 * Farbsystem v2 (Marius, 24.10.: „die Farben passen immer noch nicht“).
 * Warum es biss: Helligkeit 66–80 machte die Planeten kreidig-pastell neben dem tiefen, satten
 * MÔRA-Stein; dazu mischten sich kühle (Eis, Jade) und warme (Sand, Stein) Töne ohne gemeinsames Licht.
 * Jetzt: EIN Material (tiefer, matter Stein wie MÔRA), EIN Werteband (dunkel, Grund ~40),
 * gleiches warmes Schlüssellicht aus dem Nebel (Glanzlicht Richtung Gold), feiner Goldrand.
 * Unterschiede nur in kleinen Farbschritten. Variante C ist Standard; A/B zum Vergleich
 * (localStorage „mora-planet-variant“).
 */
type Variant = { hues: Array<[number, number] | [number, number, number]>; L: { hi: number; base: number; mid: number; shadow: number; deep: number }; warmHi: number; rim: string };
export const PLANET_VARIANTS: Record<'A' | 'B' | 'C' | 'D' | 'E', Variant> = {
  // E (Standard, Marius + Partnerin 24.10.: D wirkte wie ein „Kindergartensystem“): EINE ruhige
  // Familie für B2B – dunkler matter Stein, kühles schmales Band (150–212°), Sättigung 8–18 %.
  // Planeten unterscheiden sich leise über Ton UND Helligkeit (3. Wert = Helligkeitsversatz,
  // abwechselnd heller/dunkler). Einziger Akzent bleibt der Goldrand; kräftige Farbe nur für Status.
  E: { hues: [[162, 18, 0], [206, 12, 2], [186, 18, -3], [176, 8, 4], [204, 11, -4], [150, 11, 3]], L: { hi: 56, base: 37, mid: 28, shadow: 14, deep: 7 }, warmHi: 0.25, rim: 'rgba(226, 196, 120, .48)' },
  // D (Standard, Marius 24.10. abends: „zu ähnlich, muss abwechselnd sein“): sechs klar
  // verschiedene Edelstein-Töne aus einer Welt – Jade, Kupfer, Schieferblau, Moos, Pflaume, Bernstein (Petrol fiel raus: neben Jade zu ähnlich).
  // Reihenfolge wechselt kühl/warm, damit Nachbarn kontrastieren. Gleiches Werteband, gleiches
  // warmes Licht, gleicher Goldrand; Sättigung pro Ton so gewählt, dass alle gleich kräftig wirken.
  D: { hues: [[158, 30], [24, 34], [214, 26], [100, 22], [318, 18], [40, 32]], L: { hi: 58, base: 40, mid: 30, shadow: 15, deep: 7 }, warmHi: 0.3, rim: 'rgba(226, 196, 120, .45)' },
  // A: Jade-Monochrom, Goldrand
  A: { hues: [[150, 30], [158, 30], [166, 28], [174, 28], [182, 26], [190, 26]], L: { hi: 54, base: 38, mid: 29, shadow: 15, deep: 7 }, warmHi: 0, rim: 'rgba(226, 196, 120, .55)' },
  // B: Jade im Wechsel mit warmen Nebel-Komplementen (Kupfer/Bernstein), gleiches Werteband
  B: { hues: [[162, 28], [26, 30], [178, 26], [36, 30], [192, 24], [16, 26]], L: { hi: 56, base: 40, mid: 30, shadow: 15, deep: 7 }, warmHi: 0, rim: 'rgba(226, 196, 120, .45)' },
  // C: Jade → Meer → Petrol, warmes Glanzlicht aus dem Nebel, dünner Goldrand
  C: { hues: [[156, 28], [168, 26], [180, 24], [192, 22], [148, 24], [200, 20]], L: { hi: 58, base: 41, mid: 31, shadow: 16, deep: 8 }, warmHi: 0.45, rim: 'rgba(226, 196, 120, .42)' },
};
function currentVariant(): Variant {
  try { const v = globalThis.localStorage?.getItem('mora-planet-variant'); if (v === 'A' || v === 'B' || v === 'C' || v === 'D' || v === 'E') return PLANET_VARIANTS[v]; } catch { /* SSR */ }
  return PLANET_VARIANTS.E;
}
const mixHue = (a: number, b: number, t: number) => { const d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; };

function glassVars(hue: number, sat: number): Record<string, string> {
  const a = (l: number, al: number, ds = 0) => `hsla(${hue}, ${sat + ds}%, ${l}%, ${al})`;
  return {
    '--g-core': a(7, .42), '--g-mid': a(26, .22), '--g-glow': a(48, .22, 4), '--g-hi': a(90, .45, -10), '--g-edge': a(70, .6),
    '--p-hi': hsl(hue, sat, 44), '--p-base': hsl(hue, sat, 24), '--p-mid': hsl(hue, sat, 16), '--p-shadow': hsl(hue, sat, 9), '--p-deep': hsl(hue, sat, 5),
    '--m-hi': hsl(hue, sat, 50), '--m-base': hsl(hue, sat, 28), '--m-mid': hsl(hue, sat, 20), '--m-shadow': hsl(hue, sat, 12), '--m-deep': hsl(hue, sat, 6),
    '--h-edge': hsl(hue, sat, 46), '--h-top': hsl(hue, sat, 16), '--h-body': hsl(hue, sat, 9),
    '--p-rim': 'rgba(226, 196, 120, .42)',
  };
}
/** SAIMÔR-Nachtwald: dunkles Glas in Jade, Moos, Petrol, Bronze, Salbei, Nebelgrau. */
const GLASS_FOREST: ReadonlyArray<[number, number]> = [[164, 26], [150, 14], [176, 18], [40, 22], [138, 10], [190, 9]];
function glassTints(): ReadonlyArray<[number, number]> { return GLASS_FOREST; }
function glassOn(): boolean {
  return true; // Nachtwald-Glas ist überall Standard (auch Phone)
}

const SLOT_COUNT = GLASS_FOREST.length; // gleich viele Töne wie in PLANET_VARIANTS.*.hues

/** Fester Platz in der Palette aus dem Namen: bekannte Bereiche fest, sonst stabiler Hash. */
export function toneSlot(name: string, n = SLOT_COUNT): number {
  const fam = matteFamily(name);
  return fam ? FAMILY_SLOT[fam] % n : hash((name || '').trim().toLowerCase()) % n;
}

/**
 * Farben fest aus dem Abteilungsnamen (Marius, 24.10.: eine neue Abteilung färbt die anderen nicht um).
 * Nur wenn ein Planet denselben Ton wie sein Vorgänger (oder als letzter wie der erste, die Bahn ist
 * ein Kreis) hätte, rückt er einen Platz weiter. Alle anderen behalten ihren Ton – egal, was dazukommt.
 */
export function toneSlots(names: string[], n = SLOT_COUNT): number[] {
  const out = names.map((name) => toneSlot(name, n));
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const first = i === out.length - 1 && out.length > 2 ? out[0] : -1;
    if (out[i] !== prev && out[i] !== first) continue;
    for (let k = 1; k < n; k++) {
      const s = (out[i] + k) % n;
      if (s !== prev && s !== first) { out[i] = s; break; }
    }
  }
  return out;
}

/** `slot`: Platz aus toneSlots (Nachbarn entzerrt); ohne ihn der feste Platz aus dem Namen. */
export function matteTone(name: string, data: MatteData = {}, slot?: number): MatteTone {
  const fam = matteFamily(name);
  const h = hash((name || '').trim().toLowerCase());
  if (glassOn()) {
    // Töne aus #164 (Nachtwald-Glas), Platz aus #162 (fest nach Name, Nachbarn entzerrt).
    const T = glassTints(); const n = T.length;
    const at = slot != null ? ((slot % n) + n) % n : fam ? FAMILY_SLOT[fam] % n : h % n;
    const [gh, gs] = T[at];
    return { family: 'tone', className: 'planet--tone planet--glass', vars: glassVars(gh, gs) };
  }
  const V = currentVariant();
  const n = V.hues.length;
  const at = slot != null ? ((slot % n) + n) % n : fam ? FAMILY_SLOT[fam] % n : h % n;
  const [hue, sat, dL = 0] = V.hues[at];
  const signal = Math.min(1, Math.log10(1 + (data.count ?? 0) + (data.activity ?? 0)) / 2);
  const lift = Math.round(signal * 3);
  const s = sat + lift;
  const L = { hi: V.L.hi + dL, base: V.L.base + dL, mid: V.L.mid + dL, shadow: V.L.shadow + Math.round(dL / 2), deep: V.L.deep };
  const hiHue = mixHue(hue, 44, V.warmHi);
  const vars: Record<string, string> = {
    '--p-hi': hsl(hiHue, s + V.warmHi * 10, L.hi + lift), '--p-base': hsl(hue, s, L.base + lift), '--p-mid': hsl(hue, s, L.mid + lift),
    '--p-shadow': hsl(hue, Math.max(8, s - 6), L.shadow), '--p-deep': hsl(hue, Math.max(8, s - 8), L.deep),
    '--m-hi': hsl(hiHue, s, L.hi + 8 + lift), '--m-base': hsl(hue, s, L.base + 8 + lift), '--m-mid': hsl(hue, s, L.mid + 8 + lift),
    '--m-shadow': hsl(hue, Math.max(8, s - 6), L.shadow + 6), '--m-deep': hsl(hue, Math.max(8, s - 8), L.deep + 4),
    '--h-edge': hsl(hue, s, 46), '--h-top': hsl(hue, Math.max(8, s - 4), 18), '--h-body': hsl(hue, Math.max(8, s - 6), 10),
    '--p-rim': V.rim,
  };
  return { family: 'tone', className: 'planet--tone', vars };
}
