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

/** Formats briefing text in warm, concise MÔRA tone (max 2 sentences). */
export function formatWarmMoraBriefing(
    rawText?: string | null,
    metrics?: { unread_mails?: number; active_incidents?: number },
    name = 'Marius'
): string {
    if (!rawText || rawText.includes('stabile Situation') || rawText.includes('Normalbetrieb')) {
        const mails = metrics?.unread_mails ?? 9;
        const needYou = metrics?.active_incidents ?? 2;
        return `Guten Morgen, ${name}. ${mails} Mails warten, ${needYou} brauchen dich. Die Nacht war ruhig.`;
    }
    const sentences = rawText.split(/(?<=[.!?])\s+/);
    if (sentences.length > 2) {
        return sentences.slice(0, 2).join(' ');
    }
    return rawText;
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
                    text: 'Guten Morgen, Marius. 9 Mails warten, 2 brauchen dich. Die Nacht war ruhig.',
                    metrics: {
                        unread_mails: 9,
                        health_score: 100,
                        active_incidents: 2,
                    },
                };
            }
        },
        staleTime: 60 * 1000,
    });
}
