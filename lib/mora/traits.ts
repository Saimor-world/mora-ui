/**
 * Eine gemeinsame Trait-Datei für MÔRA (OS, später Website und NFT-Metadaten): lib/mora/mora-traits.json.
 * Zeichenreihenfolge = Reihenfolge der Slots (aura unten … seasonal oben).
 * Eine Auswahl ist "item" (erste Variante) oder "item:variante".
 */
import doc from './mora-traits.json';

export type TraitVariant = { id: string; name: string; swatch: string; file: string };
export type TraitItem = { id: string; name: string; variants: TraitVariant[]; default?: boolean; season?: string; signature?: boolean; hides?: string[] };
export type TraitSlot = { id: string; name: string; items: TraitItem[] };
export type Wardrobe = Record<string, string | null>;

export const TRAITS = doc as { version: number; grid: number; base: string[]; assetBase: string; thumbBase: string; slots: TraitSlot[] };

export const DEFAULT_WARDROBE: Wardrobe = Object.fromEntries(TRAITS.slots.map((s) => [s.id, s.items.find((i) => i.default)?.id ?? null]));

/** Alte Auswahl-IDs (Version 1) → neue "item:variante". */
const LEGACY: Record<string, string> = {
  'scarf-navy': 'scarf:marine', 'scarf-red': 'scarf:rot', 'scarf-emerald': 'scarf:smaragd', 'scarf-cream': 'scarf:creme',
  'beret-red': 'beret:rot', 'beret-navy': 'beret:marine', sailor: 'captain:weiss',
};

export function splitChoice(c: string): { item: string; variant?: string } {
  const i = c.indexOf(':'); return i < 0 ? { item: c } : { item: c.slice(0, i), variant: c.slice(i + 1) };
}
export const joinChoice = (item: string, variant?: string) => (variant ? `${item}:${variant}` : item);

export function resolve(slot: TraitSlot, choice: string | null | undefined): { item: TraitItem; variant: TraitVariant } | null {
  if (!choice) return null;
  const { item: iid, variant } = splitChoice(LEGACY[choice] ?? choice);
  const item = slot.items.find((i) => i.id === iid); if (!item) return null;
  const v = item.variants.find((x) => x.id === variant) ?? (variant ? undefined : item.variants[0]);
  return v ? { item, variant: v } : null;
}

/** Gültige, sortierte Ebenen (Dateipfade) für eine Auswahl. Unbekannte IDs fallen weg; "hides" blendet Slots aus (Hut verdeckt Spange). */
export function wardrobeLayers(w: Wardrobe): { slot: string; src: string }[] {
  const picked = TRAITS.slots.map((s) => ({ s, r: resolve(s, w[s.id]) }));
  const hidden = new Set(picked.flatMap((p) => p.r?.item.hides ?? []));
  return picked.flatMap(({ s, r }) => (r && !hidden.has(s.id) ? [{ slot: s.id, src: TRAITS.assetBase + r.variant.file }] : []));
}

export function normalizeWardrobe(raw: unknown): Wardrobe {
  const w: Wardrobe = { ...DEFAULT_WARDROBE };
  if (raw && typeof raw === 'object') for (const s of TRAITS.slots) {
    const v = (raw as Record<string, unknown>)[s.id];
    if (v === null) { w[s.id] = null; continue; }
    if (typeof v !== 'string') continue;
    const r = resolve(s, v); if (r) w[s.id] = joinChoice(r.item.id, r.variant.id);
  }
  return w;
}

/** NFT-/Website-Attribute im üblichen Format (Variante in Klammern). */
export function toNftAttributes(w: Wardrobe) {
  return TRAITS.slots.map((s) => {
    const r = resolve(s, w[s.id]);
    return { trait_type: s.name, value: r ? (r.item.variants.length > 1 ? `${r.item.name} (${r.variant.name})` : r.item.name) : 'Keins' };
  });
}

const SLOT_ODDS: Record<string, number> = { head: 0.9, neck: 0.8, clip: 0.6, face: 0.45, held: 0.45, aura: 0.4, seasonal: 0.12 };
/** Zufälliges, stimmiges Outfit. rng ist austauschbar (Tests). */
export function randomWardrobe(rng: () => number = Math.random): Wardrobe {
  const pick = <T,>(a: T[]) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  const w: Wardrobe = {};
  for (const s of TRAITS.slots) {
    if (rng() > (SLOT_ODDS[s.id] ?? 0.5)) { w[s.id] = null; continue; }
    const it = pick(s.items); w[s.id] = joinChoice(it.id, pick(it.variants).id);
  }
  return w;
}

export const sameWardrobe = (a: Wardrobe, b: Wardrobe) => TRAITS.slots.every((s) => (a[s.id] ?? null) === (b[s.id] ?? null));

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

/** Gespeicherte Outfits (feste Plätze). */
export const OUTFIT_SLOTS = 6;
const OKEY = 'mora.outfits.v1';
export type Outfits = (Wardrobe | null)[];
export function normalizeOutfits(raw: unknown): Outfits {
  const a = Array.isArray(raw) ? raw : [];
  return Array.from({ length: OUTFIT_SLOTS }, (_, i) => (a[i] && typeof a[i] === 'object' ? normalizeWardrobe(a[i]) : null));
}
export function loadOutfits(user = 'me'): Outfits {
  if (typeof window === 'undefined') return normalizeOutfits(null);
  try { return normalizeOutfits(JSON.parse(window.localStorage.getItem(`${OKEY}:${user}`) || 'null')); } catch { return normalizeOutfits(null); }
}
export function saveOutfits(o: Outfits, user = 'me') {
  try { window.localStorage.setItem(`${OKEY}:${user}`, JSON.stringify(o)); } catch { /* voll/privat */ }
}
