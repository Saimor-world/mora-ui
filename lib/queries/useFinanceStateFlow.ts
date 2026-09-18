import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CoreError, coreGet, corePost } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
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
  kind?: 'manual_statement' | 'core_node' | string;
  has_resolved_resource?: boolean;
};

export type FinanceEvidenceInput = {
  source_kind: 'manual';
  reference: string;
  label?: string | null;
  observed_at?: string | null;
  resource_node_id?: string | null;
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

export type FinanceEvidenceDetail = {
  scope: FinanceScope;
  evidence: FinanceEvidence | null;
  resource: {
    kind: 'core_node';
    id: string;
    title: string;
    type?: string | null;
    open_target: { type: 'node'; id: string };
  } | null;
};

export type FinanceWriteReceipt = {
  kind: string;
  id?: string | null;
  company_id?: string | null;
  persisted: boolean;
  financial_action_executed: boolean;
};

export type FinanceWriteEnvelope<T> = {
  data: T;
  receipt: FinanceWriteReceipt;
  meta?: Record<string, unknown>;
};

export type ManualFinanceAccount = {
  id: string;
  scope: FinanceScope;
  display_name: string;
  account_type?: string | null;
  currency: string;
  source_kind: 'manual';
  status: string;
  truth_state: 'missing_observation';
};

export type FinanceObservation = {
  id: string;
  scope: FinanceScope;
  account_id: string;
  amount: FinanceMoney;
  as_of: string;
  source_kind: 'manual';
  coverage: string;
  freshness: string;
  evidence_id: string;
};

export type ManualAccountCreateInput = {
  company_id: string;
  display_name: string;
  currency: 'EUR';
  account_type?: string | null;
};

export type BalanceObservationCreateInput = {
  company_id: string;
  account_id: string;
  amount: FinanceMoney;
  as_of: string;
  evidence: FinanceEvidenceInput;
  coverage: 'partial' | 'unknown';
  freshness?: 'current' | 'stale' | 'unknown';
};

export type FinancialRecordCreateInput = {
  company_id: string;
  account_id: string;
  classification:
    | 'founder_funding'
    | 'customer_receipt'
    | 'operating_expense'
    | 'internal_transfer'
    | 'refund'
    | 'adjustment'
    | 'unclassified';
  amount: FinanceMoney;
  effective_at: string;
  evidence: FinanceEvidenceInput;
  idempotency_key: string;
  memo?: string | null;
  founder_treatment?: 'equity' | 'loan' | 'unclassified' | null;
  direction?: 'credit' | 'debit' | null;
  destination_account_id?: string | null;
};

export type FinancialCorrectionCreateInput = {
  company_id: string;
  idempotency_key: string;
  evidence: FinanceEvidenceInput;
  reason: string;
  effective_at?: string | null;
};

export type FinanceReadErrorKind = 'unauthenticated' | 'denied' | 'scope_mismatch' | 'unavailable';

type FinanceIdentity = {
  tenantId: string | null;
  identityKey: string;
  sessionGeneration: number;
};

function useFinanceIdentity(): FinanceIdentity {
  const user = useSessionStore((state) => state.user);
  const sessionGeneration = useSessionStore((state) => state.sessionGeneration);
  return {
    tenantId: user?.tenant_id ?? null,
    identityKey: user
      ? `${user.id}:${user.role}:g${sessionGeneration}`
      : `anonymous:g${sessionGeneration}`,
    sessionGeneration,
  };
}

export function financeReadErrorKind(error: unknown): FinanceReadErrorKind {
  if (error instanceof CoreError) {
    if (error.status === 401) return 'unauthenticated';
    if (error.status === 403 && error.details?.code === 'finance_scope_mismatch') return 'scope_mismatch';
    if (error.status === 403) return 'denied';
  }
  return 'unavailable';
}

export function isCompanyFinanceScope(
  scope: { tenant_id?: string | null; company_id?: string | null; owner_kind?: string | null } | null | undefined,
  companyId?: string | null,
  tenantId?: string | null,
): boolean {
  if (!scope || scope.owner_kind !== 'company') return false;
  if (companyId && scope.company_id !== companyId) return false;
  if (tenantId && scope.tenant_id !== tenantId) return false;
  return Boolean(scope.company_id && scope.tenant_id);
}

export function financeMoneyTruth(value: FinanceMoney | null | undefined): FinanceMoney | null {
  return value ?? null;
}

export function financeStateTruth(
  state: FinanceState | null | undefined,
  companyId?: string | null,
  tenantId?: string | null,
): FinanceState | null {
  if (!state || !isCompanyFinanceScope(state.scope, companyId, tenantId)) return null;
  return state;
}

export function financeRecordItems(
  payload: FinanceRecordList | null | undefined,
  companyId?: string | null,
  tenantId?: string | null,
): FinanceRecord[] {
  if (payload?.scope && !isCompanyFinanceScope(payload.scope, companyId, tenantId)) return [];
  const items = Array.isArray(payload?.records) ? payload.records : [];
  return items.filter((record) => isCompanyFinanceScope(record?.scope, companyId, tenantId));
}

function requireRead<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new CoreError(message, 503);
  return value;
}

