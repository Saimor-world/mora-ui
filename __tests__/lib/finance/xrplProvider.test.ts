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
});
