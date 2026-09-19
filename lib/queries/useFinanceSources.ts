import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coreGet, corePost } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type FinanceSource = {
  id: string;
  label: string;
  mode: 'api' | 'open_banking' | 'ledger' | 'statement_import' | 'manual_evidence';
  owners: Array<'company' | 'personal'>;
  capabilities: string[];
  credential_policy: string;
  canonical: boolean;
};

export type FinanceConnection = {
  id: string;
  company_id?: string | null;
  owner_kind: 'company' | 'personal';
  owner_user_id?: string | null;
  provider: string;
  provider_reference?: string | null;
  label: string;
  status: 'pending' | 'connected' | 'reauth_required' | 'degraded' | 'revoked';
  consent_expires_at?: string | null;
  last_synced_at?: string | null;
  account_count: number;
  last_error_code?: string | null;
};

export type XrplProof = {
  source: 'xrpl';
  network: 'mainnet';
  address: string;
  ledger_index: number;
  balance_drops: string;
  balance_xrp: string;
  owner_count: number;
  trust_lines: Array<{ currency: string; issuer: string; balance: string; limit: string }>;
  observed_at: string;
  signing_available: false;
  proof_hash: string;
};

function currentIdentity() {
  const state = useSessionStore.getState();
  const user = state.user;
  return {
    tenantId: user?.tenant_id ?? null,
    identityKey: user ? `${user.id}:${user.role}:g${state.sessionGeneration}` : `anonymous:g${state.sessionGeneration}`,
  };
}

export function useFinanceSources(ownerKind: 'company' | 'personal' = 'company') {
  const user = useSessionStore((state) => state.user);
  const generation = useSessionStore((state) => state.sessionGeneration);
  const identityKey = user ? `${user.id}:${user.role}:g${generation}` : `anonymous:g${generation}`;
  return useQuery<{ owner_kind: string; sources: FinanceSource[]; connection_truth: 'capability_only' }>({
    queryKey: queryKeys.financeSources(user?.tenant_id, identityKey, ownerKind),
    queryFn: () => coreGet(`/v3/finance/sources?owner_kind=${ownerKind}`, { throwAuthErrors: true }),
    enabled: Boolean(user?.tenant_id),
    staleTime: STALE_TIMES.financeSources,
  });
}

export function useFinanceConnections(ownerKind: 'company' | 'personal', companyId?: string | null) {
  const user = useSessionStore((state) => state.user);
  const generation = useSessionStore((state) => state.sessionGeneration);
  const identityKey = user ? `${user.id}:${user.role}:g${generation}` : `anonymous:g${generation}`;
  const params = ownerKind === 'company'
    ? `owner_kind=company&company_id=${encodeURIComponent(companyId || '')}`
    : 'owner_kind=personal';
  return useQuery<{ connections: FinanceConnection[]; connection_truth: 'persisted_only' }>({
    queryKey: queryKeys.financeConnections(user?.tenant_id, identityKey, ownerKind, companyId),
    queryFn: () => coreGet(`/v3/finance/connections?${params}`, { throwAuthErrors: true }),
    enabled: Boolean(user?.tenant_id && (ownerKind === 'personal' || companyId)),
    staleTime: STALE_TIMES.financeConnections,
    refetchOnWindowFocus: true,
  });
}

export function useObserveXrpl() {
  return useMutation<XrplProof, Error, string>({
    mutationFn: (address) => coreGet(
      `/v3/finance/sources/xrpl/observe?address=${encodeURIComponent(address)}`,
      { throwAuthErrors: true },
    ),
  });
}

export function useConnectCompanyXrpl(companyId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { address: string; label?: string | null }>({
    mutationFn: async ({ address, label }) => {
      if (!companyId) throw new Error('Company scope fehlt.');
      return corePost(
        '/v3/finance/connections/xrpl',
        {
          address,
          owner_kind: 'company',
          company_id: companyId,
          label: label || null,
          ownership_attested: true,
        },
        { throwAuthErrors: true, preserveEnvelope: true },
      );
    },
    onSuccess: async () => {
      const current = currentIdentity();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.financeConnections(current.tenantId, current.identityKey, 'company', companyId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.financeState(current.tenantId, current.identityKey, companyId) }),
      ]);
    },
  });
}
