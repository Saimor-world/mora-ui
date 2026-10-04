import {
  aggregateCompanyState,
  aggregatePersonalState,
  buildFinanceState,
  validateOwnerSeparation,
  calculateReserve,
  calculateAvailableXrp,
  isAccountConnected,
  getAccountDisplayStatus,
} from '@/lib/finance/aggregation';
import type { XrplAccountSnapshot, OriginNftStatus } from '@/lib/finance/types';

function createMockSnapshot(overrides: Partial<XrplAccountSnapshot> = {}): XrplAccountSnapshot {
  return {
    address: 'rTestAddress123456789012345678901234',
    owner: 'company',
    role: {
      type: 'UNKNOWN',
      label: 'Test Account',
      description: 'Test',
    },
    network: 'mainnet',
    mode: 'read-only',
    xrp: 100,
    drops: '100000000',
    availableXrp: 99,
    reserve: {
      baseXrp: 1,
      incrementXrp: 0.2,
      requiredXrp: 1,
      ownerCount: 0,
    },
    sequence: 1,
    security: {
      accountFlags: 0,
      masterKeyDisabled: false,
      regularKey: null,
      signerListCount: 0,
    },
    trustLines: [],
    transactions: [],
    evidence: {
      source: 'xrpl_mainnet',
      fetchedAt: new Date().toISOString(),
      ledgerIndex: 12345,
      validatedLedger: 12345,
      confidence: 'live',
    },
    error: null,
    ...overrides,
  };
}

describe('Finance Aggregation', () => {
  describe('aggregateCompanyState', () => {
    it('only includes company-owned accounts', () => {
      const companyAccount = createMockSnapshot({ owner: 'company', xrp: 100 });
      const personalAccount = createMockSnapshot({ owner: 'personal', xrp: 500 });

      const state = aggregateCompanyState([companyAccount, personalAccount], null);

      expect(state.owner).toBe('company');
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].owner).toBe('company');
    });

    it('never counts personal XRP in company totals', () => {
      const companyAccount = createMockSnapshot({
        owner: 'company',
        xrp: 100,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });
      const personalAccount = createMockSnapshot({ owner: 'personal', xrp: 1000 });

      const state = aggregateCompanyState([companyAccount, personalAccount], null);

      expect(state.cashTotalXrp).toBe(100);
      expect(state.sovereignTreasuryXrp).toBe(100);
    });

    it('separates treasury and hot minter XRP', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        xrp: 113,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });
      const hotMinter = createMockSnapshot({
        owner: 'company',
        xrp: 5,
        role: { type: 'SAIMOR_ORIGIN_HOT_MINTER', label: 'Hot Minter', description: '' },
      });

      const state = aggregateCompanyState([treasury, hotMinter], null);

      expect(state.sovereignTreasuryXrp).toBe(113);
      expect(state.hotMinterXrp).toBe(5);
      expect(state.cashTotalXrp).toBe(118);
    });

    it('does NOT count asking price as an asset', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        xrp: 100,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });

      const state = aggregateCompanyState([treasury], null);

      expect(state.aggregateAskingPriceXrp).toBe(0);
      expect(state.cashTotalXrp).toBe(100);
    });

    it('handles account errors gracefully', () => {
      const errorAccount = createMockSnapshot({
        owner: 'company',
        xrp: 0,
        error: 'Account not funded',
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });

      const state = aggregateCompanyState([errorAccount], null);

      expect(state.sovereignTreasuryXrp).toBeNull();
      expect(state.cashTotalXrp).toBe(0);
    });
  });

  describe('aggregatePersonalState', () => {
    it('only includes personal-owned accounts', () => {
      const personalAccount = createMockSnapshot({ owner: 'personal', xrp: 500 });
      const companyAccount = createMockSnapshot({ owner: 'company', xrp: 100 });

      const state = aggregatePersonalState([personalAccount, companyAccount]);

      expect(state.owner).toBe('personal');
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].owner).toBe('personal');
    });

    it('never counts company XRP in personal totals', () => {
      const personalAccount = createMockSnapshot({ owner: 'personal', xrp: 555 });
      const companyAccount = createMockSnapshot({ owner: 'company', xrp: 100 });

      const state = aggregatePersonalState([personalAccount, companyAccount]);

      expect(state.totalXrp).toBe(555);
    });
  });

  describe('validateOwnerSeparation', () => {
    it('returns empty array for valid separation', () => {
      const companyAccounts = [createMockSnapshot({ owner: 'company' })];
      const personalAccounts = [createMockSnapshot({ owner: 'personal', address: 'rPersonal123' })];

      const state = buildFinanceState(companyAccounts, personalAccounts, null);
      const errors = validateOwnerSeparation(state);

      expect(errors).toHaveLength(0);
    });

    it('detects personal account in company state', () => {
      const mixedAccounts = [
        createMockSnapshot({ owner: 'company' }),
        createMockSnapshot({ owner: 'personal', address: 'rPersonal123' }),
      ];

      const state = {
        company: aggregateCompanyState(mixedAccounts, null),
        personal: null,
        connections: [],
        lastSync: new Date().toISOString(),
      };

      state.company.accounts = mixedAccounts;

      const errors = validateOwnerSeparation(state);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('non-company'))).toBe(true);
    });

    it('detects same address in both states', () => {
      const sharedAddress = 'rSharedAddress12345678901234567890';
      const companyAccount = createMockSnapshot({ owner: 'company', address: sharedAddress });
      const personalAccount = createMockSnapshot({ owner: 'personal', address: sharedAddress });

      const state = buildFinanceState([companyAccount], [personalAccount], null);
      const errors = validateOwnerSeparation(state);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('appears in both'))).toBe(true);
    });
  });

  describe('Reserve calculations', () => {
    it('calculates reserve correctly with owner count 0', () => {
      const reserve = calculateReserve(1, 0.2, 0);
      expect(reserve).toBe(1);
    });

    it('calculates reserve correctly with owner count 2', () => {
      const reserve = calculateReserve(1, 0.2, 2);
      expect(reserve).toBe(1.4);
    });

    it('calculates available XRP correctly', () => {
      const available = calculateAvailableXrp(113, 1.4);
      expect(available).toBeCloseTo(111.6);
    });

    it('available XRP never goes negative', () => {
      const available = calculateAvailableXrp(0.5, 1);
      expect(available).toBe(0);
    });
  });

  describe('Account status helpers', () => {
    it('isAccountConnected returns true for live accounts', () => {
      const snapshot = createMockSnapshot({ error: null });
      snapshot.evidence.confidence = 'live';

      expect(isAccountConnected(snapshot)).toBe(true);
    });

    it('isAccountConnected returns false for errored accounts', () => {
      const snapshot = createMockSnapshot({ error: 'Connection failed' });

      expect(isAccountConnected(snapshot)).toBe(false);
    });

    it('getAccountDisplayStatus returns correct status', () => {
      expect(getAccountDisplayStatus(createMockSnapshot({ error: null }))).toBe('Live');
      expect(getAccountDisplayStatus(createMockSnapshot({ error: 'Account not funded' }))).toBe('Not Funded');
      expect(getAccountDisplayStatus(createMockSnapshot({ error: 'Other error' }))).toBe('Error');
    });
  });
});
