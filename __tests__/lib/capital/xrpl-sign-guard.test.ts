import {
  analyzeXrplSigningRequest,
  describeXrplAmount,
  dropsToXrp,
} from '@/lib/capital/xrpl-sign-guard';

describe('XRPL sign guard', () => {
  it('formats XRP drops exactly without floating point coercion', () => {
    expect(dropsToXrp('1')).toBe('0.000001 XRP');
    expect(dropsToXrp('1000000')).toBe('1 XRP');
    expect(dropsToXrp('123456789')).toBe('123.456789 XRP');
    expect(describeXrplAmount({ value: '0.1000000000000001', currency: 'USD', issuer: 'rIssuer' }))
      .toBe('0.1000000000000001 USD · issuer rIssuer');
  });

  it('understands a direct XRP payment and compares the signing account', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      TransactionType: 'Payment',
      Account: 'rSender',
      Destination: 'rDestination',
      Amount: '2500000',
      Fee: '12',
      Sequence: 10,
      LastLedgerSequence: 12345,
    }), 'rSender');

    expect(result.verdict).toBe('elevated');
    expect(result.accountMatches).toBe(true);
    expect(result.effects).toContain('Zahlung 2.5 XRP an rDestination');
    expect(result.fee).toBe('0.000012 XRP');
    expect(result.unknownFields).toEqual([]);
  });

  it('treats a signer-account mismatch as critical', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      txjson: {
        TransactionType: 'Payment',
        Account: 'rUnexpected',
        Destination: 'rDestination',
        Amount: '1000000',
        LastLedgerSequence: 12345,
      },
    }), 'rExpected');

    expect(result.verdict).toBe('critical');
    expect(result.accountMatches).toBe(false);
    expect(result.findings.some((item) => item.code === 'account_mismatch')).toBe(true);
  });

  it('treats partial payments as critical because Amount is not delivered amount', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      payload: {
        txjson: {
          TransactionType: 'Payment',
          Account: 'rSender',
          Destination: 'rDestination',
          Amount: { value: '100', currency: 'USD', issuer: 'rIssuer' },
          SendMax: '50000000',
          Flags: 0x00020000,
          LastLedgerSequence: 12345,
        },
      },
    }));

    expect(result.verdict).toBe('critical');
    expect(result.findings.some((item) => item.code === 'partial_payment')).toBe(true);
    expect(result.effects).toContain('Maximaler Sendeaufwand: 50 XRP');
  });

  it('treats signing-authority changes as critical', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      TransactionType: 'SetRegularKey',
      Account: 'rSender',
      RegularKey: 'rNewSigner',
      LastLedgerSequence: 12345,
    }));

    expect(result.verdict).toBe('critical');
    expect(result.effects).toContain('Regular Key setzen: rNewSigner');
  });

  it('never accepts secret-like fields for review', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      payload: {
        seed: 'sNeverPutASeedHere',
        txjson: {
          TransactionType: 'Payment',
          Account: 'rSender',
          Destination: 'rDestination',
          Amount: '1',
        },
      },
    }));

    expect(result.verdict).toBe('blocked');
    expect(result.transaction).toBeNull();
    expect(result.findings[0].detail).toContain('Seed/Secret/Private-Key');
  });

  it('surfaces unsupported transaction types and unknown fields instead of guessing', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      TransactionType: 'FutureTransaction',
      Account: 'rSender',
      LastLedgerSequence: 12345,
      MysteryField: 'value',
    }));

    expect(result.verdict).toBe('unknown');
    expect(result.unknownFields).toEqual(['MysteryField']);
    expect(result.findings.some((item) => item.code === 'unsupported_type')).toBe(true);
  });

  it('explains trust-line changes without calling them a payment', () => {
    const result = analyzeXrplSigningRequest(JSON.stringify({
      TransactionType: 'TrustSet',
      Account: 'rHolder',
      LimitAmount: {
        value: '1000',
        currency: 'USD',
        issuer: 'rIssuer',
      },
      LastLedgerSequence: 12345,
    }));

    expect(result.verdict).toBe('elevated');
    expect(result.effects).toContain('Trustline ändern: 1000 USD · issuer rIssuer');
    expect(result.findings.some((item) => item.code === 'trustline_change')).toBe(true);
  });

  it('blocks links or malformed non-JSON instead of pretending to inspect them', () => {
    const result = analyzeXrplSigningRequest('https://xaman.app/sign/abc');
    expect(result.verdict).toBe('blocked');
    expect(result.findings[0].detail).toContain('kein gültiges JSON');
  });
});
