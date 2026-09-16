import {
  financeMoneyTruth,
  financeRecordItems,
  isCompanyFinanceScope,
  type FinanceRecord,
} from '@/lib/queries/useFinanceStateFlow';

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

  it('filters personal/cross-company records while preserving classification and evidence', () => {
    const payload = [
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
    ];

    const items = financeRecordItems(payload, 'company-1');

    expect(items).toHaveLength(1);
    expect(items[0].classification).toBe('founder_funding');
    expect(items[0].evidence?.reference).toBe('receipt-001');
    expect(items[0].evidence?.label).toBe('Founder transfer receipt');
  });

  it('never reclassifies a customer receipt as founder funding or revenue', () => {
    const customerReceipt: FinanceRecord = {
      ...companyRecord,
      id: 'record-customer',
      classification: 'customer_receipt',
      founder_treatment: null,
      evidence: { source_kind: 'provider', reference: 'bank-event-123' },
    };

    const [record] = financeRecordItems({ items: [customerReceipt] }, 'company-1');
    expect(record.classification).toBe('customer_receipt');
    expect(record.founder_treatment).toBeNull();
    expect(record.evidence?.source_kind).toBe('provider');
  });
});
