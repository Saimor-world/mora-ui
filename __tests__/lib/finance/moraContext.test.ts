import {
  createSnapshot,
  detectChanges,
  buildMoraContext,
  type FinanceSnapshot,
} from '@/lib/finance/moraContext';
import { aggregateCompanyState } from '@/lib/finance/aggregation';
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

function createMockOriginNft(): OriginNftStatus {
  return {
    nftokenId: '001A138896FFC115A26EB4E8D497207ACAA8C7CB7D80C385CDB238CB0666FA87',
    issuer: 'rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6',
    owner: 'rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6',
    flags: 26,
    transferFee: 5000,
    taxon: 1001,
    uri: 'ipfs://QmQ481ZaPQQcFmtz3bCt4CPCMSC6D6WRZjcURudkgrCV3b',
    status: 'LIVE_GENESIS_MAINNET_PROOF',
    artIpfs: 'ipfs://QmY41PCna6XHqdSxfSgP1z9CS9NzwVgD6ZcQGFLZoJRdxx',
    metadataIpfs: 'ipfs://QmQ481ZaPQQcFmtz3bCt4CPCMSC6D6WRZjcURudkgrCV3b',
    verified: true,
    sellOffers: [],
    evidence: {
      source: 'xrpl_mainnet_nft_lookup',
      fetchedAt: new Date().toISOString(),
      ledgerIndex: null,
      validatedLedger: null,
      confidence: 'live',
    },
  };
}

