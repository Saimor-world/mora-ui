import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { queryKeys, STALE_TIMES } from './queryKeys';

type RevenueMonthlyItem = {
  month?: string;
  mrr?: number | null;
  arr?: number | null;
  currency?: string;
  source?: string;
  warnings?: string[];
};

type RevenueMonthlyResponse = {
  items?: RevenueMonthlyItem[];
  source?: string;
  adapterWarnings?: string[];
};

type SystemCostsResponse = {
  period?: string;
  currency?: string;
  actual_eur?: number | null;
  estimated_eur?: number | null;
  actual_source?: string | null;
  actual_set_at?: string | null;
  estimate_breakdown?: {
    price_source?: string;
    price_as_of?: string;
    confidence?: string;
  } | null;
};

type FinanceOverviewResponse = {
  status?: 'connected' | 'not_connected' | 'unavailable' | string;
  source?: string;
  connections?: Array<{
    provider?: string;
    label?: string;
    status?: string;
    last_synced_at?: string | null;
    consent_expires_at?: string | null;
  }>;
  accounts?: Array<{ id?: string; currency?: string }>;
  balances_by_currency?: Record<string, number | null>;
  recent_transactions?: Array<{ id?: string }>;
  warnings?: string[];
};

export type FinancialPulse = {
  scope: 'tenant';
  revenue: {
    scope: 'tenant';
    monthly: number | null;
    annualRunRate: number | null;
    period: string | null;
    currency: string;
    source: string;
    warnings: string[];
  };
  banking: {
    scope: 'tenant';
    status: 'connected' | 'not_connected' | 'unavailable';
    provider: string | null;
    balancesByCurrency: Record<string, number>;
    accountCount: number;
    recentTransactionCount: number;
    lastSyncedAt: string | null;
    consentExpiresAt: string | null;
    warnings: string[];
  };
  infrastructure: {
    scope: 'system';
    monthly: number | null;
    kind: 'actual' | 'estimate' | 'missing';
    period: string | null;
    currency: string;
    source: string;
    observedAt: string | null;
  };
};

const UNTRUSTED_SOURCES = new Set(['mock', 'demo', 'unavailable', 'none', 'unknown']);

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function trustedSource(source: string | undefined): boolean {
  return Boolean(source && !UNTRUSTED_SOURCES.has(source.toLowerCase()));
}

function normalizeBanking(payload: FinanceOverviewResponse | null | undefined): FinancialPulse['banking'] {
  const connected = payload?.status === 'connected' && trustedSource(payload.source);
  const balancesByCurrency: Record<string, number> = {};
  if (connected) {
    for (const [rawCurrency, rawValue] of Object.entries(payload?.balances_by_currency ?? {})) {
      const value = finiteNumber(rawValue);
      if (value != null) balancesByCurrency[rawCurrency.toUpperCase()] = value;
    }
  }
  const connection = connected ? payload?.connections?.[0] : null;
  const status =
    connected
      ? 'connected'
      : payload?.status === 'not_connected'
        ? 'not_connected'
        : 'unavailable';

  return {
    scope: 'tenant',
    status,
    provider: connection?.provider || null,
    balancesByCurrency,
    accountCount: connected ? payload?.accounts?.length ?? 0 : 0,
    recentTransactionCount: connected ? payload?.recent_transactions?.length ?? 0 : 0,
    lastSyncedAt: connection?.last_synced_at || null,
    consentExpiresAt: connection?.consent_expires_at || null,
    warnings: payload?.warnings ?? [],
  };
}

export function buildFinancialPulse(
  revenuePayload: RevenueMonthlyResponse | null | undefined,
  costsPayload: SystemCostsResponse | null | undefined,
  financePayload?: FinanceOverviewResponse | null,
): FinancialPulse {
  const latest = revenuePayload?.items?.[0];
  const revenueSource = latest?.source || revenuePayload?.source || 'unavailable';
  const revenueTrusted = trustedSource(revenueSource);
  const monthlyRevenue = revenueTrusted ? finiteNumber(latest?.mrr) : null;
  const annualRunRate = revenueTrusted ? finiteNumber(latest?.arr) : null;
  const revenueCurrency = latest?.currency || 'EUR';

  const actual = finiteNumber(costsPayload?.actual_eur);
  const estimate = finiteNumber(costsPayload?.estimated_eur);
  const infrastructureKind = actual != null ? 'actual' : estimate != null ? 'estimate' : 'missing';
  const infrastructureMonthly = actual ?? estimate;
  const infrastructureCurrency = costsPayload?.currency || 'EUR';

  return {
    scope: 'tenant',
    revenue: {
      scope: 'tenant',
      monthly: monthlyRevenue,
      annualRunRate,
      period: latest?.month || null,
      currency: revenueCurrency,
      source: revenueSource,
      warnings: [...(revenuePayload?.adapterWarnings ?? []), ...(latest?.warnings ?? [])],
    },
    banking: normalizeBanking(financePayload),
    infrastructure: {
      scope: 'system',
      monthly: infrastructureMonthly,
      kind: infrastructureKind,
      period: costsPayload?.period || null,
      currency: infrastructureCurrency,
      source:
        infrastructureKind === 'actual'
          ? costsPayload?.actual_source || 'Kostenledger'
          : infrastructureKind === 'estimate'
            ? costsPayload?.estimate_breakdown?.price_source || 'CORE-Kostenschätzung'
            : 'unavailable',
      observedAt:
        infrastructureKind === 'actual'
          ? costsPayload?.actual_set_at || null
          : infrastructureKind === 'estimate'
            ? costsPayload?.estimate_breakdown?.price_as_of || null
            : null,
    },
  };
}

export function useFinancialPulse(scopeId?: string | null, enabled = true) {
  return useQuery<FinancialPulse>({
    queryKey: queryKeys.financialPulse(scopeId),
    queryFn: async () => {
      const [revenue, costs, finance] = await Promise.all([
        coreGet('/v1/revenue/monthly?limit=2', { isOptional: true }) as Promise<RevenueMonthlyResponse | null>,
        coreGet('/v3/system/costs?raw=true&months=2', { isOptional: true }) as Promise<SystemCostsResponse | null>,
        coreGet('/v1/finance/overview?transaction_limit=5', { isOptional: true }) as Promise<FinanceOverviewResponse | null>,
      ]);
      return buildFinancialPulse(revenue, costs, finance);
    },
    enabled: Boolean(scopeId && enabled),
    staleTime: STALE_TIMES.financialPulse,
    refetchOnWindowFocus: true,
  });
}