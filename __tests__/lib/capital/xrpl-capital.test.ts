import { holdScenario, positionValue, xrpDebit, lpDelta, currencyLabel } from '@/lib/capital/xrpl-capital';
describe('XRP capital accounting', () => {
  it('compares against XRP HOLD, not a mixed-token benchmark', () => {
    expect(holdScenario(5, 1)?.differenceXrp).toBe(0);
    expect(holdScenario(5, 2)?.lpXrp).toBeCloseTo(3.5355339059);
    expect(holdScenario(5, 0.5)?.lpXrp).toBeCloseTo(7.0710678119);
    expect(holdScenario(5, 0)).toBeNull();
  });
  it('values both proportional assets without adding fees twice', () => {
    expect(positionValue(100, 200, 1000, 10)).toEqual({share: 0.01, xrp: 1, token: 2, spotEquivalentXrp: 2});
    expect(positionValue(100, 200, 0, 10)).toBeNull();
    expect(positionValue(100, 200, 1000, 1001)).toBeNull();
  });
  it('uses actual XRP balance debit including network fee', () => {
    const meta = {AffectedNodes: [{ModifiedNode: {LedgerEntryType: 'AccountRoot', FinalFields: {Account: 'wallet', Balance: '5000000'}, PreviousFields: {Balance: '10000010'}}}]};
    expect(xrpDebit(meta, 'wallet')).toBe(5.00001);
    expect(xrpDebit(meta, 'other')).toBeNull();
  });
  it('respects low/high account orientation for LP trustlines', () => {
    const meta = {AffectedNodes: [{CreatedNode: {LedgerEntryType: 'RippleState', NewFields: {LowLimit: {issuer: 'pool'}, HighLimit: {issuer: 'wallet'}, Balance: {currency: 'LP', value: '-10'}}}}]};
    expect(lpDelta(meta, 'wallet', 'pool', 'LP')).toBe(10);
    expect(lpDelta(meta, 'wallet', 'pool', 'other')).toBeNull();
  });
  it('decodes DROP without relabeling LP tokens', () => {
    expect(currencyLabel('44524F5000000000000000000000000000000000')).toBe('DROP');
    const lp = '03B245BE580EC4F4386A751C084489EC4B514A2F';
    expect(currencyLabel(lp)).toBe(lp);
  });
});
