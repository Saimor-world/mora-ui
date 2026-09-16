import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type FinanceMoney = {
  value: string;
  currency: string;
  scale: number;
};

export type FinanceEvidence = {
  id?: string;
  source_kind: 'manual' | 'provider' | 'on_ledger' | string;
  reference: string;
  label?: string | null;
  observed_at?: string | null;
  created_at?: string | null;
};

export type FinanceAccountState = {
  id: string;
  display_name: string;
  account_type?: string | null;
  currency: string;
  source_kind?: string | null;
  truth_state: string;
  observed_balance: FinanceMoney | null;
  projected_balance: FinanceMoney | null;
  observation?: {
    as_of?: string | null;
    coverage?: string | null;
    freshness?: string | null;
    evidence?: FinanceEvidence | null;
  } | null;
};

export type FinanceCurrencyState = {
  currency: string;
  coverage: string;
  observed_total: FinanceMoney | null;
  projected_total: FinanceMoney | null;
};

export type FinanceState = {
  scope: {
    tenant_id: string;
    company_id: string;
    owner_kind: 'company';
  };
  truth_state: string;
  accounts: FinanceAccountState[];
  currency_states: FinanceCurrencyState[];
  warnings: string[];
};

export type FinancePosting = {
  id: string;
  account_id?: string | null;
  ledger_code: string;
  amount: FinanceMoney | null;
  created_at?: string | null;
};

export type FinanceRecord = {
  id: string;
  scope: FinanceState['scope'];
  classification: string;
  founder_treatment?: string | null;
  effective_at?: string | null;
  source_kind?: string | null;
  memo?: string | null;
  correction_of_record_id?: string | null;
  recorded_by?: string | null;
  recorded_at?: string | null;
  evidence?: FinanceEvidence | null;
  postings: FinancePosting[];
  corrections?: Array<{ id: string; recorded_at?: string | null; reason?: string | null }>;
};

export type FinanceRecordList = {
  items?: FinanceRecord[];
  records?: FinanceRecord[];
  next_cursor?: string | null;
};

export function useFinanceState(companyId?: string | null, enabled = true) {
  return useQuery<FinanceState | null>({
    queryKey: queryKeys.financeState(companyId),
    queryFn: () =>
      coreGet(`/v3/finance/state?company_id=${encodeURIComponent(companyId || '')}`, {
        isOptional: true,
        throwAuthErrors: true,
      }) as Promise<FinanceState | null>,
    enabled: Boolean(companyId && enabled),
    staleTime: STALE_TIMES.financeState,
    refetchOnWindowFocus: true,
  });
}

export function useFinanceRecords(companyId?: string | null, limit = 50, enabled = true) {
  return useQuery<FinanceRecordList | FinanceRecord[] | null>({
    queryKey: queryKeys.financeRecords(companyId, limit),
    queryFn: () =>
      coreGet(`/v3/finance/records?company_id=${encodeURIComponent(companyId || '')}&limit=${limit}`, {
        isOptional: true,
        throwAuthErrors: true,
      }) as Promise<FinanceRecordList | FinanceRecord[] | null>,
    enabled: Boolean(companyId && enabled),
    staleTime: STALE_TIMES.financeRecords,
    refetchOnWindowFocus: true,
  });
}

export function isCompanyFinanceScope(
  scope: { company_id?: string | null; owner_kind?: string | null } | null | undefined,
  companyId?: string | null,
): boolean {
  if (!scope || scope.owner_kind !== 'company') return false;
  return companyId ? scope.company_id === companyId : Boolean(scope.company_id);
}

export function financeMoneyTruth(value: FinanceMoney | null | undefined): FinanceMoney | null {
  return value ?? null;
}

export function financeRecordItems(
  payload: FinanceRecordList | FinanceRecord[] | null | undefined,
  companyId?: string | null,
): FinanceRecord[] {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.records)
        ? payload.records
        : [];

  return items.filter((record) => isCompanyFinanceScope(record?.scope, companyId));
}
