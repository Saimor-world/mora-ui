/**
 * Eine gemeinsame Trait-Datei für MÔRA (OS, später Website und NFT-Metadaten): lib/mora/mora-traits.json.
 * Zeichenreihenfolge = Reihenfolge der Slots (aura unten … seasonal oben).
 */
import doc from './mora-traits.json';

export type TraitItem = { id: string; name: string; file: string; default?: boolean; season?: string };
export type TraitSlot = { id: string; name: string; items: TraitItem[] };
export type Wardrobe = Record<string, string | null>;

export const TRAITS = doc as { version: number; grid: number; base: string[]; assetBase: string; slots: TraitSlot[] };

export const DEFAULT_WARDROBE: Wardrobe = Object.fromEntries(TRAITS.slots.map((s) => [s.id, s.items.find((i) => i.default)?.id ?? null]));

/** Gültige, sortierte Ebenen (Dateipfade) für eine Auswahl. Unbekannte IDs fallen weg. */
export function wardrobeLayers(w: Wardrobe): { slot: string; src: string }[] {
  return TRAITS.slots.flatMap((s) => { const it = s.items.find((i) => i.id === w[s.id]); return it ? [{ slot: s.id, src: TRAITS.assetBase + it.file }] : []; });
}

export function normalizeWardrobe(raw: unknown): Wardrobe {
  const w: Wardrobe = { ...DEFAULT_WARDROBE };
  if (raw && typeof raw === 'object') for (const s of TRAITS.slots) {
    const v = (raw as Record<string, unknown>)[s.id];
    if (v === null) w[s.id] = null; else if (typeof v === 'string' && s.items.some((i) => i.id === v)) w[s.id] = v;
  }
  return w;
}

/** NFT-/Website-Attribute im üblichen Format. */
export function toNftAttributes(w: Wardrobe) {
  return TRAITS.slots.map((s) => ({ trait_type: s.name, value: s.items.find((i) => i.id === w[s.id])?.name ?? 'Keins' }));
}

/** Auswahl: zunächst localStorage pro Nutzer (CORE-Einstellung folgt). */
const KEY = 'mora.wardrobe.v1';
const EVT = 'mora-wardrobe';
export function loadWardrobe(user = 'me'): Wardrobe {
  if (typeof window === 'undefined') return DEFAULT_WARDROBE;
  try { return normalizeWardrobe(JSON.parse(window.localStorage.getItem(`${KEY}:${user}`) || 'null')); } catch { return DEFAULT_WARDROBE; }
}
export function saveWardrobe(w: Wardrobe, user = 'me') {
  try { window.localStorage.setItem(`${KEY}:${user}`, JSON.stringify(w)); } catch { /* voll/privat */ }
  window.dispatchEvent(new CustomEvent(EVT));
}
export const WARDROBE_EVENT = EVT;
