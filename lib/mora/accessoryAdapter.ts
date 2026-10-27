/**
 * NFT-ready Accessoire-Adapter (Issue #187, Slice B).
 *
 * Die Garderobe (lib/mora/traits.ts, useWardrobe) bleibt die einzige Wahrheit über das, was MÔRA trägt.
 * Dieser Adapter bildet eine Auswahl auf eigenständige Ebenen ab, die der Jade-Stein davor/dahinter zeichnet:
 *   { id, slot, asset, anchor/offset, scale, animation, nftMetadata? }
 * Die Teile sind nie ins Steinbild eingebrannt, An- und Ablegen ist reine Daten-Änderung.
 *
 * Bewusst NICHT hier: Minting, Wallet, Besitzprüfung, Seltenheitswerte. `nftMetadata` ist nur ein optionales,
 * später befüllbares Feld ohne Blockchain-Abhängigkeit; wer es setzt, behauptet damit keinen Besitz.
 * Eine echte Besitzprüfung muss später serverseitig laufen (lib/mora/unlock.ts: 'nft'), nie im Client.
 */
import { resolve, TRAITS, type Wardrobe } from './traits';

/** Später befüllbar. Reine Beschreibung, kein Besitznachweis. */
export type NftMetadata = {
  chain?: string; issuer?: string; contract?: string; tokenId?: string;
  image?: string; traits?: { trait_type: string; value: string }[]; provenance?: string;
};

/** Wo die Ebene relativ zum Stein liegt: hinter ihm oder davor. */
export type MountLayer = 'front' | 'back';
/** sway: hängt an einem Punkt oben und pendelt leise. none: sitzt still. */
export type MountAnimation = 'sway' | 'none';

export type AccessoryMount = {
  /** Trait-ID im Slot (mora-traits.json), z. B. 'jade-scarf'. */
  id: string;
  slot: string;
  /** Bilddatei (SVG oder PNG mit Alpha, später auch NFT-Bild). */
  asset: string;
  /** Seitenverhältnis Breite / Höhe der Datei. */
  aspect: number;
  /** Mittelpunkt des Teils relativ zur Steinmitte, in Steindurchmessern (x rechts, y unten). Bei `sway` der Aufhängepunkt (Oberkante). */
  anchor: { x: number; y: number };
  /** Feinversatz, ebenfalls in Steindurchmessern. */
  offset?: { x: number; y: number };
  /** Breite des Teils in Steindurchmessern. */
  scale: number;
  /** Neigung in Grad. */
  rotate?: number;
  layer: MountLayer;
  animation: MountAnimation;
  /** Nur Anhänger: Kette um den Stein (Farbe, tiefster Punkt in Steindurchmessern), zeichnet der Renderer als feine Linie. */
  chain?: { color: string; dip: number };
  nftMetadata?: NftMetadata;
};

/**
 * Die Garderobe für den Jade-Stein: gezeichnete SVG-Ebenen (scharf bei jeder Größe), keine echten NFTs, nichts geminted.
 * Maße in Steindurchmessern, Augen sitzen bei y ≈ 0 (x ≈ ±0.17). Mode-Attribute und Herkunft stehen in mora-traits.json (Single Source).
 */
export const JADE_MOUNTS: Record<string, AccessoryMount> = {
  'jade-sunglasses': {
    id: 'jade-sunglasses', slot: 'face', asset: '/mora/jade/acc/jade-sunglasses.svg', aspect: 690 / 260,
    anchor: { x: 0.008, y: -0.005 }, scale: 0.69, layer: 'front', animation: 'none',
  },
  'jade-beanie': {
    id: 'jade-beanie', slot: 'head', asset: '/mora/jade/acc/jade-beanie.svg', aspect: 940 / 450,
    anchor: { x: 0, y: -0.435 }, scale: 0.94, layer: 'front', animation: 'none',
  },
  'jade-scarf': {
    id: 'jade-scarf', slot: 'neck', asset: '/mora/jade/acc/jade-scarf.svg', aspect: 1060 / 620,
    anchor: { x: 0, y: 0.41 }, scale: 1.06, layer: 'front', animation: 'none',
  },
  'pearl-necklace': {
    id: 'pearl-necklace', slot: 'neck', asset: '/mora/jade/acc/pearl-necklace.svg', aspect: 1000 / 600,
    anchor: { x: 0, y: 0.26 }, scale: 1, layer: 'front', animation: 'none',
  },
  'founder-scarf': {
    id: 'founder-scarf', slot: 'neck', asset: '/mora/jade/acc/founder-scarf.svg', aspect: 1060 / 620,
    anchor: { x: 0, y: 0.41 }, scale: 1.06, layer: 'front', animation: 'none',
  },
  'founder-f1': {
    id: 'founder-f1', slot: 'neck', asset: '/mora/jade/acc/founder-f1.svg', aspect: 224 / 240,
    anchor: { x: 0, y: 0.225 }, scale: 0.2576, layer: 'front', animation: 'sway', chain: { color: '#d9a94a', dip: 0.235 },
  },
};

/** Stücke, die der Jade-Stein zeigt: in Slot-Reihenfolge, höchstens eins je Slot (also ein Halsstück). */
/** Gründer-Teile erscheinen nur, wenn `founder` gesetzt ist (wie bei den Pixel-Ebenen). */
export function jadeMounts(w: Wardrobe, founder = false): AccessoryMount[] {
  const out: AccessoryMount[] = [];
  for (const s of TRAITS.slots) {
    const r = resolve(s, w[s.id]);
    const m = r && r.item.figure && (founder || r.item.unlock !== 'founder') ? JADE_MOUNTS[r.item.id] : undefined;
    if (m) out.push(m);
  }
  return out;
}

/** Getragene Pixel-Altstücke (Garderobe v2): gespeichert und gültig, aber ohne Jade-Zeichnung. */
export function legacyWorn(w: Wardrobe): string[] {
  return TRAITS.slots.flatMap((s) => { const r = resolve(s, w[s.id]); return r && !r.item.figure ? [`${s.id}/${r.item.id}`] : []; });
}

/** Attribute im NFT-Format für ein Teil: Slot, Kategorie, Kollektion, Material und Herkunft (standard · moment · earned · alive · founder).
 *  Ohne Besitz-, Preis- oder Seltenheitsaussage. */
export function mountAttributes(m: AccessoryMount): NonNullable<NftMetadata['traits']> {
  const slot = TRAITS.slots.find((s) => s.id === m.slot);
  const item = slot?.items.find((i) => i.id === m.id);
  const f = item?.fashion;
  return [
    { trait_type: slot?.name ?? m.slot, value: item?.name ?? m.id },
    ...(f ? [{ trait_type: 'Kategorie', value: f.category }, { trait_type: 'Kollektion', value: f.collection }, { trait_type: 'Material', value: f.material }] : []),
    ...(item ? [{ trait_type: 'Herkunft', value: item.origin }] : []),
  ];
}
