import { useQuery } from '@tanstack/react-query';
import { coreGet } from '@/lib/api/http';

export interface DailyBriefingMetrics {
    unread_mails?: number | null;
    mails_needing_response?: number | null;
    needs_response?: number | null;
    health_score?: number | null;
    active_incidents?: number | null;
    nightwatch_quiet?: boolean | null;
}

export interface DailyBriefingData {
    date: string;
    text?: string;
    metrics?: DailyBriefingMetrics;
}

/**
 * Builds warm, honest MÔRA briefing sentence dynamically from real numbers.
 * - Never invents numbers: If data is missing, says honestly "Ich komme gerade nicht an deine Daten."
 * - Personal salutation uses first name from session; falls back to "Guten Morgen." if none.
 * - "Brauchen dich" counts emails that need a response.
 * - "Die Nacht war ruhig" only when Nightwatch reports 0 incidents or nightwatch_quiet.
 */
export function buildMoraBriefing(
    data?: DailyBriefingData | null,
    firstName?: string | null
): string {
    if (!data || !data.metrics) {
        return 'Ich komme gerade nicht an deine Daten.';
    }

    const name = firstName?.trim();
    const salutation = name ? `Guten Morgen, ${name}.` : 'Guten Morgen.';
    const parts: string[] = [];

    const unread = typeof data.metrics.unread_mails === 'number' ? data.metrics.unread_mails : null;
    const needYou = typeof data.metrics.mails_needing_response === 'number'
        ? data.metrics.mails_needing_response
        : typeof data.metrics.needs_response === 'number'
        ? data.metrics.needs_response
        : null;

    if (unread !== null && unread > 0) {
        if (needYou !== null && needYou > 0) {
            parts.push(`${unread} ${unread === 1 ? 'Mail wartet' : 'Mails warten'}, ${needYou} ${needYou === 1 ? 'braucht' : 'brauchen'} dich.`);
        } else {
            parts.push(`${unread} ${unread === 1 ? 'Mail wartet' : 'Mails warten'}.`);
        }
    } else if (needYou !== null && needYou > 0) {
        parts.push(`${needYou} ${needYou === 1 ? 'Mail braucht' : 'Mails brauchen'} dich.`);
    }

    if (data.metrics.active_incidents === 0 || data.metrics.nightwatch_quiet === true) {
        parts.push('Die Nacht war ruhig.');
    } else if (typeof data.metrics.active_incidents === 'number' && data.metrics.active_incidents > 0) {
        parts.push(`Nightwatch meldet ${data.metrics.active_incidents} ${data.metrics.active_incidents === 1 ? 'Vorfall' : 'Vorfälle'}.`);
    }

    if (parts.length === 0) {
        if (data.text && !data.text.includes('Normalbetrieb') && !data.text.includes('stabile Situation')) {
            return data.text;
        }
        return `${salutation} Alles ist bereit.`;
    }

    return `${salutation} ${parts.join(' ')}`;
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
                    text: 'Ich komme gerade nicht an deine Daten.',
                    metrics: undefined,
                };
            }
        },
        staleTime: 60 * 1000,
    });
}
