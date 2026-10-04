/**
 * MÔRA Finance Context
 *
 * Exposes normalized finance state to MÔRA as read-only context.
 * MÔRA can explain changes from evidence-backed numbers but never invents.
 */

import type {
  CompanyFinanceState,
  FinanceFeed,
  XrplAccountSnapshot,
  OpenListing,
} from './types';
import { ORIGIN_NFT } from './types';

export interface FinanceChange {
  type:
    | 'balance_changed'
    | 'new_transaction'
    | 'listing_created'
    | 'listing_removed_unverified'
    | 'reserve_changed'
    | 'owner_count_changed';
  account?: string;
  accountLabel?: string;
  description: string;
  previousValue?: number | string | null;
  currentValue?: number | string | null;
  evidence: {
    source: string;
    ledgerIndex: number | null;
    fetchedAt: string;
  };
}

export interface FinanceSnapshot {
  treasuryXrp: number | null;
  treasuryAvailable: number | null;
  treasuryOwnerCount: number | null;
  hotMinterXrp: number | null;
  hotMinterAvailable: number | null;
  hotMinterOwnerCount: number | null;
  openListingsCount: number;
  aggregateAskingPriceXrp: number;
  latestTxHashes: string[];
  fetchedAt: string;
}

export function createSnapshot(state: CompanyFinanceState): FinanceSnapshot {
  const treasury = state.accounts.find(a => a.role.type === 'SAIMOR_SOVEREIGN_TREASURY');
  const hotMinter = state.accounts.find(a => a.role.type === 'SAIMOR_ORIGIN_HOT_MINTER');

  const latestTxHashes: string[] = [];
  for (const account of state.accounts) {
    const firstTx = account.transactions[0];
    if (firstTx?.hash) {
      latestTxHashes.push(firstTx.hash);
    }
  }

  return {
    treasuryXrp: treasury?.error ? null : (treasury?.xrp ?? null),
    treasuryAvailable: treasury?.error ? null : (treasury?.availableXrp ?? null),
    treasuryOwnerCount: treasury?.error ? null : (treasury?.reserve.ownerCount ?? null),
    hotMinterXrp: hotMinter?.error ? null : (hotMinter?.xrp ?? null),
    hotMinterAvailable: hotMinter?.error ? null : (hotMinter?.availableXrp ?? null),
    hotMinterOwnerCount: hotMinter?.error ? null : (hotMinter?.reserve.ownerCount ?? null),
    openListingsCount: state.openListingsCount,
    aggregateAskingPriceXrp: state.aggregateAskingPriceXrp,
    latestTxHashes,
    fetchedAt: state.lastUpdated,
  };
}

