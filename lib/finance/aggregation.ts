/**
 * Finance State Aggregation
 *
 * HARD RULES:
 * - Personal assets NEVER count in company totals
 * - owner field enforced in all aggregation
 * - No fake/demo values presented as real
 * - All values have evidence tracking
 * - Open listings (asking prices) are NEVER counted as assets
 */

import type {
  CompanyFinanceState,
  PersonalFinanceState,
  FinanceState,
  XrplAccountSnapshot,
  OriginNftStatus,
  FinanceEvidence,
  FinanceSourceConnection,
  OpenListing,
  FinanceFeed,
  FinanceFeedAccount,
} from './types';
import { KNOWN_ACCOUNTS, ORIGIN_NFT } from './types';

export function aggregateCompanyState(
  accounts: XrplAccountSnapshot[],
  originNft: OriginNftStatus | null,
): CompanyFinanceState {
  const companyAccounts = accounts.filter(a => a.owner === 'company');

  const treasury = companyAccounts.find(
    a => a.role.type === 'SAIMOR_SOVEREIGN_TREASURY'
  );
  const hotMinter = companyAccounts.find(
    a => a.role.type === 'SAIMOR_ORIGIN_HOT_MINTER'
  );

  const sovereignTreasuryXrp = treasury?.error ? null : (treasury?.xrp ?? null);
  const hotMinterXrp = hotMinter?.error ? null : (hotMinter?.xrp ?? null);

  const treasuryAvailable = treasury?.error ? 0 : (treasury?.availableXrp ?? 0);
  const hotMinterAvailable = hotMinter?.error ? 0 : (hotMinter?.availableXrp ?? 0);

  const treasuryReserved = treasury?.error ? 0 : (treasury?.reserve.requiredXrp ?? 0);
  const hotMinterReserved = hotMinter?.error ? 0 : (hotMinter?.reserve.requiredXrp ?? 0);

  const cashTotalXrp = (sovereignTreasuryXrp ?? 0) + (hotMinterXrp ?? 0);
  const availableTotalXrp = treasuryAvailable + hotMinterAvailable;
  const reservedTotalXrp = treasuryReserved + hotMinterReserved;

  const openListings: OpenListing[] = [];
  let aggregateAskingPriceXrp = 0;

  if (originNft?.sellOffers && originNft.sellOffers.length > 0) {
    for (const offer of originNft.sellOffers) {
      openListings.push({
        type: 'nft_sell_offer',
        offerId: offer.offerId,
        nftokenId: offer.nftokenId,
        nftName: ORIGIN_NFT.name,
        askingPriceXrp: offer.amountXrp,
        seller: offer.owner,
        destination: offer.destination,
        expiration: offer.expiration ? new Date(offer.expiration * 1000).toISOString() : null,
        evidence: {
          source: 'xrpl_mainnet_nft_offers',
          fetchedAt: originNft.evidence?.fetchedAt || new Date().toISOString(),
          ledgerIndex: offer.ledgerIndex,
          validatedLedger: null,
          confidence: 'live',
        },
      });
      aggregateAskingPriceXrp += offer.amountXrp;
    }
  }

  const evidence: FinanceEvidence[] = companyAccounts
    .map(a => a.evidence)
    .filter((e): e is FinanceEvidence => e !== null);

  if (originNft?.evidence) {
    evidence.push(originNft.evidence);
  }

  return {
    owner: 'company',
    sovereignTreasuryXrp,
    hotMinterXrp,
    cashTotalXrp,
    availableTotalXrp,
    reservedTotalXrp,
    realizedSalesXrp: 0,
    aggregateAskingPriceXrp,
    openListingsCount: openListings.length,
    floorPriceXrp: openListings.length > 0 ? Math.min(...openListings.map(l => l.askingPriceXrp)) : null,
    accounts: companyAccounts,
    originNft,
    openListings,
    lastUpdated: new Date().toISOString(),
    evidence,
  };
}

export function aggregatePersonalState(
  accounts: XrplAccountSnapshot[],
): PersonalFinanceState {
  const personalAccounts = accounts.filter(a => a.owner === 'personal');

  const totalXrp = personalAccounts.reduce((sum, a) => {
    if (a.error) return sum;
    return sum + a.xrp;
  }, 0);

  const evidence: FinanceEvidence[] = personalAccounts
    .map(a => a.evidence)
    .filter((e): e is FinanceEvidence => e !== null);

  return {
    owner: 'personal',
    totalXrp,
    accounts: personalAccounts,
    lastUpdated: new Date().toISOString(),
    evidence,
  };
}

export function buildFinanceState(
  companyAccounts: XrplAccountSnapshot[],
  personalAccounts: XrplAccountSnapshot[],
  originNft: OriginNftStatus | null,
  connections: FinanceSourceConnection[] = [],
): FinanceState {
  const company = aggregateCompanyState(companyAccounts, originNft);
  const personal = personalAccounts.length > 0
    ? aggregatePersonalState(personalAccounts)
    : null;

  return {
    company,
    personal,
    connections,
    lastSync: new Date().toISOString(),
  };
}

