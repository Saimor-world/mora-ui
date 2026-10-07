'use client';
import { useFinanceState } from '@/lib/queries/useFinanceStateFlow';
import { formatFinanceMoney } from '@/lib/finance/format';
import { contractStateFrom, useFinanceCompanyId, type ContractState } from './contracts';

export type FinanceSignal =
  | { kind: 'value'; label: string; value: string; truth: string; asOf: string | null; warnings: number }
  | { kind: 'state'; state: ContractState };

/** One calm finance line for "Heute" — reads the same /v3/finance/state contract as Finance v2. */
export function useFinanceSignal(): FinanceSignal {
  const { hasSession, companyId } = useFinanceCompanyId();
  const q = useFinanceState(companyId, hasSession);
  const state = contractStateFrom(q, { hasSession, companyId });
  if (state !== 'available' || !q.data) return { kind: 'state', state };
  const primary = q.data.currency_states?.[0];
  const money = primary?.projected_total || primary?.observed_total || null;
  return {
    kind: 'value',
    label: primary?.projected_total ? 'Projizierter Stand' : 'Belegter Stand',
    value: money ? formatFinanceMoney(money) : '—',
    truth: q.data.truth_state,
    asOf: q.data.as_of || null,
    warnings: q.data.warnings?.length || 0,
  };
}
