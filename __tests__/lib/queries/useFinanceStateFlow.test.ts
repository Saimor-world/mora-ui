import {
  financeMoneyTruth,
  financeRecordItems,
  financeStateTruth,
  isCompanyFinanceScope,
  type FinanceRecord,
  type FinanceState,
} from '@/lib/queries/useFinanceStateFlow';
import { queryKeys } from '@/lib/queries/queryKeys';

const companyRecord: FinanceRecord = {
  id: 'record-company',
  scope: { tenant_id: 'tenant-1', company_id: 'company-1', owner_kind: 'company' },
  classification: 'founder_funding',
  founder_treatment: 'unclassified',
  source_kind: 'manual',
  effective_at: '2026-09-16T10:00:00Z',
  evidence: {
    source_kind: 'manual',
    reference: 'receipt-001',
    label: 'Founder transfer receipt',
  },
  postings: [],
};

const companyState: FinanceState = {
  scope: { tenant_id: 'tenant-1', company_id: 'company-1', owner_kind: 'company' },
  truth_state: 'partial',
  accounts: [
    {
      id: 'account-1',
      display_name: 'Manual company cash',
      currency: 'EUR',
      truth_state: 'observed',
      observed_balance: { value: '123.45', currency: 'EUR', scale: 2 },
      projected_balance: { value: '123.45', currency: 'EUR', scale: 2 },
      as_of: '2026-09-16T10:00:00Z',
      coverage: 'complete',
      freshness: 'current',
      evidence: { id: 'evidence-1', reference: 'receipt-001', label: 'Opening balance receipt' },
    },
  ],
  currency_states: [
    {
      currency: 'EUR',
      coverage: 'complete',
      included_accounts: 1,
      omitted_accounts: 0,
      observed_total: { value: '123.45', currency: 'EUR', scale: 2 },
      projected_total: { value: '123.45', currency: 'EUR', scale: 2 },
      aggregate_is_partial: false,
    },
  ],
  warnings: [],
};

describe('Finance company truth helpers', () => {
  it('keeps missing money unknown instead of coercing it to zero', () => {
    expect(financeMoneyTruth(null)).toBeNull();
    expect(financeMoneyTruth(undefined)).toBeNull();
    expect(financeMoneyTruth({ value: '0.00', currency: 'EUR', scale: 2 })).toEqual({
      value: '0.00',
      currency: 'EUR',
      scale: 2,
    });
  });

  it('accepts only explicit company ownership and optional matching company id', () => {
    expect(isCompanyFinanceScope(companyRecord.scope)).toBe(true);
    expect(isCompanyFinanceScope(companyRecord.scope, 'company-1')).toBe(true);
    expect(isCompanyFinanceScope(companyRecord.scope, 'company-2')).toBe(false);
    expect(isCompanyFinanceScope({ company_id: 'company-1', owner_kind: 'personal' })).toBe(false);
    expect(isCompanyFinanceScope(null)).toBe(false);
  });

  it('rejects state for the wrong company and preserves exact backend account truth fields', () => {
    expect(financeStateTruth(companyState, 'company-2')).toBeNull();
    const state = financeStateTruth(companyState, 'company-1');
    expect(state?.accounts[0].as_of).toBe('2026-09-16T10:00:00Z');
    expect(state?.accounts[0].coverage).toBe('complete');
    expect(state?.accounts[0].evidence?.reference).toBe('receipt-001');
    expect(state?.currency_states[0].aggregate_is_partial).toBe(false);
  });

  it('filters personal/cross-company records while preserving classification and evidence', () => {
    const payload = {
      scope: companyRecord.scope,
      records: [
        companyRecord,
        {
          ...companyRecord,
          id: 'record-personal',
          scope: { ...companyRecord.scope, owner_kind: 'personal' },
          classification: 'customer_receipt',
        } as unknown as FinanceRecord,
        {
          ...companyRecord,
          id: 'record-other-company',
          scope: { ...companyRecord.scope, company_id: 'company-2' },
          classification: 'operating_expense',
        },
      ],
      next_cursor: null,
    };

    const items = financeRecordItems(payload, 'company-1');

    expect(items).toHaveLength(1);
    expect(items[0].classification).toBe('founder_funding');
    expect(items[0].evidence?.reference).toBe('receipt-001');
    expect(items[0].evidence?.label).toBe('Founder transfer receipt');
  });

  it('binds Finance cache keys to tenant, principal generation and company', () => {
    const a = queryKeys.financeState('tenant-1', 'user-a:owner:g1', 'company-1');
    const b = queryKeys.financeState('tenant-1', 'user-b:owner:g1', 'company-1');
    const c = queryKeys.financeState('tenant-1', 'user-a:owner:g2', 'company-1');
    const d = queryKeys.financeState('tenant-2', 'user-a:owner:g1', 'company-1');

    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).not.toEqual(d);
    expect(a).toEqual(['finance', 'tenant-1', 'user-a:owner:g1', 'company-1', 'state']);
  });

  it('never reclassifies a customer receipt as founder funding or revenue', () => {
    const customerReceipt: FinanceRecord = {
      ...companyRecord,
      id: 'record-customer',
      classification: 'customer_receipt',
      founder_treatment: null,
      evidence: { source_kind: 'provider', reference: 'bank-event-123' },
    };

    const [record] = financeRecordItems(
      { scope: companyRecord.scope, records: [customerReceipt], next_cursor: null },
      'company-1',
    );
    expect(record.classification).toBe('customer_receipt');
    expect(record.founder_treatment).toBeNull();
    expect(record.evidence?.source_kind).toBe('provider');
  });
});
