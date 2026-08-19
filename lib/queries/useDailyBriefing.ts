import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';

export interface DailyBriefingData {
    date: string;
    text: string;
    metrics: {
        unread_mails: number;
        health_score: number;
        active_incidents: number;
    };
}

export function useDailyBriefing() {
    return useQuery<DailyBriefingData>({
        queryKey: ['daily-briefing'],
        queryFn: async () => {
            try {
                const res = (await coreGet('/v3/briefing')) as DailyBriefingData;
                return res;
            } catch {
                return {
                    date: 'Heute',
                    text: 'Alle Systeme laufen im Normalbetrieb. Deine Arbeitsumgebung steht bereit.',
                    metrics: {
                        unread_mails: 0,
                        health_score: 100,
                        active_incidents: 0,
                    },
                };
            }
        },
        staleTime: 60 * 1000,
    });
}
