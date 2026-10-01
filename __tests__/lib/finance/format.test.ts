import {
  absoluteFinanceMoney,
  financeRecordMovementSummary,
  formatFinanceMoney,
} from '@/lib/finance/format';
import type { FinanceRecord } from '@/lib/queries/useFinanceStateFlow';

function record(partial: Partial<FinanceRecord>): FinanceRecord {
  return {
    id: 'record-1',
    scope: { tenant_id: 'tenant-1', company_id: 'company-1', owner_kind: 'company' },
    classification: 'founder_funding',
    postings: [],
    ...partial,
  };
}

describe('Finance exact display helpers', () => {
  it('formats exact decimal strings without Number coercion', () => {
    expect(formatFinanceMoney({ value: '12345678901234567890.01', currency: 'EUR', scale: 2 }))
      .toBe('12.345.678.901.234.567.890,01 €');
    expect(formatFinanceMoney({ value: '-0.01', currency: 'EUR', scale: 2 })).toBe('-0,01 €');
    expect(formatFinanceMoney({ value: '1', currency: 'XRP', scale: 6 })).toBe('1,000000 XRP');
  });

  it('preserves exact money when taking absolute value', () => {
    expect(absoluteFinanceMoney({ value: '-9007199254740993.99', currency: 'EUR', scale: 2 }))
      .toEqual({ value: '9007199254740993.99', currency: 'EUR', scale: 2 });
  });

  it('renders an internal transfer as neutral and keeps both cash legs', () => {
    const summary = financeRecordMovementSummary(record({
      classification: 'internal_transfer',
      postings: [
        {
          id: 'p1',
          account_id: 'cash-a',
          ledger_code: 'cash:cash-a',
          amount: { value: '-25.00', currency: 'EUR', scale: 2 },
        },
        {
          id: 'p2',
          account_id: 'cash-b',
          ledger_code: 'cash:cash-b',
          amount: { value: '25.00', currency: 'EUR', scale: 2 },
        },
      ],
    }));

    expect(summary.kind).toBe('transfer');
    expect(summary.direction).toBe('neutral');
    expect(summary.amount?.value).toBe('25.00');
    expect(summary.cashPostings).toHaveLength(2);
  });

  it('recognizes reversal cash postings instead of dropping their amount', () => {
    const summary = financeRecordMovementSummary(record({
      classification: 'adjustment',
      correction_of_record_id: 'original-1',
      postings: [
        {
          id: 'p1',
          account_id: 'cash-a',
          ledger_code: 'reversal:cash:cash-a',
          amount: { value: '-12.34', currency: 'EUR', scale: 2 },
        },
        {
          id: 'p2',
          account_id: null,
          ledger_code: 'reversal:founder_equity',
          amount: { value: '12.34', currency: 'EUR', scale: 2 },
        },
      ],
    }));

    expect(summary.kind).toBe('reversal');
    expect(summary.amount?.value).toBe('-12.34');
    expect(summary.direction).toBe('out');
  });

  it('does not invent a movement amount when multiple non-transfer cash legs are ambiguous', () => {
    const summary = financeRecordMovementSummary(record({
      classification: 'adjustment',
      postings: [
        {
          id: 'p1',
          account_id: 'cash-a',
          ledger_code: 'cash:cash-a',
          amount: { value: '-1.00', currency: 'EUR', scale: 2 },
        },
        {
          id: 'p2',
          account_id: 'cash-b',
          ledger_code: 'cash:cash-b',
          amount: { value: '1.00', currency: 'EUR', scale: 2 },
        },
      ],
    }));

    expect(summary.kind).toBe('unknown');
    expect(summary.amount).toBeNull();
  });
});
