import type { OpenFlowSignal } from '@/lib/openflow/types';
import { priorityFromSeverityLabel } from '@/lib/ui/status';

/** Shape returned by CORE GET /v3/nightwatch/incidents. */
export interface NightwatchIncidentItem {
    id: string;
    title?: string;
    summary?: string;
    severity?: string;  // 'info' | 'warning' | 'critical'
    status?: string;    // 'open' | 'healing' | 'escalated' | 'resolved' | ...
    host?: string;
    detected_at?: string;
    updated_at?: string;
}

const RESOLVED = new Set(['resolved', 'dismissed', 'closed']);

/**
 * Maps real Nightwatch incident nodes into OpenFlow signals for the Home Lagebild.
 * Pure. Severity → priority comes from the central status logic. Resolved incidents
 * are dropped. We never synthesize a repair action — only an "open incident" link.
 */
export function nightwatchIncidentsToSignals(incidents: NightwatchIncidentItem[] | null | undefined): OpenFlowSignal[] {
    if (!Array.isArray(incidents)) return [];
    return incidents
        .filter((i) => !RESOLVED.has((i.status || 'open').toLowerCase()))
        .map((i) => ({
            id: `nightwatch-${i.id}`,
            source: 'server',
            title: i.title || `Vorfall: ${i.host || 'Infrastruktur'}`,
            summary: i.summary || i.host || 'Infrastruktur-Vorfall erkannt.',
            priority: priorityFromSeverityLabel(i.severity),
            status: 'new',
            trustScope: 'organization',
            occurredAt: i.detected_at || i.updated_at,
            relatedNodeIds: [i.id],
            relatedRelationIds: [],
            suggestedActions: [
                {
                    id: `${i.id}-open`,
                    label: 'Vorfall öffnen',
                    kind: 'open_pane',
                    paneType: 'document',
                    paneData: { nodeId: i.id },
                },
            ],
        }));
}
