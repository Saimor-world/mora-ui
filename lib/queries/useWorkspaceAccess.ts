import { useQuery } from '@tanstack/react-query';
import { fetchWorkspaceAccess, fetchWorkspaceCatalog } from '@/lib/api/workspaceClient';
import { queryKeys, STALE_TIMES } from './queryKeys';
export function useWorkspaceAccess(enabled = true) {
  return useQuery({ queryKey: queryKeys.workspaceAccess(), queryFn: fetchWorkspaceAccess, enabled, staleTime: STALE_TIMES.workspaceAccess, refetchOnWindowFocus: true });
}
export function useWorkspaceCatalog() {
  return useQuery({ queryKey: queryKeys.workspaceCatalog(), queryFn: fetchWorkspaceCatalog, staleTime: STALE_TIMES.workspaceCatalog, refetchOnWindowFocus: false });
}
