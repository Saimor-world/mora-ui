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
}

/**
 * Company-level finance aggregation.
 * NEVER includes personal assets.
 */
export interface CompanyFinanceState {
  owner: 'company';

  sovereignTreasuryXrp: number | null;
  hotMinterXrp: number | null;

  realizedSalesXrp: number;
  aggregateAskingPriceXrp: number;
  floorPriceXrp: number | null;

  totalCashXrp: number;
  totalOperationallyBoundXrp: number;

  accounts: XrplAccountSnapshot[];
  originNft: OriginNftStatus | null;

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