export function detectChanges(
  previous: FinanceSnapshot | null,
  current: FinanceSnapshot,
  currentState: CompanyFinanceState,
): FinanceChange[] {
  if (!previous) return [];

  const changes: FinanceChange[] = [];
  const now = current.fetchedAt;

  const treasury = currentState.accounts.find(a => a.role.type === 'SAIMOR_SOVEREIGN_TREASURY');
  const hotMinter = currentState.accounts.find(a => a.role.type === 'SAIMOR_ORIGIN_HOT_MINTER');

  if (previous.treasuryXrp !== null && current.treasuryXrp !== null && previous.treasuryXrp !== current.treasuryXrp) {
    changes.push({
      type: 'balance_changed',
      account: treasury?.address,
      accountLabel: 'SAIMÔR · 111 Treasury',
      description: `Treasury balance changed from ${previous.treasuryXrp.toFixed(6)} XRP to ${current.treasuryXrp.toFixed(6)} XRP`,
      previousValue: previous.treasuryXrp,
      currentValue: current.treasuryXrp,
      evidence: {
        source: 'xrpl_mainnet',
        ledgerIndex: treasury?.evidence.ledgerIndex ?? null,
        fetchedAt: now,
      },
    });
  }

  if (previous.hotMinterXrp !== null && current.hotMinterXrp !== null && previous.hotMinterXrp !== current.hotMinterXrp) {
    changes.push({
      type: 'balance_changed',
      account: hotMinter?.address,
      accountLabel: 'Origin Hot Minter',
      description: `Hot Minter balance changed from ${previous.hotMinterXrp.toFixed(6)} XRP to ${current.hotMinterXrp.toFixed(6)} XRP`,
      previousValue: previous.hotMinterXrp,
      currentValue: current.hotMinterXrp,
      evidence: {
        source: 'xrpl_mainnet',
        ledgerIndex: hotMinter?.evidence.ledgerIndex ?? null,
        fetchedAt: now,
      },
    });
  }

  if (previous.treasuryOwnerCount !== null && current.treasuryOwnerCount !== null && previous.treasuryOwnerCount !== current.treasuryOwnerCount) {
    changes.push({
      type: 'owner_count_changed',
      account: treasury?.address,
      accountLabel: 'SAIMÔR · 111 Treasury',
      description: `Treasury owner count changed from ${previous.treasuryOwnerCount} to ${current.treasuryOwnerCount}`,
      previousValue: previous.treasuryOwnerCount,
      currentValue: current.treasuryOwnerCount,
      evidence: {
        source: 'xrpl_mainnet',
        ledgerIndex: treasury?.evidence.ledgerIndex ?? null,
        fetchedAt: now,
      },
    });
  }

  if (previous.hotMinterOwnerCount !== null && current.hotMinterOwnerCount !== null && previous.hotMinterOwnerCount !== current.hotMinterOwnerCount) {
    changes.push({
      type: 'owner_count_changed',
      account: hotMinter?.address,
      accountLabel: 'Origin Hot Minter',
      description: `Hot Minter owner count changed from ${previous.hotMinterOwnerCount} to ${current.hotMinterOwnerCount}`,
      previousValue: previous.hotMinterOwnerCount,
      currentValue: current.hotMinterOwnerCount,
      evidence: {
        source: 'xrpl_mainnet',
        ledgerIndex: hotMinter?.evidence.ledgerIndex ?? null,
        fetchedAt: now,
      },
    });
  }

  for (const hash of current.latestTxHashes) {
    if (!previous.latestTxHashes.includes(hash)) {
      const account = currentState.accounts.find(a => a.transactions.some(tx => tx.hash === hash));
      const tx = account?.transactions.find(t => t.hash === hash);
      if (tx) {
        changes.push({
          type: 'new_transaction',
          account: account?.address,
          accountLabel: account?.role.label,
          description: `New ${tx.type} transaction: ${tx.direction === 'in' ? 'received' : 'sent'}`,
          currentValue: hash,
          evidence: {
            source: 'xrpl_mainnet',
            ledgerIndex: tx.ledgerIndex,
            fetchedAt: now,
          },
        });
      }
    }
  }

  if (previous.openListingsCount !== current.openListingsCount) {
    if (current.openListingsCount > previous.openListingsCount) {
      changes.push({
        type: 'listing_created',
        description: `New sell offer created for ORIGIN #111`,
        previousValue: previous.openListingsCount,
        currentValue: current.openListingsCount,
        evidence: {
          source: 'xrpl_mainnet_nft_offers',
          ledgerIndex: null,
          fetchedAt: now,
        },
      });
    } else {
      changes.push({
        type: 'listing_removed_unverified',
        description: 'ORIGIN #111 listing count decreased. Sale vs cancellation is not verified yet.',
        previousValue: previous.openListingsCount,
        currentValue: current.openListingsCount,
        evidence: {
          source: 'xrpl_mainnet_nft_offers',
          ledgerIndex: null,
          fetchedAt: now,
        },
      });
    }
  }

  return changes;
}

