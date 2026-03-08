/**
 * Intel Client - Mora Intelligence Scan API
 * Migrated to v3 in MR21 — uses corePost pattern (no devToken).
 */
import { corePost } from '@/lib/api/coreClient';

export interface IntelScanRequest {
    folder_id: string;
}

export interface IntelScanResponse {
    report_id: string;
    report_node_id: string;
    summary: string;
    stats: {
        nodes_analyzed: number;
        relations_found: number;
        insights_generated: number;
    };
    folder_id: string;
}

/**
 * Trigger Mora Intelligence Scan for a folder
 * POST /v3/intel/scan
 */
export async function triggerMoraScan(folderId: string): Promise<IntelScanResponse> {
    return corePost('/v3/intel/scan', { folder_id: folderId }) as Promise<IntelScanResponse>;
}
