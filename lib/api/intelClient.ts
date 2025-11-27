/**
 * Intel Client - MÔRA Intelligence Scan API
 * Sprint Tag 3-5: Trigger Intel-Report generation
 */

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
 * Trigger MÔRA Intelligence Scan for a folder
 * Creates an intel_report node with Mindloop synthesis data
 */
export async function triggerMoraScan(folderId: string): Promise<IntelScanResponse> {
    const coreUrl = process.env.NEXT_PUBLIC_SAIMOR_CORE_URL || 'http://localhost:8081';
    const token = process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT;

    const response = await fetch(`${coreUrl}/v1/intel/scan`, {
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
