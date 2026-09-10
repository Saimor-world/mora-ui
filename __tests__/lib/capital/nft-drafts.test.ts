import { mintReviewDraft, sellReviewDraft, xrpPriceToDrops } from '@/lib/capital/nft-drafts';
const account = 'r3q2jXeSs8JZeaaVHeNSnz52XXs4GtLidj';
describe('unsigned NFT review drafts', () => {
  it('preserves exact drops and rejects free gifts, rounding and exponent prices', () => {
    expect(xrpPriceToDrops('2,000001')).toBe('2000001');
    for (const value of ['0', '-1', '0.0000001', '1e2', '1.']) expect(() => xrpPriceToDrops(value)).toThrow();
  });
  it('sets transferable XRP-only mint with no secondary fee and no signing fields', () => {
    const draft = mintReviewDraft(account, 'ipfs://example/metadata.json');
    expect(draft.Flags).toBe(10);
    expect(draft.TransferFee).toBe(0);
    expect(draft).not.toHaveProperty('Fee');
    expect(draft).not.toHaveProperty('TxnSignature');
    expect(() => mintReviewDraft(account, 'https://example.org/' + 'a'.repeat(256))).toThrow();
    expect(() => mintReviewDraft(account, 'javascript:alert(1)')).toThrow();
  });
  it('builds a sell offer rather than a buy offer', () => {
    expect(sellReviewDraft(account, 'A'.repeat(64), '1.5')).toMatchObject({TransactionType:'NFTokenCreateOffer', Flags:1, Amount:'1500000'});
    expect(() => sellReviewDraft(account, 'invalid', '1')).toThrow();
  });
});
