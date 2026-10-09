'use client';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useFinanceState } from '@/lib/queries/useFinanceStateFlow';
import { useFinanceCapitalPolicy, useFinanceProfitCenter } from '@/lib/queries/useFinanceProfitCenter';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';

/**
 * Finance ↔ CORE contract adapter.
 *
 * Each CORE contract the Finance v2 surface depends on is probed with the
 * existing React Query hooks (no new fetch code). The resulting state is what
 * the UI may claim — it never says "verbunden" on its own; "verfügbar" means
 * CORE answered this exact endpoint for this company with a scoped payload.
 */
export type ContractState =
  | 'available' | 'contract_missing' | 'offline' | 'unauthenticated' | 'denied' | 'backend_error'
  | 'checking' | 'no_session' | 'no_company';

export interface FinanceContract {
  id: 'state' | 'profit-center' | 'capital-policy';
  path: string;
  label: string;
  state: ContractState;
}

interface QueryLike { isSuccess: boolean; isError: boolean; error: unknown; isFetching: boolean }

export function contractStateFrom(q: QueryLike, opts: { hasSession: boolean; companyId: string | null }): ContractState {
  if (!opts.hasSession) return 'no_session';
  if (!opts.companyId) return 'no_company';
  if (q.isSuccess) return 'available';
  if (q.isError) {
    const kind = classifyCoreFailure(q.error);
    return kind;
  }
  return 'checking';
}

export const CONTRACT_LABEL: Record<ContractState, string> = {
  available: 'verfügbar',
  contract_missing: 'fehlt im laufenden CORE (404)',
  offline: 'CORE nicht erreichbar',
  unauthenticated: 'keine bestätigte Sitzung',
  denied: 'kein Zugriff',
  backend_error: 'CORE-Fehler',
  checking: 'wird geprüft',
  no_session: 'nicht geprüft – keine Sitzung',
  no_company: 'nicht geprüft – kein Unternehmen gewählt',
};

export function useFinanceCompanyId(): { hasSession: boolean; companyId: string | null; companyName: string | null } {
  const user = useSessionStore((s) => s.user);
  return { hasSession: Boolean(user?.tenant_id), companyId: user?.active_company_id || null, companyName: user?.active_company_name || null };
}

export function useFinanceContracts(): { contracts: FinanceContract[]; companyId: string | null; hasSession: boolean } {
  const { hasSession, companyId } = useFinanceCompanyId();
  const state = useFinanceState(companyId, hasSession);
  const profit = useFinanceProfitCenter(companyId, hasSession);
  const policy = useFinanceCapitalPolicy(companyId, hasSession);
  const opts = { hasSession, companyId };
  return {
    companyId,
    hasSession,
    contracts: [
      { id: 'state', path: '/v3/finance/state', label: 'Finanzstatus & Cashflow', state: contractStateFrom(state, opts) },
      { id: 'profit-center', path: '/v3/finance/profit-center', label: 'Profit Center', state: contractStateFrom(profit, opts) },
      { id: 'capital-policy', path: '/v3/finance/capital-policy', label: 'Capital Policy', state: contractStateFrom(policy, opts) },
    ],
  };
}
