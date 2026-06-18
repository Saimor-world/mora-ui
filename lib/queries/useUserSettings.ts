import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserSettings, patchUserSettings } from '@/lib/api/userSettingsClient';
import { queryKeys } from '@/lib/queries/queryKeys';
import { useSessionStore } from '@/lib/store/sessionStore';

export function useUserSettings(enabled = true) {
    const updateUserSettings = useSessionStore((s) => s.updateUserSettings);

    return useQuery({
        queryKey: queryKeys.userSettings(),
        queryFn: async () => {
            const response = await fetchUserSettings();
            if (response?.settings && typeof response.settings === 'object') {
                updateUserSettings(response.settings as Record<string, unknown>);
            }
            return response;
        },
        enabled,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function usePatchUserSettings() {
    const queryClient = useQueryClient();
    const updateUserSettings = useSessionStore((s) => s.updateUserSettings);

    return useMutation({
        mutationFn: (settings: Record<string, unknown>) => patchUserSettings(settings),
        onSuccess: (response) => {
            if (response?.settings && typeof response.settings === 'object') {
                updateUserSettings(response.settings as Record<string, unknown>);
            }
            queryClient.setQueryData(queryKeys.userSettings(), response);
        },
    });
}
