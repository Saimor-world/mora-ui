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
  source_kind?: 'manual' | 'provider' | 'on_ledger' | string;
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
  status?: string | null;
  source_kind?: string | null;
  truth_state: 'observed' | 'missing_observation' | string;
  observed_balance: FinanceMoney | null;
  projected_balance: FinanceMoney | null;
  movement_after_observation?: FinanceMoney | null;
  as_of?: string | null;
  freshness?: string | null;
  coverage?: string | null;
  evidence?: FinanceEvidence | null;
};

export type FinanceCurrencyState = {
  currency: string;
  coverage: 'complete' | 'partial' | 'unknown' | string;
  included_accounts?: number;
  omitted_accounts?: number;
  observed_total: FinanceMoney | null;
  projected_total: FinanceMoney | null;
  aggregate_is_partial?: boolean;
};

export type FinanceScope = {
  tenant_id: string;
  company_id: string;
  owner_kind: 'company';
};

export type FinanceState = {
  scope: FinanceScope;
  as_of?: string | null;
  truth_state: 'missing' | 'partial' | 'observed' | string;
  accounts: FinanceAccountState[];
  currency_states: FinanceCurrencyState[];
  recent_records?: FinanceRecord[];
  warnings: string[];
  notes?: string[];
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
  scope: FinanceScope;
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
  scope?: FinanceScope;
  records?: FinanceRecord[];
  next_cursor?: string | null;
};

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

export function financeStateTruth(
  state: FinanceState | null | undefined,
  companyId?: string | null,
): FinanceState | null {
  if (!state || !isCompanyFinanceScope(state.scope, companyId)) return null;
  return state;
}

export function financeRecordItems(
  payload: FinanceRecordList | null | undefined,
  companyId?: string | null,
): FinanceRecord[] {
  if (payload?.scope && !isCompanyFinanceScope(payload.scope, companyId)) return [];
  const items = Array.isArray(payload?.records) ? payload.records : [];
  return items.filter((record) => isCompanyFinanceScope(record?.scope, companyId));
}

export function useFinanceState(companyId?: string | null, enabled = true) {
  return useQuery<FinanceState | null>({
    queryKey: queryKeys.financeState(companyId),
    queryFn: async () => {
      const state = await coreGet(`/v3/finance/state?company_id=${encodeURIComponent(companyId || '')}`, {
        isOptional: true,
        throwAuthErrors: true,
      }) as FinanceState | null;
      return financeStateTruth(state, companyId);
    },
    enabled: Boolean(companyId && enabled),
    staleTime: STALE_TIMES.financeState,
    refetchOnWindowFocus: true,
  });
}

export function useFinanceRecords(companyId?: string | null, limit = 50, enabled = true) {
  return useQuery<FinanceRecordList | null>({
    queryKey: queryKeys.financeRecords(companyId, limit),
    queryFn: async () => {
      const payload = await coreGet(`/v3/finance/records?company_id=${encodeURIComponent(companyId || '')}&limit=${limit}`, {
        isOptional: true,
        throwAuthErrors: true,
      }) as FinanceRecordList | null;
      if (!payload) return null;
      if (payload.scope && !isCompanyFinanceScope(payload.scope, companyId)) return null;
      return {
        ...payload,
        records: financeRecordItems(payload, companyId),
      };
    },
    enabled: Boolean(companyId && enabled),
    staleTime: STALE_TIMES.financeRecords,
    refetchOnWindowFocus: true,
  });
}