function requireScope<T extends { scope?: FinanceScope | null }>(
  value: T,
  companyId: string,
  tenantId: string,
): T {
  if (!isCompanyFinanceScope(value.scope, companyId, tenantId)) {
    throw new CoreError('Finance scope mismatch', 403, { code: 'finance_scope_mismatch' });
  }
  return value;
}

function validateWriteEnvelope<T extends { scope?: FinanceScope | null }>(
  envelope: FinanceWriteEnvelope<T> | null | undefined,
  companyId: string,
  tenantId: string,
): FinanceWriteEnvelope<T> {
  const value = requireRead(envelope, 'Finance write returned no receipt');
  requireScope(value.data, companyId, tenantId);
  if (
    !value.receipt?.persisted
    || value.receipt.company_id !== companyId
    || value.receipt.financial_action_executed !== false
  ) {
    throw new CoreError('Finance write receipt did not prove a safe persistence-only action', 502);
  }
  return value;
}

function shouldRetryFinance(failureCount: number, error: unknown) {
  const kind = financeReadErrorKind(error);
  if (kind === 'unauthenticated' || kind === 'denied' || kind === 'scope_mismatch') return false;
  return failureCount < 1;
}

export function useFinanceState(companyId?: string | null, enabled = true) {
  const identity = useFinanceIdentity();
  return useQuery<FinanceState>({
    queryKey: queryKeys.financeState(identity.tenantId, identity.identityKey, companyId),
    queryFn: async () => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const state = requireRead(
        await coreGet(`/v3/finance/state?company_id=${encodeURIComponent(requestedCompanyId)}`, {
          throwAuthErrors: true,
        }) as FinanceState | null,
        'Finance state is unavailable',
      );
      const scoped = financeStateTruth(state, requestedCompanyId, tenantId);
      if (!scoped) {
        throw new CoreError('Finance scope mismatch', 403, { code: 'finance_scope_mismatch' });
      }
      return scoped;
    },
    enabled: Boolean(companyId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeState,
    refetchOnWindowFocus: true,
    retry: shouldRetryFinance,
  });
}

export function useFinanceRecords(companyId?: string | null, limit = 50, enabled = true) {
  const identity = useFinanceIdentity();
  return useQuery<FinanceRecordList>({
    queryKey: queryKeys.financeRecords(identity.tenantId, identity.identityKey, companyId, limit),
    queryFn: async () => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const payload = requireRead(
        await coreGet(
          `/v3/finance/records?company_id=${encodeURIComponent(requestedCompanyId)}&limit=${limit}`,
          { throwAuthErrors: true },
        ) as FinanceRecordList | null,
        'Finance flow is unavailable',
      );
      requireScope(payload, requestedCompanyId, tenantId);
      return {
        ...payload,
        records: financeRecordItems(payload, requestedCompanyId, tenantId),
      };
    },
    enabled: Boolean(companyId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeRecords,
    refetchOnWindowFocus: true,
    retry: shouldRetryFinance,
  });
}

export function useFinanceFlow(companyId?: string | null, limit = 25, enabled = true) {
  const identity = useFinanceIdentity();
  return useInfiniteQuery<FinanceRecordList>({
    queryKey: [...queryKeys.financeRecords(identity.tenantId, identity.identityKey, companyId, limit), 'infinite'],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const cursorParam = pageParam ? `&cursor=${encodeURIComponent(String(pageParam))}` : '';
      const payload = requireRead(
        await coreGet(
          `/v3/finance/records?company_id=${encodeURIComponent(requestedCompanyId)}&limit=${limit}${cursorParam}`,
          { throwAuthErrors: true },
        ) as FinanceRecordList | null,
        'Finance flow is unavailable',
      );
      requireScope(payload, requestedCompanyId, tenantId);
      return {
        ...payload,
        records: financeRecordItems(payload, requestedCompanyId, tenantId),
      };
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    enabled: Boolean(companyId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeRecords,
    refetchOnWindowFocus: true,
    retry: shouldRetryFinance,
  });
}

export function useFinanceRecord(
  companyId?: string | null,
  recordId?: string | null,
  enabled = true,
) {
  const identity = useFinanceIdentity();
  return useQuery<FinanceRecord>({
    queryKey: queryKeys.financeRecord(identity.tenantId, identity.identityKey, companyId, recordId),
    queryFn: async () => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const requestedRecordId = requireRead(recordId, 'Finance record is unresolved');
      const record = requireRead(
        await coreGet(
          `/v3/finance/records/${encodeURIComponent(requestedRecordId)}?company_id=${encodeURIComponent(requestedCompanyId)}`,
          { throwAuthErrors: true },
        ) as FinanceRecord | null,
        'Finance record is unavailable',
      );
      return requireScope(record, requestedCompanyId, tenantId);
    },
    enabled: Boolean(companyId && recordId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeRecords,
    retry: shouldRetryFinance,
  });
}

export function useFinanceEvidence(
  companyId?: string | null,
  evidenceId?: string | null,
  enabled = true,
) {
  const identity = useFinanceIdentity();
  return useQuery<FinanceEvidenceDetail>({
    queryKey: queryKeys.financeEvidence(identity.tenantId, identity.identityKey, companyId, evidenceId),
    queryFn: async () => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const requestedEvidenceId = requireRead(evidenceId, 'Finance evidence is unresolved');
      const detail = requireRead(
        await coreGet(
          `/v3/finance/evidence/${encodeURIComponent(requestedEvidenceId)}?company_id=${encodeURIComponent(requestedCompanyId)}`,
          { throwAuthErrors: true },
        ) as FinanceEvidenceDetail | null,
        'Finance evidence is unavailable',
      );
      return requireScope(detail, requestedCompanyId, tenantId);
    },
    enabled: Boolean(companyId && evidenceId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeRecords,
    retry: shouldRetryFinance,
  });
}

function useFinanceWriteInvalidation(companyId?: string | null) {
  const identity = useFinanceIdentity();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.financeRoot(identity.tenantId, identity.identityKey, companyId),
    });
  };

  return { identity, invalidate };
}

