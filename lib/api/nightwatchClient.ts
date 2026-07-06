import { coreGet, corePost } from './http';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

/**
 * Read open Nightwatch incidents for the current tenant.
 * Returns [] when unavailable — Home must degrade to an empty Lagebild, not crash.
 */
export async function fetchNightwatchIncidents(): Promise<NightwatchIncidentItem[]> {
    const data = await coreGet('/v3/nightwatch/incidents', { isOptional: true });
    return Array.isArray(data) ? (data as NightwatchIncidentItem[]) : [];
}

/**
 * Read ALL Nightwatch incidents (including resolved) for history and sparklines.
 * Returns [] when unavailable.
 */
export async function fetchAllNightwatchIncidents(): Promise<NightwatchIncidentItem[]> {
    const data = await coreGet('/v3/nightwatch/incidents?include_resolved=true', { isOptional: true });
    return Array.isArray(data) ? (data as NightwatchIncidentItem[]) : [];
}

export interface NightwatchMonitorItem {
    id: string;
    name?: string;
    host?: string;
    target_type?: string;
    /** CORE metadata.status — ok | down | degraded | running | … */
    status?: string;
}

/** Read Nightwatch monitors for the current tenant. [] when unavailable. */
export async function fetchNightwatchMonitors(): Promise<NightwatchMonitorItem[]> {
    const data = await coreGet('/v3/nightwatch/monitors', { isOptional: true });
    return Array.isArray(data) ? (data as NightwatchMonitorItem[]) : [];
}

export type NightwatchIncidentAction = 'ack' | 'resolve' | 'reopen';

export async function updateNightwatchIncident(
    incidentId: string,
    action: NightwatchIncidentAction,
    note?: string,
): Promise<{ incident_id: string; action_id: string; status: string; acked: boolean } | null> {
    const data = await corePost(`/v3/nightwatch/incidents/${encodeURIComponent(incidentId)}/actions`, { action, note }, { isOptional: true });
    return data && typeof data === 'object'
        ? data as { incident_id: string; action_id: string; status: string; acked: boolean }
        : null;
}
