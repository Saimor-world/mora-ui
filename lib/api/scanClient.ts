import { corePost } from './coreClient';

export interface ScanResult {
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

export const triggerFolderScan = async (folderId: string): Promise<ScanResult> => {
    return corePost(`/v3/scan/analyze/${folderId}`, {}) as Promise<ScanResult>;
};
