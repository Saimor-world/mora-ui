import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/contentClient';
import { queryKeys } from '@/lib/queries/queryKeys';

export function usePersonalHomeNote(enabled = true) {
    return useQuery({
        queryKey: queryKeys.personalHomeNote(),
        queryFn: () => fetchPersonalHomeNote(),
        enabled,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function useSavePersonalHomeNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (content: string) => savePersonalHomeNote(content),
        onSuccess: (note) => {
            if (note) {
                queryClient.setQueryData(queryKeys.personalHomeNote(), note);
            }
        },
    });
}
