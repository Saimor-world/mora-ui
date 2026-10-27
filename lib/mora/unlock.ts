/**
 * Freischalt-Modell der Garderobe. Alles hier ist bewusst nur ein Stub:
 *  - 'standard' ist immer frei, ohne Wallet und ohne Konto.
 *  - 'abo' prüft Abo-Monate aus dem Kontext (später aus CORE).
 *  - 'nft' prüft eine Liste gehaltener NFT-IDs; die echte, nur lesende `account_nfts`-Abfrage auf der XRPL folgt später
 *    (kein Login, kein Xaman, kein Signieren).
 *  - 'founder' ist nur für Gründer.
 */
import type { TraitItem, TraitUnlock } from './traits';

export type UnlockContext = { subscriptionMonths: number; founder: boolean; nftIds: readonly string[] };
export const NO_UNLOCKS: UnlockContext = { subscriptionMonths: 0, founder: false, nftIds: [] };

/** Mindestmonate Abo, ab denen 'abo'-Stücke frei sind, wenn das Stück nichts anderes verlangt. */
export const ABO_MONTHS = 6;

const monthsNeeded = (i: Pick<TraitItem, 'months' | 'earn'>) => i.earn?.months ?? i.months ?? ABO_MONTHS;

export function isUnlocked(i: Pick<TraitItem, 'id' | 'unlock' | 'months' | 'earn'>, ctx: UnlockContext = NO_UNLOCKS): boolean {
  switch (i.unlock) {
    case 'standard': return true;
    case 'abo': return ctx.subscriptionMonths >= monthsNeeded(i);
    case 'nft': return ctx.nftIds.includes(i.id);
    case 'founder': return ctx.founder;
    default: return false;
  }
}

/** Ruhiger Hinweis, wie ein Stück frei wird. Kein Druck, kein Preis. */
export function unlockHint(i: Pick<TraitItem, 'unlock' | 'hint' | 'months' | 'earn'>): string {
  if (i.hint) return i.hint;
  const by: Record<TraitUnlock, string> = {
    standard: 'Frei für alle.',
    abo: `Wird nach ${monthsNeeded(i)} Monaten Abo frei.`,
    nft: 'Gehört dir, sobald du das Stück besitzt.',
    founder: 'Ein Gründerstück. Nicht verkäuflich.',
  };
  return by[i.unlock];
}

/** Stub für die spätere, nur lesende XRPL-Prüfung (`account_nfts`). Liefert bis dahin nichts und fasst kein Netz an. */
export async function fetchOwnedNftIds(_account?: string): Promise<string[]> { return []; }

const KEY = 'mora.unlock.stub';
/** Stub-Kontext: später CORE (Abo) und XRPL (NFTs). Vorerst per localStorage `mora.unlock.stub` für Tests und Vorschau. */
export function loadUnlockContext(): UnlockContext {
  if (typeof window === 'undefined') return NO_UNLOCKS;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || 'null') as Partial<UnlockContext> | null;
    return raw ? { subscriptionMonths: Number(raw.subscriptionMonths) || 0, founder: !!raw.founder, nftIds: Array.isArray(raw.nftIds) ? raw.nftIds.map(String) : [] } : NO_UNLOCKS;
  } catch { return NO_UNLOCKS; }
}