describe('MÔRA Finance Context', () => {
  describe('createSnapshot', () => {
    it('creates snapshot from company state', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        xrp: 113,
        availableXrp: 112,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
        reserve: { baseXrp: 1, incrementXrp: 0.2, requiredXrp: 1, ownerCount: 0 },
      });

      const state = aggregateCompanyState([treasury], null);
      const snapshot = createSnapshot(state);

      expect(snapshot.treasuryXrp).toBe(113);
      expect(snapshot.treasuryAvailable).toBe(112);
      expect(snapshot.treasuryOwnerCount).toBe(0);
    });

    it('captures latest transaction hashes', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
        transactions: [
          { hash: 'ABC123', ledgerIndex: 100, closeTimeIso: null, type: 'Payment', direction: 'in', account: '', destination: null, destinationTag: null, invoiceId: null, amount: '1000000', result: 'tesSUCCESS', validated: true, commerce: false },
        ],
      });

      const state = aggregateCompanyState([treasury], null);
      const snapshot = createSnapshot(state);

      expect(snapshot.latestTxHashes).toContain('ABC123');
    });
  });

  describe('detectChanges', () => {
    it('returns empty array when no previous snapshot', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });
      const state = aggregateCompanyState([treasury], null);
      const current = createSnapshot(state);

      const changes = detectChanges(null, current, state);

      expect(changes).toHaveLength(0);
    });

    it('detects treasury balance change', () => {
      const previous: FinanceSnapshot = {
        treasuryXrp: 100,
        treasuryAvailable: 99,
        treasuryOwnerCount: 0,
        hotMinterXrp: 5,
        hotMinterAvailable: 3.6,
        hotMinterOwnerCount: 2,
        openListingsCount: 0,
        aggregateAskingPriceXrp: 0,
        latestTxHashes: [],
        fetchedAt: new Date().toISOString(),
      };

      const treasury = createMockSnapshot({
        owner: 'company',
        xrp: 113,
        availableXrp: 112,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });
      const state = aggregateCompanyState([treasury], null);
      const current = createSnapshot(state);

      const changes = detectChanges(previous, current, state);

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(c => c.type === 'balance_changed')).toBe(true);
      expect(changes.some(c => c.description.includes('113'))).toBe(true);
    });

    it('detects new transaction', () => {
      const previous: FinanceSnapshot = {
        treasuryXrp: 100,
        treasuryAvailable: 99,
        treasuryOwnerCount: 0,
        hotMinterXrp: null,
        hotMinterAvailable: null,
        hotMinterOwnerCount: null,
        openListingsCount: 0,
        aggregateAskingPriceXrp: 0,
        latestTxHashes: ['OLD123'],
        fetchedAt: new Date().toISOString(),
      };

      const treasury = createMockSnapshot({
        owner: 'company',
        xrp: 100,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
        transactions: [
          { hash: 'NEW456', ledgerIndex: 100, closeTimeIso: null, type: 'Payment', direction: 'in', account: '', destination: null, destinationTag: null, invoiceId: null, amount: '1000000', result: 'tesSUCCESS', validated: true, commerce: false },
        ],
      });
      const state = aggregateCompanyState([treasury], null);
      const current = createSnapshot(state);

      const changes = detectChanges(previous, current, state);

      expect(changes.some(c => c.type === 'new_transaction')).toBe(true);
    });

    it('detects listing created', () => {
      const previous: FinanceSnapshot = {
        treasuryXrp: 100,
        treasuryAvailable: 99,
        treasuryOwnerCount: 0,
        hotMinterXrp: 5,
        hotMinterAvailable: 3.6,
        hotMinterOwnerCount: 2,
        openListingsCount: 0,
        aggregateAskingPriceXrp: 0,
        latestTxHashes: [],
        fetchedAt: new Date().toISOString(),
      };

      const originNft = createMockOriginNft();
      originNft.sellOffers = [{
        offerId: 'offer123',
        nftokenId: originNft.nftokenId,
        owner: originNft.issuer,
        destination: null,
        amountDrops: '111000000',
        amountXrp: 111,
        flags: 0,
        expiration: null,
        ledgerIndex: null,
      }];

      const hotMinter = createMockSnapshot({
        owner: 'company',
        xrp: 5,
        role: { type: 'SAIMOR_ORIGIN_HOT_MINTER', label: 'Hot Minter', description: '' },
      });
      const state = aggregateCompanyState([hotMinter], originNft);
      const current = createSnapshot(state);

      const changes = detectChanges(previous, current, state);

      expect(changes.some(c => c.type === 'listing_created')).toBe(true);
    });
  });

  describe('buildMoraContext', () => {
    it('builds read-only context', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        xrp: 113,
        availableXrp: 112,
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });

      const state = aggregateCompanyState([treasury], createMockOriginNft());
      const context = buildMoraContext(state, null);

      expect(context.mode).toBe('read-only');
      expect(context.companyState.treasuryXrp).toBe(113);
      expect(context.originNft.verified).toBe(true);
    });

    it('includes open listings note about not being assets', () => {
      const originNft = createMockOriginNft();
      originNft.sellOffers = [{
        offerId: 'offer123',
        nftokenId: originNft.nftokenId,
        owner: originNft.issuer,
        destination: null,
        amountDrops: '111000000',
        amountXrp: 111,
        flags: 0,
        expiration: null,
        ledgerIndex: null,
      }];

      const hotMinter = createMockSnapshot({
        owner: 'company',
        xrp: 5,
        role: { type: 'SAIMOR_ORIGIN_HOT_MINTER', label: 'Hot Minter', description: '' },
      });
      const state = aggregateCompanyState([hotMinter], originNft);
      const context = buildMoraContext(state, null);

      expect(context.openListings.count).toBe(1);
      expect(context.openListings.aggregateAskingPriceXrp).toBe(111);
      expect(context.openListings.note).toContain('NOT counted as assets');
    });

    it('marks unconnected providers correctly', () => {
      const treasury = createMockSnapshot({
        owner: 'company',
        role: { type: 'SAIMOR_SOVEREIGN_TREASURY', label: 'Treasury', description: '' },
      });

      const state = aggregateCompanyState([treasury], null);
      const context = buildMoraContext(state, null);

      expect(context.providers.xrpl).toBe('connected');
      expect(context.providers.bank).toBe('not_connected');
      expect(context.providers.revolut).toBe('not_connected');
      expect(context.providers.broker).toBe('not_connected');
    });
  });
});
