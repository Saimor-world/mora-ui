import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CoreError, coreGet, corePost } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import type {
  FinanceMoney,
  FinanceScope,
  FinanceWriteEnvelope,
} from './useFinanceStateFlow';
import {
  financeReadErrorKind,
  isCompanyFinanceScope,
} from './useFinanceStateFlow';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type FinanceCapitalPolicy = {
  company_id: string;
  enabled: boolean;
  currency: 'EUR';
  reporting_timezone: string;
  trading_budget_share_bps: number;
  monthly_loss_stop_bps: number;
  per_trade_risk_bps: number;
  max_monthly_trading_budget: FinanceMoney | null;
  execution_mode: 'manual_approval';
  leverage_allowed: false;
};

export type FinanceCapitalPolicyState = {
  id: string;
  scope: FinanceScope;
  status: 'not_configured' | 'configured' | string;
  policy: FinanceCapitalPolicy | null;
  updated_at?: string | null;
  updated_by?: string | null;
  storage: 'company_settings' | string;
};

export type FinanceProfitCenterSnapshot = {
  scope: FinanceScope;
  period: string;
  reporting_timezone: string;
  currency: 'EUR' | string;
  truth_state: 'complete' | 'partial' | string;
  coverage: {
    basis: string;
    provider_accounts_requiring_reconciliation: number;
    record_count: number;
    internal_transfers_excluded: number;
    unresolved_corrections: number;
    ambiguous_records: number;
    foreign_currency_records_excluded: number;
    warnings: string[];
  };
  operating_cash: {
    customer_receipts: FinanceMoney;
    operating_expenses: FinanceMoney;
    refunds: FinanceMoney;
    result: FinanceMoney;
    founder_funding: FinanceMoney;
    excluded_adjustments: FinanceMoney;
    accounting_profit: FinanceMoney | null;
    accounting_profit_note: string;
  };
  finance_generated_profit: {
    value: FinanceMoney | null;
    status: string;
    reason: string;
  };
  capital_policy: FinanceCapitalPolicyState;
  trading_budget: {
    state: string;
    amount: FinanceMoney | null;
    monthly_loss_stop: FinanceMoney | null;
    per_trade_risk: FinanceMoney | null;
    execution_mode: 'manual_approval' | string;
    leverage_allowed: boolean;
    financial_action_executed: false;
  };
};

function useFinanceIdentity() {
  const user = useSessionStore((state) => state.user);
  const sessionGeneration = useSessionStore((state) => state.sessionGeneration);
  return {
    tenantId: user?.tenant_id ?? null,
    identityKey: user
      ? `${user.id}:${user.role}:g${sessionGeneration}`
      : `anonymous:g${sessionGeneration}`,
  };
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

function shouldRetryFinance(failureCount: number, error: unknown) {
  const kind = financeReadErrorKind(error);
  if (kind === 'unauthenticated' || kind === 'denied' || kind === 'scope_mismatch') return false;
  return failureCount < 1;
}

export function useFinanceProfitCenter(companyId?: string | null, enabled = true) {
  const identity = useFinanceIdentity();

  return useQuery<FinanceProfitCenterSnapshot>({
    queryKey: queryKeys.financeProfitCenter(
      identity.tenantId,
      identity.identityKey,
      companyId,
    ),
    queryFn: async () => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const snapshot = requireRead(
        await coreGet(
          `/v3/finance/profit-center?company_id=${encodeURIComponent(requestedCompanyId)}`,
          { throwAuthErrors: true },
        ) as FinanceProfitCenterSnapshot | null,
        'Finance Profit Center is unavailable',
      );
      return requireScope(snapshot, requestedCompanyId, tenantId);
    },
    enabled: Boolean(companyId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeState,
    refetchOnWindowFocus: true,
    retry: shouldRetryFinance,
  });
}

export function useFinanceCapitalPolicy(companyId?: string | null, enabled = true) {
  const identity = useFinanceIdentity();

  return useQuery<FinanceCapitalPolicyState>({
    queryKey: queryKeys.financeCapitalPolicy(
      identity.tenantId,
      identity.identityKey,
      companyId,
    ),
    queryFn: async () => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      const policy = requireRead(
        await coreGet(
          `/v3/finance/capital-policy?company_id=${encodeURIComponent(requestedCompanyId)}`,
          { throwAuthErrors: true },
        ) as FinanceCapitalPolicyState | null,
        'Finance capital policy is unavailable',
      );
      return requireScope(policy, requestedCompanyId, tenantId);
    },
    enabled: Boolean(companyId && identity.tenantId && enabled),
    staleTime: STALE_TIMES.financeState,
    refetchOnWindowFocus: true,
    retry: shouldRetryFinance,
  });
}

export function useSetFinanceCapitalPolicy(companyId?: string | null) {
  const identity = useFinanceIdentity();
  const queryClient = useQueryClient();

  return useMutation<
    FinanceWriteEnvelope<FinanceCapitalPolicyState>,
    Error,
    FinanceCapitalPolicy
  >({
    mutationFn: async (input) => {
      const tenantId = requireRead(identity.tenantId, 'Finance identity is unresolved');
      const requestedCompanyId = requireRead(companyId, 'Finance company is unresolved');
      if (input.company_id !== requestedCompanyId) {
        throw new CoreError('Finance write company mismatch', 403, {
          code: 'finance_scope_mismatch',
        });
      }

      const envelope = requireRead(
        await corePost('/v3/finance/capital-policy', input, {
          preserveEnvelope: true,
          throwAuthErrors: true,
        }) as FinanceWriteEnvelope<FinanceCapitalPolicyState> | null,
        'Finance capital policy write returned no receipt',
      );

      requireScope(envelope.data, requestedCompanyId, tenantId);
      if (
        !envelope.receipt?.persisted
        || envelope.receipt.company_id !== requestedCompanyId
        || envelope.receipt.financial_action_executed !== false
      ) {
        throw new CoreError(
          'Finance capital policy receipt did not prove a safe persistence-only action',
          502,
        );
      }

      return envelope;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.financeRoot(
          identity.tenantId,
          identity.identityKey,
          companyId,
        ),
      });
    },
  });
}
