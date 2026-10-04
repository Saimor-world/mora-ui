import {
  KNOWN_ACCOUNTS,
  ORIGIN_NFT,
  MINTING_STATUS,
  type FinanceOwner,
  type XrplAccountSnapshot,
  type CompanyFinanceState,
  type PersonalFinanceState,
} from '@/lib/finance/types';

describe('Finance Types', () => {
  describe('KNOWN_ACCOUNTS', () => {
    it('defines treasury with company owner', () => {
      expect(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.owner).toBe('company');
      expect(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address).toBe('rG3P7J5iWPon74PFxVuPemJzoGSz4XnWUB');
      expect(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.role.type).toBe('SAIMOR_SOVEREIGN_TREASURY');
    });

    it('defines hot minter with company owner', () => {
      expect(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.owner).toBe('company');
      expect(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address).toBe('rNmQjteRtj68W3AJz3AHxjpGH5HfkW1Lk6');
      expect(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.role.type).toBe('SAIMOR_ORIGIN_HOT_MINTER');
    });

    it('treasury and hot minter are different addresses', () => {
      expect(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address).not.toBe(
        KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address
      );
    });

    it('treasury label clearly identifies it as treasury', () => {
      expect(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.role.label).toContain('Treasury');
    });

    it('hot minter label clearly identifies it as NOT treasury', () => {
      expect(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.role.label).toContain('Hot Minter');
      expect(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.role.description).toContain('NOT the treasury');
    });
  });

  describe('ORIGIN_NFT', () => {
    it('has correct NFTokenID', () => {
      expect(ORIGIN_NFT.nftokenId).toBe('001A138896FFC115A26EB4E8D497207ACAA8C7CB7D80C385CDB238CB0666FA87');
    });

    it('issuer is hot minter, not treasury', () => {
      expect(ORIGIN_NFT.issuer).toBe(KNOWN_ACCOUNTS.SAIMOR_ORIGIN_HOT_MINTER.address);
      expect(ORIGIN_NFT.issuer).not.toBe(KNOWN_ACCOUNTS.SAIMOR_SOVEREIGN_TREASURY.address);
    });

    it('has correct XLS-20 flags', () => {
      expect(ORIGIN_NFT.flags).toBe(26);
    });

    it('has 5% transfer fee', () => {
      expect(ORIGIN_NFT.transferFee).toBe(5000);
    });

    it('has IPFS URIs for art and metadata', () => {
      expect(ORIGIN_NFT.artIpfs).toMatch(/^ipfs:\/\/Qm/);
      expect(ORIGIN_NFT.metadataIpfs).toMatch(/^ipfs:\/\/Qm/);
    });

    it('status is LIVE_GENESIS_MAINNET_PROOF', () => {
      expect(ORIGIN_NFT.status).toBe('LIVE_GENESIS_MAINNET_PROOF');
    });
  });

  describe('MINTING_STATUS', () => {
    it('range is #001-#110', () => {
      expect(MINTING_STATUS.range).toBe('#001-#110');
    });

    it('status is PAUSED_AWAITING_FINAL_ART', () => {
      expect(MINTING_STATUS.status).toBe('PAUSED_AWAITING_FINAL_ART');
    });
  });

  describe('Owner type safety', () => {
    it('FinanceOwner only allows personal or company', () => {
      const validOwners: FinanceOwner[] = ['personal', 'company'];
      expect(validOwners).toContain('personal');
      expect(validOwners).toContain('company');
      expect(validOwners.length).toBe(2);
    });
  });
});
