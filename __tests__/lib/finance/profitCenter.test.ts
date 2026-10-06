import { buildMonthlyProfitCenter } from '@/lib/finance/profitCenter';
import type { FinanceRecord } from '@/lib/queries/useFinanceStateFlow';

const scope = { tenant_id: 'tenant-1', company_id: 'company-1', owner_kind: 'company' as const };

function record(
  id: string,
  classification: string,
  amount: string,
  extras: Partial<FinanceRecord> = {},
): FinanceRecord {
  return {
    id,
    scope,
    classification,
    effective_at: '2026-10-06T12:00:00Z',
    postings: [
      {
        id: `${id}-cash`,
        account_id: 'cash-1',
        ledger_code: extras.correction_of_record_id ? 'reversal:cash:cash-1' : 'cash:cash-1',
        amount: { value: amount, currency: 'EUR', scale: 2 },
      },
    ],
    ...extras,
  };
}

describe('Finance profit center', () => {
  it('separates operating cash performance from founder funding and transfers', () => {
    const snapshot = buildMonthlyProfitCenter([
      record('receipt', 'customer_receipt', '1000.00'),
      record('expense', 'operating_expense', '-300.00'),
      record('refund', 'refund', '-50.00'),
      record('founder', 'founder_funding', '500.00'),
      {
        ...record('transfer', 'internal_transfer', '-100.00'),
        postings: [
          {
            id: 'transfer-out',
            account_id: 'cash-1',
            ledger_code: 'cash:cash-1',
            amount: { value: '-100.00', currency: 'EUR', scale: 2 },
          },
          {
            id: 'transfer-in',
            account_id: 'cash-2',
            ledger_code: 'cash:cash-2',
            amount: { value: '100.00', currency: 'EUR', scale: 2 },
          },
        ],
      },
    ], {
      now: new Date('2026-10-06T12:00:00Z'),
      hasOlderRecords: false,
    });

    expect(snapshot.customerReceipts.value).toBe('1000.00');
    expect(snapshot.operatingExpenses.value).toBe('300.00');
    expect(snapshot.refunds.value).toBe('50.00');
    expect(snapshot.operatingCashResult.value).toBe('650.00');
    expect(snapshot.founderFunding.value).toBe('500.00');
    expect(snapshot.draftTradingBudget?.value).toBe('65.00');
    expect(snapshot.draftMonthlyLossStop?.value).toBe('3.25');
    expect(snapshot.draftPerTradeRisk?.value).toBe('0.65');
  });

  it('maps a loaded correction back to the original classification', () => {
    const original = record('expense', 'operating_expense', '-300.00');
    const correction = record('correction', 'adjustment', '300.00', {
      correction_of_record_id: original.id,
    });
    const snapshot = buildMonthlyProfitCenter([
      record('receipt', 'customer_receipt', '1000.00'),
      original,
      correction,
    ], {
      now: new Date('2026-10-06T12:00:00Z'),
      hasOlderRecords: false,
    });

    expect(snapshot.operatingExpenses.value).toBe('0.00');
    expect(snapshot.operatingCashResult.value).toBe('1000.00');
    expect(snapshot.unresolvedCorrections).toBe(0);
  });

  it('does not release a draft trading budget from a partial flow window', () => {
    const snapshot = buildMonthlyProfitCenter([
      record('receipt', 'customer_receipt', '1000.00'),
      record('expense', 'operating_expense', '-300.00'),
    ], {
      now: new Date('2026-10-06T12:00:00Z'),
      hasOlderRecords: true,
    });

    expect(snapshot.coverage).toBe('partial');
    expect(snapshot.draftTradingBudget).toBeNull();
    expect(snapshot.financeGeneratedProfit).toBeNull();
  });

  it('fails closed for an unresolved correction', () => {
    const snapshot = buildMonthlyProfitCenter([
      record('receipt', 'customer_receipt', '1000.00'),
      record('correction', 'adjustment', '-100.00', {
        correction_of_record_id: 'missing-original',
      }),
    ], {
      now: new Date('2026-10-06T12:00:00Z'),
      hasOlderRecords: false,
    });

    expect(snapshot.unresolvedCorrections).toBe(1);
    expect(snapshot.draftTradingBudget).toBeNull();
  });
});
