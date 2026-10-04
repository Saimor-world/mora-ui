/**
 * SAIMÔR Finance Types
 *
 * Core type definitions for the finance operating layer.
 * HARD RULES enforced in types:
 * - owner field strictly separates 'personal' | 'company'
 * - personal assets NEVER count in company totals
 * - no secrets, seeds, or signing material in any type
 * - all values must have evidence/source tracking
 */

export type FinanceOwner = 'personal' | 'company';

export type FinanceSourceStatus =
  | 'connected'
  | 'syncing'
  | 'stale'
  | 'error'
  | 'not_connected'
  | 'mock';

export type FinanceSourceProvider =
  | 'xrpl'
  | 'bank_psd2'
  | 'finapi'
  | 'revolut_business'
  | 'bitvavo'
  | 'xtb_statement'
  | 'physical_asset'
  | 'manual';

export interface FinanceEvidence {
  source: string;
  fetchedAt: string;
  ledgerIndex?: number | null;
  validatedLedger?: number | null;
  confidence: 'live' | 'stale' | 'estimated' | 'mock';
}

export interface FinanceSourceConnection {
  id: string;
  provider: FinanceSourceProvider;
  owner: FinanceOwner;
  label: string;
  status: FinanceSourceStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  evidence: FinanceEvidence | null;
}

export interface XrplAccountRole {
  type:
    | 'SAIMOR_SOVEREIGN_TREASURY'
    | 'SAIMOR_ORIGIN_HOT_MINTER'
    | 'PERSONAL_WALLET'
    | 'OPERATIONAL'
    | 'UNKNOWN';
  label: string;
  description: string;
}

export interface XrplReserve {
  baseXrp: number;
  incrementXrp: number;
  requiredXrp: number;
  ownerCount: number;
}

export interface XrplTrustLine {
  currency: string;
  balance: string;
  issuer: string;
  limit: string;
  noRipple: boolean;
  freeze: boolean;
  authorized: boolean | null;
}

export interface XrplTransaction {
  hash: string;
  ledgerIndex: number | null;
  closeTimeIso: string | null;
  type: string;
  direction: 'in' | 'out';
  account: string;
  destination: string | null;
  destinationTag: number | null;
  invoiceId: string | null;
  amount: unknown;
  result: string;
  validated: boolean;
  commerce: boolean;
}

export interface XrplAccountSecurity {
  accountFlags: number;
  masterKeyDisabled: boolean;
  regularKey: string | null;
  signerListCount: number;
}

export interface XrplAccountSnapshot {
  address: string;
  owner: FinanceOwner;
  role: XrplAccountRole;
  network: 'mainnet' | 'testnet' | 'devnet';
  mode: 'read-only';

  xrp: number;
  drops: string;
  availableXrp: number;
  reserve: XrplReserve;
  sequence: number;
  security: XrplAccountSecurity;

  trustLines: XrplTrustLine[];
  transactions: XrplTransaction[];

  evidence: FinanceEvidence;
  error: string | null;
}

export interface NftSellOffer {
  offerId: string;
  nftokenId: string;
  owner: string;
  destination: string | null;
  amountDrops: string;
  amountXrp: number;
  flags: number;
  expiration: number | null;
  ledgerIndex: number | null;
}

export interface OpenListing {
  type: 'nft_sell_offer';
  offerId: string;
  nftokenId: string;
  nftName: string;
  askingPriceXrp: number;
  seller: string;
  destination: string | null;
  expiration: string | null;
  evidence: FinanceEvidence;
}

export interface OriginNftStatus {
  nftokenId: string;
  issuer: string;
  owner: string | null;
  flags: number;
  transferFee: number;
  taxon: number;
  uri: string | null;
  status: 'LIVE_GENESIS_MAINNET_PROOF' | 'MINTING_PAUSED' | 'UNKNOWN';
  artIpfs: string | null;
  metadataIpfs: string | null;
  verified: boolean;
  evidence: FinanceEvidence | null;
  sellOffers: NftSellOffer[];
}

/**
 * Company-level finance aggregation.
 * NEVER includes personal assets.
 */
export interface CompanyFinanceState {
  owner: 'company';

  sovereignTreasuryXrp: number | null;
  hotMinterXrp: number | null;

  cashTotalXrp: number;
  availableTotalXrp: number;
  reservedTotalXrp: number;

  realizedSalesXrp: number;
  aggregateAskingPriceXrp: number;
  openListingsCount: number;
  floorPriceXrp: number | null;

