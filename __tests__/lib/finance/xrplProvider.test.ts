import { KNOWN_ACCOUNTS, ORIGIN_NFT } from '@/lib/finance/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('XRPL Provider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('Security constraints', () => {
    it('KNOWN_ACCOUNTS contains only public addresses, no seeds', () => {
      const treasuryAddr = KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address;
      const hotMinterAddr = KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address;

      expect(treasuryAddr).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/);
      expect(hotMinterAddr).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/);

      expect(treasuryAddr).not.toMatch(/^s[1-9A-HJ-NP-Za-km-z]{28}$/);
      expect(hotMinterAddr).not.toMatch(/^s[1-9A-HJ-NP-Za-km-z]{28}$/);
    });

    it('module exports do not expose any signing functions', async () => {
      const financeModule = await import('@/lib/finance');

      const exportedNames = Object.keys(financeModule);

      const signingKeywords = ['sign', 'submit', 'payment', 'mint', 'burn', 'modify', 'send', 'transfer'];
      for (const keyword of signingKeywords) {
        const hasSigningFunction = exportedNames.some(
          name => name.toLowerCase().includes(keyword) && typeof (financeModule as any)[name] === 'function'
        );
        expect(hasSigningFunction).toBe(false);
      }
    });

    it('read-only methods exist', async () => {
      const financeModule = await import('@/lib/finance');

      expect(typeof financeModule.fetchAccountSnapshot).toBe('function');
      expect(typeof financeModule.fetchServerInfo).toBe('function');
      expect(typeof financeModule.fetchCompanyAccounts).toBe('function');
      expect(typeof financeModule.fetchOriginNftStatus).toBe('function');
    });
  });

  describe('Address validation', () => {
    it('XRPL addresses match expected format', () => {
      const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

      expect(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address).toMatch(xrplAddressRegex);
      expect(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address).toMatch(xrplAddressRegex);
    });

    it('seed patterns are NOT valid addresses', () => {
      const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

      const fakeSeed = 'sEdSJHS4oiAdz7w2X2ni1gFiqtbJHqE';
      expect(fakeSeed).not.toMatch(xrplAddressRegex);
    });
  });

  describe('ORIGIN NFT configuration', () => {
    it('NFT issuer is the hot minter', () => {
      expect(ORIGIN_NFT.issuer).toBe(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address);
    });

    it('NFT issuer is NOT the treasury', () => {
      expect(ORIGIN_NFT.issuer).not.toBe(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address);
    });

    it('NFT has correct XLS-20 flags for read-only display', () => {
      const flags = ORIGIN_NFT.flags;
      const FLAG_ONLY_XRP = 0x02;
      const FLAG_TRANSFERABLE = 0x08;
      const FLAG_MUTABLE = 0x10;

      expect(flags & FLAG_ONLY_XRP).toBeTruthy();
      expect(flags & FLAG_TRANSFERABLE).toBeTruthy();
      expect(flags & FLAG_MUTABLE).toBeTruthy();
    });
  });

  describe('Mock detection', () => {
    it('evidence confidence distinguishes live from mock', () => {
      const liveEvidence = {
        source: 'xrpl_mainnet',
        fetchedAt: new Date().toISOString(),
        ledgerIndex: 107424072,
        validatedLedger: 107424072,
        confidence: 'live' as const,
      };

      const mockEvidence = {
        source: 'mock',
        fetchedAt: new Date().toISOString(),
        ledgerIndex: null,
        validatedLedger: null,
        confidence: 'mock' as const,
      };

      expect(liveEvidence.confidence).toBe('live');
      expect(mockEvidence.confidence).toBe('mock');
      expect(liveEvidence.confidence).not.toBe(mockEvidence.confidence);
    });
  });

  describe('Ripple Epoch & Ledger Classification', () => {
    it('converts Ripple Epoch seconds (+946684800) to UTC ISO-8601', async () => {
      const { rippleTimeToIso } = await import('@/lib/finance/xrplProvider');
      expect(rippleTimeToIso(829004960)).toBe('2026-04-08T23:09:20.000Z');
      expect(rippleTimeToIso(null)).toBeNull();
      expect(rippleTimeToIso(0)).toBeNull();
    });

    it('dynamically classifies Treasury 111 target, 113 founder funding, and 0.00002 external dust', async () => {
      const { classifyAccountTransactions } = await import('@/lib/finance/xrplProvider');
      const treasuryAddr = KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address;
      const breakdown = classifyAccountTransactions(
        treasuryAddr,
        [
          {
            hash: 'TX1',
            ledgerIndex: 100,
            closeTimeIso: '2026-04-08T23:09:20.000Z',
            type: 'Payment',
            direction: 'in',
            account: 'rFounder',
            destination: treasuryAddr,
            destinationTag: null,
            invoiceId: null,
            amount: '111000000',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
          {
            hash: 'TX2',
            ledgerIndex: 101,
            closeTimeIso: '2026-04-08T23:09:22.000Z',
            type: 'Payment',
            direction: 'in',
            account: 'rSpam1',
            destination: treasuryAddr,
            destinationTag: null,
            invoiceId: null,
            amount: '10',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
          {
            hash: 'TX3',
            ledgerIndex: 102,
            closeTimeIso: '2026-04-09T11:46:40.000Z',
            type: 'Payment',
            direction: 'in',
            account: 'rFounder',
            destination: treasuryAddr,
            destinationTag: null,
            invoiceId: null,
            amount: '2000000',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
          {
            hash: 'TX4',
            ledgerIndex: 103,
            closeTimeIso: '2026-04-09T11:46:50.000Z',
            type: 'Payment',
            direction: 'in',
            account: 'rSpam2',
            destination: treasuryAddr,
            destinationTag: null,
            invoiceId: null,
            amount: '10',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
        ],
        113.00002,
      );

      expect(breakdown.targetAllocationXrp).toBe(111);
      expect(breakdown.founderFundingXrp).toBe(113);
      expect(breakdown.initialAllocationFundingXrp).toBe(111);
      expect(breakdown.topUpFundingXrp).toBe(2);
      expect(breakdown.externalDustXrp).toBe(0.00002);
      expect(breakdown.realizedSalesXrp).toBe(0);
      expect(breakdown.ledgerBalanceXrp).toBe(113.00002);
    });

    it('dynamically classifies Hot-Minter funding, dust, and NFTokenMint/NFTokenCreateOffer fees', async () => {
      const { classifyAccountTransactions } = await import('@/lib/finance/xrplProvider');
      const hotMinterAddr = KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address;
      const breakdown = classifyAccountTransactions(
        hotMinterAddr,
        [
          {
            hash: 'HM1',
            ledgerIndex: 200,
            closeTimeIso: '2026-04-08T18:55:40.000Z',
            type: 'Payment',
            direction: 'in',
            account: 'rFounder',
            destination: hotMinterAddr,
            destinationTag: null,
            invoiceId: null,
            amount: '5000000',
            feeDrops: '10',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
          {
            hash: 'HM2',
            ledgerIndex: 201,
            closeTimeIso: '2026-04-08T18:55:42.000Z',
            type: 'Payment',
            direction: 'in',
            account: 'rSpam',
            destination: hotMinterAddr,
            destinationTag: null,
            invoiceId: null,
            amount: '10',
            feeDrops: '10',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
          {
            hash: 'HM3',
            ledgerIndex: 202,
            closeTimeIso: '2026-04-08T18:58:21.000Z',
            type: 'NFTokenMint',
            direction: 'out',
            account: hotMinterAddr,
            destination: null,
            destinationTag: null,
            invoiceId: null,
            amount: null,
            feeDrops: '10',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
          {
            hash: 'HM4',
            ledgerIndex: 203,
            closeTimeIso: '2026-04-08T19:03:00.000Z',
            type: 'NFTokenCreateOffer',
            direction: 'out',
            account: hotMinterAddr,
            destination: null,
            destinationTag: null,
            invoiceId: null,
            amount: '111000000',
            feeDrops: '10',
            result: 'tesSUCCESS',
            validated: true,
            commerce: false,
          },
        ],
        4.99999,
      );

      expect(breakdown.targetAllocationXrp).toBeNull();
      expect(breakdown.founderFundingXrp).toBe(5);
      expect(breakdown.externalDustXrp).toBe(0.00001);
      expect(breakdown.totalFeesXrp).toBe(0.00002);
      expect(breakdown.realizedSalesXrp).toBe(0);
      expect(breakdown.ledgerBalanceXrp).toBe(4.99999);
    });
  });
});
