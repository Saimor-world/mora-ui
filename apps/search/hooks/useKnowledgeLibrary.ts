'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTree } from '@/lib/queries/useTree';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSessionStore } from '@/lib/store/sessionStore';
import { isAdmin } from '@/lib/auth/roles';
import { fetchUserMemberships } from '@/lib/api/adminClient';
import { knowledgeLibrary } from '@/lib/knowledge/library';

export function useKnowledgeLibrary(companyId: string | null, enabled = true) {
  const scope = enabled ? companyId : null;
  const user = useSessionStore(state => state.user);
  const generation = useSessionStore(state => state.sessionGeneration);
  const tree = useTree(scope), departments = useDepartments(scope);
  const admin = isAdmin(user?.role);
  const membership = useQuery({
    queryKey: ['knowledge-memberships', generation, user?.id, scope], queryFn: fetchUserMemberships,
    enabled: Boolean(scope && user && !admin), staleTime: 60_000, retry: false,
  });
  const loading = tree.isPending || departments.isPending || (!admin && membership.isPending);
  const unavailable = tree.isError || departments.isError || (!admin && (membership.isError || !membership.data));
  const allowedDepartmentIds = useMemo(() => {
    if (!scope || !user || unavailable || loading) return new Set<string>();
    const memberIds = new Set((membership.data?.department_memberships ?? []).map(item => item.department_id));
    return new Set((departments.data ?? []).filter(item => admin || item.visibility === 'public' || memberIds.has(item.id)).map(item => item.id));
  }, [scope, user, unavailable, loading, membership.data, departments.data, admin]);
  const entries = useMemo(() => scope && !unavailable && !loading && user ? knowledgeLibrary(tree.data ?? [], scope, allowedDepartmentIds) : [], [scope, unavailable, loading, user, tree.data, allowedDepartmentIds]);
  const reload = () => { void tree.refetch(); void departments.refetch(); if (!admin) void membership.refetch(); };
  return { entries, loading, unavailable, reload, allowedDepartmentIds };
}
