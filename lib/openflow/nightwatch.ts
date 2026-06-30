import type { OpenFlowSignal } from '@/lib/openflow/types';
import type { IncidentStatusPanel } from '@/lib/panel/types';
import { priorityFromSeverityLabel } from '@/lib/ui/status';

/** Shape returned by CORE GET /v3/nightwatch/incidents. */
export interface NightwatchIncidentItem {
    id: string;
    title?: string;
    summary?: string;
    severity?: string;  // 'info' | 'warning' | 'critical'
    status?: string;    // 'open' | 'healing' | 'escalated' | 'resolved' | ...
    acked?: boolean;
    host?: string;
    detected_at?: string;
    updated_at?: string;
    department_id?: string;
    affected_department_id?: string;
    node_id?: string;
    relatedNodeIds?: string[];
}

const RESOLVED = new Set(['resolved', 'dismissed', 'closed']);

function isOpenIncident(incident: NightwatchIncidentItem): boolean {
    return !RESOLVED.has((incident.status || 'open').toLowerCase());
}

/**
 * Maps real Nightwatch incident nodes into OpenFlow signals for the Home Lagebild.
 * Pure. Severity → priority comes from the central status logic. Resolved incidents
 * are dropped. We never synthesize a repair action — only an "open incident" link.
 */
export function nightwatchIncidentsToSignals(incidents: NightwatchIncidentItem[] | null | undefined): OpenFlowSignal[] {
    if (!Array.isArray(incidents)) return [];
    return incidents
        .filter(isOpenIncident)
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

export function nightwatchIncidentsToIncidentStatusPanels(
    incidents: NightwatchIncidentItem[] | null | undefined,
): IncidentStatusPanel[] {
    if (!Array.isArray(incidents)) return [];
    return incidents
        .filter(isOpenIncident)
        .map((incident) => {
            const timestamp = incident.detected_at || incident.updated_at;
            const title = incident.title || `Infrastrukturhinweis: ${incident.host || 'Service'}`;
            const summary = incident.summary || incident.host || 'Ein belegter Infrastrukturzustand braucht Aufmerksamkeit.';
            const severity = incident.severity || 'info';
            const status = incident.status || 'open';

            return {
                id: `incident-status-${incident.id}`,
                type: 'incident_status',
                state: 'verified',
                source: 'nightwatch',
                source_type: 'nightwatch.incident',
                timestamp,
                confidence: 'verified',
                reason: 'Open tenant-scoped Nightwatch incident node exists in CORE.',
                evidence: [
                    {
                        source: 'nightwatch',
                        source_type: 'nightwatch.incident',
                        status: 'verified',
                        confidence: 'verified',
                        reason: 'CORE returned this incident through the tenant-scoped Nightwatch incidents endpoint.',
                        timestamp,
                    },
                ],
                payload: {
                    incident_id: incident.id,
                    title,
                    summary,
                    severity,
                    status,
                    host: incident.host,
                },
            };
        });
}
