import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/coreClient';
import { realtime } from '@/lib/api/realtimeClient';
import { queryKeys, STALE_TIMES } from './queryKeys';

export type TeamMemberPresence = {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'online' | 'offline';
};

function mapTeamMembers(raw: unknown): TeamMemberPresence[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((u: any) => {
        const email = String(u.email || '');
        const name = String(u.name || u.full_name || (email ? email.split('@')[0] : 'Mitglied'));
        return {
            id: String(u.id || email || name),
            name,
            email,
            role: String(u.role || 'member'),
            status: u.status === 'online' ? 'online' : 'offline',
        };
    });
}

/**
 * Canonical team presence — one row per user from /v3/team/members.
 * Realtime presence events invalidate the cache for live updates.
 */
export function useTeamMembers(enabled = true) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled) return;

        realtime.connect();

        const invalidate = () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.teamMembers() });
        };

        realtime.on('presence.snapshot', invalidate);
        realtime.on('presence.update', invalidate);
        realtime.on('presence.remove', invalidate);

        return () => {
            realtime.off('presence.snapshot', invalidate);
            realtime.off('presence.update', invalidate);
            realtime.off('presence.remove', invalidate);
        };
    }, [enabled, queryClient]);

    return useQuery({
        queryKey: queryKeys.teamMembers(),
        queryFn: async () => {
            const res = await coreGet('/v3/team/members?include_inactive=false', { isOptional: true });
            return mapTeamMembers(res);
        },
        enabled,
        staleTime: STALE_TIMES.teamMembers,
        refetchOnWindowFocus: true,
        placeholderData: (previous) => previous,
    });
}
