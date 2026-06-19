import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import type { NightwatchMonitorItem } from '@/lib/api/nightwatchClient';

export type NightwatchSuggestionTone = 'alert' | 'warn' | 'ok' | 'info';

export interface NightwatchSuggestion {
    id: string;
    label: string;
    tone: NightwatchSuggestionTone;
}

const RESOLVED = new Set(['resolved', 'dismissed', 'closed']);

function isOpen(incident: NightwatchIncidentItem): boolean {
    return !RESOLVED.has((incident.status || 'open').toLowerCase());
}

function monitorLabel(m: NightwatchMonitorItem): string {
    return m.name || m.host || 'Monitor';
}

function isMonitorDown(m: NightwatchMonitorItem, downHosts: Set<string>): boolean {
    if (m.status) {
        const s = m.status.toLowerCase();
        if (s === 'down' || s === 'critical' || s === 'degraded' || s === 'warn') return true;
        if (s === 'ok' || s === 'up' || s === 'online' || s === 'running') return false;
    }
    return !!m.host && downHosts.has(m.host);
}

/** Derive glance recommendations from real Nightwatch API data — no synthetic tips. */
export function buildNightwatchGlanceSuggestions(
    incidents: NightwatchIncidentItem[],
    monitors: NightwatchMonitorItem[],
    max = 3,
): NightwatchSuggestion[] {
    const open = incidents.filter(isOpen);
    const downHosts = new Set(open.map((i) => i.host).filter(Boolean) as string[]);
    const out: NightwatchSuggestion[] = [];

    const critical = open.find((i) => i.severity === 'critical');
    if (critical) {
        out.push({
            id: `crit-${critical.id}`,
            label: critical.title || critical.host || 'Kritischer Vorfall — prüfen',
            tone: 'alert',
        });
    }

    const downMonitor = monitors.find((m) => isMonitorDown(m, downHosts));
    if (downMonitor && out.length < max) {
        out.push({
            id: `down-${downMonitor.id}`,
            label: `${monitorLabel(downMonitor)} antwortet nicht`,
            tone: 'warn',
        });
    }

    const warning = open.find((i) => i.severity === 'warning' && i.id !== critical?.id);
    if (warning && out.length < max) {
        out.push({
            id: `warn-${warning.id}`,
            label: warning.title || warning.host || 'Warnung prüfen',
            tone: 'warn',
        });
    }

    const weekAgo = Date.now() - 7 * 864e5;
    const hostCounts = new Map<string, number>();
    for (const inc of incidents) {
        if (!inc.host) continue;
        const ts = inc.detected_at ? new Date(inc.detected_at).getTime() : 0;
        if (ts >= weekAgo) hostCounts.set(inc.host, (hostCounts.get(inc.host) ?? 0) + 1);
    }
    const recurring = [...hostCounts.entries()].find(([, n]) => n >= 2);
    if (recurring && out.length < max) {
        out.push({
            id: `recur-${recurring[0]}`,
            label: `Wiederkehrend: ${recurring[0]} (${recurring[1]}× in 7 T.)`,
            tone: 'info',
        });
    }

    if (out.length === 0 && monitors.length > 0) {
        const online = monitors.filter((m) => !isMonitorDown(m, downHosts)).length;
        out.push({
            id: 'all-online',
            label: online === monitors.length
                ? `Alle ${monitors.length} Monitore online`
                : `${online}/${monitors.length} Monitore online`,
            tone: online === monitors.length ? 'ok' : 'warn',
        });
    }

    if (out.length === 0 && open.length === 0) {
        out.push({
            id: 'calm',
            label: 'Keine Vorfälle — Überwachung aktiv',
            tone: 'ok',
        });
    }

    return out.slice(0, max);
}