  accounts: XrplAccountSnapshot[];
  originNft: OriginNftStatus | null;
  openListings: OpenListing[];

  lastUpdated: string;
  evidence: FinanceEvidence[];
}

/**
 * Personal finance state (founder's wallets).
 * Strictly separated from company.
 */
export interface PersonalFinanceState {
  owner: 'personal';

  totalXrp: number;
  accounts: XrplAccountSnapshot[];

  lastUpdated: string;
  evidence: FinanceEvidence[];
}

export interface FinanceState {
  company: CompanyFinanceState | null;
  personal: PersonalFinanceState | null;
  connections: FinanceSourceConnection[];
  lastSync: string | null;
}

export const KNOWN_ACCOUNTS = {
  SAIMOR_SOVEREIGN_TREASURY: {
    address: 'rG3P7J5iWPon74PFxVuPemJzoGSz4XnWUB',
    owner: 'company' as FinanceOwner,
    role: {
      type: 'SAIMOR_SOVEREIGN_TREASURY' as const,
      label: 'SAIMÔR · 111 Treasury',
      description: 'Company sovereign treasury, read-only. Initial deposit 111 XRP.',
    },
  },
  SAIMOR_ORIGIN_HOT_MINTER: {
    address: 'rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6',
    owner: 'company' as FinanceOwner,
    role: {
      type: 'SAIMOR_ORIGIN_HOT_MINTER' as const,
      label: 'SAIMÔR Origin Hot Minter',
      description: 'Operational hot wallet for NFT minting. NOT the treasury.',
    },
  },
} as const;

export const ORIGIN_NFT = {
  nftokenId: '001A138896FFC115A26EB4E8D497207ACAA8C7CB7D80C385CDB238CB0666FA87',
  issuer: 'rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6',
  name: 'SAIMÔR // ORIGIN #111 — Klarheit im Wandel',
  flags: 26,
  transferFee: 5000,
  artIpfs: 'ipfs://QmY41PCna6XHqdSxfSgP1z9CS9NzwVgD6ZcQGFLZoJRdxx',
  metadataIpfs: 'ipfs://QmQ481ZaPQQcFmtz3bCt4CPCMSC6D6WRZjcURudkgrCV3b',
  status: 'LIVE_GENESIS_MAINNET_PROOF' as const,
} as const;

export const MINTING_STATUS = {
  range: '#001-#110',
  status: 'PAUSED_AWAITING_FINAL_ART',
} as const;

/**
 * Normalized feed schema 'finance-xrpl/1'
 * Compatible with yori_finance_live_treasury.json
 */
export interface FinanceFeedAccount {
  address: string;
  role: string;
  label: string;
  balance_xrp: number;
  available_xrp: number;
  reserved_xrp: number;
  owner_count: number;
  last_tx_hash: string | null;
  last_tx_time: string | null;
  ledger_index: number | null;
  fetched_at: string;
}

export interface FinanceFeedOpenListing {
  offer_id: string;
  nftoken_id: string;
  name: string;
  asking_price_xrp: number;
  seller: string;
}

export interface FinanceFeedOrigin {
  genesis_111: {
    nftoken_id: string;
    name: string;
    status: string;
    issuer: string;
    owner: string | null;
    flags: number;
    transfer_fee_percent: number;
    art_ipfs: string;
    metadata_ipfs: string;
    verified: boolean;
    sell_offers: FinanceFeedOpenListing[];
  };
  collection: {
    minted_count: number;
    paused_range: string;
    status: string;
  };
}

export interface FinanceFeed {
  system: 'saimor-finance';
  schema_version: 'finance-xrpl/1';
  mode: 'read-only';
  generated_at_utc: string;
  network: 'mainnet';
  reserves: {
    base_xrp: number;
    increment_xrp: number;
    validated_ledger: number;
  };
  accounts: FinanceFeedAccount[];
  company: {
    sovereign_treasury_xrp: number | null;
    hot_minter_xrp: number | null;
    cash_total_xrp: number;
    available_total_xrp: number;
    reserved_total_xrp: number;
    realized_sales_xrp: number;
    aggregate_asking_price_xrp: number;
    open_listings_count: number;
    floor_price_xrp: number | null;
  };
  personal: {
    included: false;
  };
  origin: FinanceFeedOrigin;
  providers: {
    xrpl: { status: 'connected' | 'error'; last_sync: string };
    bank_psd2: { status: 'not_connected' };
    revolut_business: { status: 'not_connected' };
    bitvavo: { status: 'not_connected' };
    xtb: { status: 'not_connected' };
  };
}
