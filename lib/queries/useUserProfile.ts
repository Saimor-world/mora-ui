import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '@/lib/api/coreClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: fetchUserProfile,
    staleTime: STALE_TIMES.userProfile, // Infinity
    refetchOnWindowFocus: false,
  });
}
