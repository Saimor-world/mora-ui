/**
 * Intel Client - Mora Intelligence Scan API
 * Sprint Tag 3-5: Trigger Intel-Report generation
 */
import { getCoreBaseUrl } from '@/lib/api/coreClient';

export interface IntelScanRequest {
    folder_id: string;
}

export interface IntelScanResponse {
    node_id: string;
    title: string;
    type: string;
    content: string;
    folder_id: string;
}

/**
 * Trigger Mora Intelligence Scan for a folder
 * Creates an intel_report node with Mindloop synthesis data
 */
export async function triggerMoraScan(folderId: string): Promise<IntelScanResponse> {
    const CORE_API_URL = getCoreBaseUrl();

    // Use devToken for authentication
    const { getDevToken } = await import('@/lib/api/devToken');
    const token = await getDevToken();

    const response = await fetch(`${CORE_API_URL}/v1/intel/scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ folder_id: folderId })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(`Intel scan failed: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    return response.json();
}