export interface MoraFinanceContext {
  mode: 'read-only';
  summary: string;
  companyState: {
    treasuryXrp: number | null;
    treasuryAvailable: number | null;
    hotMinterXrp: number | null;
    hotMinterAvailable: number | null;
    cashTotalXrp: number;
    availableTotalXrp: number;
    reservedTotalXrp: number;
    treasuryBreakdown?: CompanyFinanceState['treasuryBreakdown'];
    hotMinterBreakdown?: CompanyFinanceState['hotMinterBreakdown'];
  };
  openListings: {
    count: number;
    aggregateAskingPriceXrp: number;
    note: string;
  };
  originNft: {
    status: string;
    verified: boolean;
    hasSellOffer: boolean;
    askingPriceXrp: number | null;
  };
  providers: {
    xrpl: 'connected' | 'error';
    bank: 'not_connected';
    revolut: 'not_connected';
    broker: 'not_connected';
  };
  recentChanges: FinanceChange[];
  changeDetection: {
    status: 'compared' | 'no_previous_snapshot';
    note: string;
  };
  snapshot?: FinanceSnapshot;
  lastSync: string;
}

export function buildMoraContext(
  state: CompanyFinanceState,
  previousSnapshot: FinanceSnapshot | null,
): MoraFinanceContext {
  const currentSnapshot = createSnapshot(state);
  const changes = detectChanges(previousSnapshot, currentSnapshot, state);

  const originSellOffer = state.openListings.find(l => l.nftokenId === ORIGIN_NFT.nftokenId);

  let summary = `Company finance: ${state.cashTotalXrp.toFixed(2)} XRP total (${state.availableTotalXrp.toFixed(2)} available, ${state.reservedTotalXrp.toFixed(2)} reserved).`;
  
  if (state.openListingsCount > 0) {
    summary += ` ${state.openListingsCount} open listing(s) with aggregate asking price ${state.aggregateAskingPriceXrp.toFixed(2)} XRP (NOT counted as assets).`;
  }

  if (state.originNft?.verified) {
    summary += ` ORIGIN #111 verified on mainnet.`;
  }

  if (changes.length > 0) {
    summary += ` ${changes.length} recent change(s) detected.`;
  } else if (!previousSnapshot) {
    summary += ' No persisted previous snapshot was supplied, so change detection has not run yet.';
  }

  return {
    mode: 'read-only',
    summary,
    companyState: {
      treasuryXrp: state.sovereignTreasuryXrp,
      treasuryAvailable: currentSnapshot.treasuryAvailable,
      hotMinterXrp: state.hotMinterXrp,
      hotMinterAvailable: currentSnapshot.hotMinterAvailable,
      cashTotalXrp: state.cashTotalXrp,
      availableTotalXrp: state.availableTotalXrp,
      reservedTotalXrp: state.reservedTotalXrp,
      treasuryBreakdown: state.treasuryBreakdown ?? null,
      hotMinterBreakdown: state.hotMinterBreakdown ?? null,
    },
    openListings: {
      count: state.openListingsCount,
      aggregateAskingPriceXrp: state.aggregateAskingPriceXrp,
      note: 'Asking prices are NOT counted as assets. Only realized sales count.',
    },
    originNft: {
      status: state.originNft?.status || 'UNKNOWN',
      verified: state.originNft?.verified || false,
      hasSellOffer: !!originSellOffer,
      askingPriceXrp: originSellOffer?.askingPriceXrp ?? null,
    },
    providers: {
      xrpl: state.accounts.some(a => a.evidence.confidence === 'live') ? 'connected' : 'error',
      bank: 'not_connected',
      revolut: 'not_connected',
      broker: 'not_connected',
    },
    recentChanges: changes,
    changeDetection: {
      status: previousSnapshot ? 'compared' : 'no_previous_snapshot',
      note: previousSnapshot
        ? 'Current finance state was compared against the supplied previous snapshot.'
        : 'No persisted previous snapshot was supplied. recentChanges must not be interpreted as proof that nothing changed.',
    },
    snapshot: currentSnapshot,
    lastSync: state.lastUpdated,
  };
}
