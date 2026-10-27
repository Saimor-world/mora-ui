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

/** Wo die Ebene relativ zum Stein liegt: hinter ihm, davor, oder als Ring (obere Hälfte hinten, untere vorn). */
export type MountLayer = 'front' | 'back' | 'ring';
export type MountAnimation = 'orbit' | 'float' | 'sway' | 'none';

export type AccessoryMount = {
  /** Trait-ID im Slot (mora-traits.json), z. B. 'gold-orbit'. */
  id: string;
  slot: string;
  /** Bilddatei (PNG mit Alpha, später auch NFT-Bild). */
  asset: string;
  /** Seitenverhältnis Breite / Höhe der Datei. */
  aspect: number;
  /** Mittelpunkt des Teils relativ zur Steinmitte, in Steindurchmessern (x rechts, y unten). */
  anchor: { x: number; y: number };
  /** Feinversatz, ebenfalls in Steindurchmessern. */
  offset?: { x: number; y: number };
  /** Breite des Teils in Steindurchmessern. */
  scale: number;
  /** Neigung in Grad. */
  rotate?: number;
  layer: MountLayer;
  animation: MountAnimation;
  /** Nur Anhänger: Kette um den Stein, zeichnet der Renderer als feine Linie. */
  chain?: boolean;
  nftMetadata?: NftMetadata;
};

/** Drei Demonstratoren (frei, keine echten NFTs). Weitere Teile kommen als Eintrag hinzu. */
export const JADE_MOUNTS: Record<string, AccessoryMount> = {
  'gold-orbit': {
    id: 'gold-orbit', slot: 'aura', asset: '/mora/jade/acc/gold-orbit.png', aspect: 960 / 260,
    anchor: { x: 0, y: 0.1 }, scale: 1.62, rotate: -9, layer: 'ring', animation: 'orbit',
  },
  'prism-shard': {
    id: 'prism-shard', slot: 'held', asset: '/mora/jade/acc/prism-shard.png', aspect: 300 / 752,
    anchor: { x: 0.8, y: -0.1 }, scale: 0.2, rotate: 14, layer: 'front', animation: 'float',
  },
  'celestial-charm': {
    id: 'celestial-charm', slot: 'neck', asset: '/mora/jade/acc/celestial-charm.png', aspect: 260 / 594,
    anchor: { x: 0, y: 0.5 }, scale: 0.15, layer: 'front', animation: 'sway', chain: true,
  },
};

/** Stücke, die der Jade-Stein zeigt: in Slot-Reihenfolge, höchstens eins je Slot (also ein Halsstück). */
export function jadeMounts(w: Wardrobe): AccessoryMount[] {
  const out: AccessoryMount[] = [];
  for (const s of TRAITS.slots) {
    const r = resolve(s, w[s.id]);
    const m = r && r.item.figure === 'jade' ? JADE_MOUNTS[r.item.id] : undefined;
    if (m) out.push(m);
  }
  return out;
}

/** Getragene Pixel-Altstücke (die 32 Teile von Garderobe v2): gespeichert und gültig, aber ohne Jade-Zeichnung. */
export function legacyWorn(w: Wardrobe): string[] {
  return TRAITS.slots.flatMap((s) => { const r = resolve(s, w[s.id]); return r && r.item.figure !== 'jade' ? [`${s.id}/${r.item.id}`] : []; });
}

/** Attribute im NFT-Format für ein Teil (ohne Besitz-, Preis- oder Seltenheitsaussage). */
export function mountAttributes(m: AccessoryMount): NonNullable<NftMetadata['traits']> {
  const slot = TRAITS.slots.find((s) => s.id === m.slot);
  const item = slot?.items.find((i) => i.id === m.id);
  return [{ trait_type: slot?.name ?? m.slot, value: item?.name ?? m.id }];
}
