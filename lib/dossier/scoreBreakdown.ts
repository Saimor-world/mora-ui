import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

export interface ScoreDimension {
    id: 'ssl' | 'headers' | 'performance' | 'availability';
    label: string;
    value: string;
    status: 'critical' | 'warn' | 'ok';
    barPercent: number;
}

const SSL_KEYWORDS    = ['ssl', 'zertifikat', 'certificate', 'tls', 'https'];
const HEADER_KEYWORDS = ['header', 'csp', 'hsts', 'content-security', 'x-frame', 'xss'];
const PERF_KEYWORDS   = ['ladezeit', 'performance', 'lcp', 'fcp', 'geschwindigkeit', 'speed', 'load'];

function matchesAny(title: string, keywords: string[]): boolean {
    const low = title.toLowerCase();
    return keywords.some(k => low.includes(k));
}

type TaskStatus = 'critical' | 'warn' | 'ok';

function toStatus(ts: WebsiteEntryContext['tasks']): TaskStatus {
    if (ts.length === 0) return 'ok';
    if (ts.some(t => t.priority === 'hoch')) return 'critical';
    return 'warn';
}

function toBar(status: TaskStatus): number {
    if (status === 'critical') return 20;
    if (status === 'warn')     return 50;
    return 100;
}

export function scoreBreakdown(ctx: WebsiteEntryContext): ScoreDimension[] {
    const tasks = ctx.tasks ?? [];

    const sslTasks  = tasks.filter(t => matchesAny(t.title, SSL_KEYWORDS));
    const hdTasks   = tasks.filter(t => matchesAny(t.title, HEADER_KEYWORDS));
    const perfTasks = tasks.filter(t => matchesAny(t.title, PERF_KEYWORDS));

    const sslStatus  = toStatus(sslTasks);
    const hdStatus   = toStatus(hdTasks);
    const perfStatus = toStatus(perfTasks);

    return [
        {
            id: 'ssl',
            label: 'SSL / Zertifikat',
            value: sslStatus === 'critical' ? 'Kritisch — Erneuerung nötig'
                 : sslStatus === 'warn'     ? 'Prüfung empfohlen'
                 :                            'Gültig',
            status: sslStatus,
            barPercent: toBar(sslStatus),
        },
        {
            id: 'headers',
            label: 'Security Headers',
            value: hdStatus === 'critical' ? 'Fehlen komplett'
                 : hdStatus === 'warn'     ? 'Teilweise vorhanden'
                 :                           'Vollständig',
            status: hdStatus,
            barPercent: toBar(hdStatus),
        },
        {
            id: 'performance',
            label: 'Performance',
            value: perfStatus === 'critical' ? 'Kritisch langsam'
                 : perfStatus === 'warn'     ? 'Optimierung nötig'
                 :                             'Im Zielbereich',
            status: perfStatus,
            barPercent: toBar(perfStatus),
        },
        {
            id: 'availability',
            label: 'Erreichbarkeit',
            value: 'Alles online',
            status: 'ok',
            barPercent: 100,
        },
    ];
}

export function buildScoreNarrative(ctx: WebsiteEntryContext): string {
    const domain     = ctx.domain ?? ctx.companyName;
    const hochCount  = (ctx.tasks ?? []).filter(t => t.priority === 'hoch').length;
    const totalCount = (ctx.tasks ?? []).length;
    const score      = ctx.score ?? 0;

    if (score >= 80) {
        return `${domain} hat eine solide Basis — kleinere Verbesserungen sind möglich.`;
    }
    if (hochCount > 0) {
        return `${domain} ist online — hat aber ${hochCount} kritische Lücke${hochCount > 1 ? 'n' : ''}, die heute schließbar ist${hochCount > 1 ? '' : ''}.`;
    }
    if (totalCount > 0) {
        return `${domain} ist online — hat aber ${totalCount} Verbesserung${totalCount > 1 ? 'en' : ''}, die heute umsetzbar ist${totalCount > 1 ? '' : ''}.`;
    }
    return `${domain} wurde analysiert. Der Score zeigt Optimierungspotenzial.`;
}
