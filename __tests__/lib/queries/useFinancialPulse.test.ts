import { buildFinancialPulse } from '@/lib/queries/useFinancialPulse';

describe('buildFinancialPulse', () => {
  it('keeps real tenant revenue and invoiced system costs in separate scopes', () => {
    const pulse = buildFinancialPulse(
      {
        source: 'real',
        items: [{ month: '2026-08', mrr: 12500, arr: 150000, currency: 'EUR', source: 'paddle' }],
      },
      {
        period: '2026-08',
        currency: 'EUR',
        actual_eur: 320,
        estimated_eur: 410,
        actual_source: 'hetzner-invoice-2026-08',
        actual_set_at: '2026-08-18T10:00:00Z',
      },
    );

    expect(pulse.revenue.monthly).toBe(12500);
    expect(pulse.infrastructure).toMatchObject({
      monthly: 320,
      kind: 'actual',
      source: 'hetzner-invoice-2026-08',
    });
    expect(pulse.revenue.scope).toBe('tenant');
    expect(pulse.infrastructure.scope).toBe('system');
  });

  it('keeps a technical estimate visibly separate from a real invoice', () => {
    const pulse = buildFinancialPulse(
      {
        source: 'real',
        items: [{ month: '2026-08', mrr: 2000, currency: 'EUR', source: 'real' }],
      },
      {
        period: '2026-08',
        currency: 'EUR',
        actual_eur: null,
        estimated_eur: 48.35,
        estimate_breakdown: {
          price_source: 'Hetzner list price',
          price_as_of: '2026-07',
        },
      },
    );

    expect(pulse.infrastructure).toMatchObject({
      monthly: 48.35,
      kind: 'estimate',
      source: 'Hetzner list price',
    });
  });

  it('normalizes real provider banking facts without mixing currencies or scopes', () => {
    const pulse = buildFinancialPulse(
      null,
      null,
      {
        status: 'connected',
        source: 'real',
        connections: [{
          provider: 'revolut_business',
          last_synced_at: '2026-08-20T10:30:00Z',
          consent_expires_at: null,
        }],
        accounts: [{ id: 'eur-account', currency: 'EUR' }, { id: 'usd-account', currency: 'USD' }],
        balances_by_currency: { EUR: 8432.1, USD: 2100 },
        recent_transactions: [{ id: 'transaction-1' }],
      },
    );

    expect(pulse.banking).toMatchObject({
      scope: 'tenant',
      status: 'connected',
      provider: 'revolut_business',
      balancesByCurrency: { EUR: 8432.1, USD: 2100 },
      accountCount: 2,
      recentTransactionCount: 1,
    });
  });

  it('never turns mock, unavailable or missing data into a zero-value business fact', () => {
    const pulse = buildFinancialPulse(
      {
        source: 'mock',
        items: [{ month: '2026-08', mrr: 999999, currency: 'EUR', source: 'mock' }],
      },
      null,
    );

    expect(pulse.revenue.monthly).toBeNull();
    expect(pulse.infrastructure.monthly).toBeNull();
  });
});
