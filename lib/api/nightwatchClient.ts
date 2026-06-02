import { coreGet } from './http';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

/**
 * Read open Nightwatch incidents for the current tenant (read-only).
 * Returns [] when unavailable — Home must degrade to an empty Lagebild, not crash.
 */
export async function fetchNightwatchIncidents(): Promise<NightwatchIncidentItem[]> {
    const data = await coreGet('/v3/nightwatch/incidents', { isOptional: true });
    return Array.isArray(data) ? (data as NightwatchIncidentItem[]) : [];
}
