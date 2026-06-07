import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import type { ContextualPanel } from './panelTypes';

/**
 * Maps a NightwatchIncidentItem from CORE into a strict, evidence-bound ContextualPanel payload.
 * 
 * Target-Logic:
 * - Active open incidents map to 'verified' state.
 * - Resolved, dismissed, or closed incidents map to 'placeholder' so they aren't prominently rendered.
 * - Confirms core truth without inventing narrative details.
 */
export function mapIncidentToPanel(incident: NightwatchIncidentItem): ContextualPanel<NightwatchIncidentItem> {
    const statusLower = (incident.status || 'open').toLowerCase();
    const isClosed = ['resolved', 'dismissed', 'closed'].includes(statusLower);

    return {
        id: `panel-incident-${incident.id}`,
        type: 'incident_status',
        state: isClosed ? 'placeholder' : 'verified',
        source: 'nightwatch',
        source_type: 'incident',
        timestamp: incident.detected_at || incident.updated_at,
        confidence: incident.severity === 'critical' ? 'verified' : 'warning',
        reason: `CORE verified active incident node ${incident.id} on host ${incident.host || 'unknown'}`,
        role_scope: ['owner', 'admin'],
        payload: incident,
        evidence: [
            {
                source: 'nightwatch',
                source_type: 'incident_node',
                timestamp: incident.detected_at || incident.updated_at,
                status: incident.status || 'open',
                reason: `Incident detected on host ${incident.host || 'unknown'} with severity ${incident.severity || 'info'}`,
            }
        ]
    };
}