export function buildFinanceFeed(
  state: CompanyFinanceState,
  serverInfo: { reserveBaseXrp: number; reserveIncrementXrp: number; validatedLedger: number },
): FinanceFeed {
  const accounts: FinanceFeedAccount[] = state.accounts.map(a => {
    const lastTx = a.transactions[0] || null;
    return {
      address: a.address,
      role: a.role.type,
      label: a.role.label,
      balance_xrp: a.xrp,
      available_xrp: a.availableXrp,
      reserved_xrp: a.reserve.requiredXrp,
      owner_count: a.reserve.ownerCount,
      last_tx_hash: lastTx?.hash || null,
      last_tx_time: lastTx?.closeTimeIso || null,
      ledger_index: a.evidence.ledgerIndex ?? null,
      fetched_at: a.evidence.fetchedAt,
    };
  });

  const sellOffers = state.originNft?.sellOffers?.map(o => ({
    offer_id: o.offerId,
    nftoken_id: o.nftokenId,
    name: ORIGIN_NFT.name,
    asking_price_xrp: o.amountXrp,
    seller: o.owner,
  })) || [];

  return {
    system: 'saimor-finance',
    schema_version: 'finance-xrpl/1',
    mode: 'read-only',
    generated_at_utc: new Date().toISOString(),
    network: 'mainnet',
    reserves: {
      base_xrp: serverInfo.reserveBaseXrp,
      increment_xrp: serverInfo.reserveIncrementXrp,
      validated_ledger: serverInfo.validatedLedger,
    },
    accounts,
    company: {
      sovereign_treasury_xrp: state.sovereignTreasuryXrp,
      hot_minter_xrp: state.hotMinterXrp,
      cash_total_xrp: state.cashTotalXrp,
      available_total_xrp: state.availableTotalXrp,
      reserved_total_xrp: state.reservedTotalXrp,
      realized_sales_xrp: state.realizedSalesXrp,
      aggregate_asking_price_xrp: state.aggregateAskingPriceXrp,
      open_listings_count: state.openListingsCount,
      floor_price_xrp: state.floorPriceXrp,
    },
    personal: {
      included: false,
    },
    origin: {
      genesis_111: {
        nftoken_id: state.originNft?.nftokenId || ORIGIN_NFT.nftokenId,
        name: ORIGIN_NFT.name,
        status: state.originNft?.status || 'UNKNOWN',
        issuer: state.originNft?.issuer || ORIGIN_NFT.issuer,
        owner: state.originNft?.owner || null,
        flags: state.originNft?.flags || ORIGIN_NFT.flags,
        transfer_fee_percent: (state.originNft?.transferFee || ORIGIN_NFT.transferFee) / 1000,
        art_ipfs: state.originNft?.artIpfs || ORIGIN_NFT.artIpfs,
        metadata_ipfs: state.originNft?.metadataIpfs || ORIGIN_NFT.metadataIpfs,
        verified: state.originNft?.verified || false,
        sell_offers: sellOffers,
      },
      collection: {
        minted_count: 1,
        paused_range: '#001-#110',
        status: 'PAUSED_AWAITING_FINAL_ART',
      },
    },
    providers: {
      xrpl: {
        status: state.accounts.some(a => a.evidence.confidence === 'live') ? 'connected' : 'error',
        last_sync: state.lastUpdated,
      },
      bank_psd2: { status: 'not_connected' },
      revolut_business: { status: 'not_connected' },
      bitvavo: { status: 'not_connected' },
      xtb: { status: 'not_connected' },
    },
  };
}

export function validateOwnerSeparation(state: FinanceState): string[] {
  const errors: string[] = [];

  if (state.company) {
    for (const account of state.company.accounts) {
      if (account.owner !== 'company') {
        errors.push(`Company state contains non-company account: ${account.address}`);
      }
    }
  }

  if (state.personal) {
    for (const account of state.personal.accounts) {
      if (account.owner !== 'personal') {
        errors.push(`Personal state contains non-personal account: ${account.address}`);
      }
    }
  }

  const companyAddresses = new Set(state.company?.accounts.map(a => a.address) ?? []);
  const personalAddresses = new Set(state.personal?.accounts.map(a => a.address) ?? []);

  for (const addr of companyAddresses) {
    if (personalAddresses.has(addr)) {
      errors.push(`Address ${addr} appears in both company and personal state`);
    }
  }

  return errors;
}

export function calculateReserve(
  baseXrp: number,
  incrementXrp: number,
  ownerCount: number,
): number {
  return baseXrp + ownerCount * incrementXrp;
}

export function calculateAvailableXrp(
  balance: number,
  reserveRequired: number,
): number {
  return Math.max(0, balance - reserveRequired);
}

export function isAccountConnected(snapshot: XrplAccountSnapshot): boolean {
  return snapshot.error === null && snapshot.evidence.confidence === 'live';
}

export function getAccountDisplayStatus(snapshot: XrplAccountSnapshot): string {
  if (snapshot.error) {
    if (snapshot.error.includes('not funded')) {
      return 'Not Funded';
    }
    return 'Error';
  }
  if (snapshot.evidence.confidence !== 'live') {
    return 'Stale';
  }
  return 'Live';
}
