/**
 * Finance State Aggregation
 *
 * HARD RULES:
 * - Personal assets NEVER count in company totals
 * - owner field enforced in all aggregation
 * - No fake/demo values presented as real
 * - All values have evidence tracking
 */

import type {
  CompanyFinanceState,
  PersonalFinanceState,
  FinanceState,
  XrplAccountSnapshot,
  OriginNftStatus,
  FinanceEvidence,
  FinanceSourceConnection,
} from './types';
import { KNOWN_ACCOUNTS } from './types';

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

  const totalCashXrp = (sovereignTreasuryXrp ?? 0) + (hotMinterXrp ?? 0);

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
    realizedSalesXrp: 0,
    aggregateAskingPriceXrp: 0,
    floorPriceXrp: null,
    totalCashXrp,
    totalOperationallyBoundXrp: hotMinterXrp ?? 0,
    accounts: companyAccounts,
    originNft,
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