export function useCreateFinanceAccount(companyId?: string | null) {
  const { identity, invalidate } = useFinanceWriteInvalidation(companyId);
  return useMutation<FinanceWriteEnvelope<ManualFinanceAccount>, Error, ManualAccountCreateInput>({
    mutationFn: async (input) => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      if (input.company_id !== requestedCompanyId) {
        throw new CoreError('Finance write company mismatch', 403, { code: 'finance_scope_mismatch' });
      }
      const envelope = await corePost('/v3/finance/accounts', input, {
        preserveEnvelope: true,
        throwAuthErrors: true,
      }) as FinanceWriteEnvelope<ManualFinanceAccount> | null;
      return validateWriteEnvelope(envelope, requestedCompanyId, tenantId);
    },
    onSuccess: invalidate,
  });
}

export function useCreateFinanceObservation(companyId?: string | null) {
  const { identity, invalidate } = useFinanceWriteInvalidation(companyId);
  return useMutation<FinanceWriteEnvelope<FinanceObservation>, Error, BalanceObservationCreateInput>({
    mutationFn: async (input) => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      if (input.company_id !== requestedCompanyId) {
        throw new CoreError('Finance write company mismatch', 403, { code: 'finance_scope_mismatch' });
      }
      const envelope = await corePost('/v3/finance/observations', input, {
        preserveEnvelope: true,
        throwAuthErrors: true,
      }) as FinanceWriteEnvelope<FinanceObservation> | null;
      return validateWriteEnvelope(envelope, requestedCompanyId, tenantId);
    },
    onSuccess: invalidate,
  });
}

export function useCreateFinanceRecord(companyId?: string | null) {
  const { identity, invalidate } = useFinanceWriteInvalidation(companyId);
  return useMutation<FinanceWriteEnvelope<FinanceRecord>, Error, FinancialRecordCreateInput>({
    mutationFn: async (input) => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      if (input.company_id !== requestedCompanyId) {
        throw new CoreError('Finance write company mismatch', 403, { code: 'finance_scope_mismatch' });
      }
      const envelope = await corePost('/v3/finance/records', input, {
        preserveEnvelope: true,
        throwAuthErrors: true,
      }) as FinanceWriteEnvelope<FinanceRecord> | null;
      return validateWriteEnvelope(envelope, requestedCompanyId, tenantId);
    },
    onSuccess: invalidate,
  });
}

export function useCorrectFinanceRecord(companyId?: string | null, recordId?: string | null) {
  const { identity, invalidate } = useFinanceWriteInvalidation(companyId);
  return useMutation<FinanceWriteEnvelope<FinanceRecord>, Error, FinancialCorrectionCreateInput>({
    mutationFn: async (input) => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const requestedRecordId = requireRead(recordId, 'Finance record is unresolved');
      if (input.company_id !== requestedCompanyId) {
        throw new CoreError('Finance write company mismatch', 403, { code: 'finance_scope_mismatch' });
      }
      const envelope = await corePost(
        `/v3/finance/records/${encodeURIComponent(requestedRecordId)}/corrections`,
        input,
        { preserveEnvelope: true, throwAuthErrors: true },
      ) as FinanceWriteEnvelope<FinanceRecord> | null;
      return validateWriteEnvelope(envelope, requestedCompanyId, tenantId);
    },
    onSuccess: invalidate,
  });
}
