import { triggerFolderScan } from '@/lib/api/scanClient';

jest.mock('@/lib/api/coreClient', () => ({
    corePost: jest.fn(),
}));
import { corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('triggerFolderScan', () => {
    it('routes to POST /v3/scan/analyze/{folderId}', async () => {
        (corePost as jest.Mock).mockResolvedValue({
            report_id: 'r1', report_node_id: 'nd-1', summary: 'ok',
            stats: { nodes_analyzed: 3, relations_found: 2, insights_generated: 1 },
            folder_id: 'folder-abc'
        });
        const result = await triggerFolderScan('folder-abc');
        expect(corePost).toHaveBeenCalledWith(
            expect.stringContaining('/v3/scan/analyze/folder-abc'),
            expect.anything()
        );
        expect(result.report_id).toBe('r1');
        expect(result.report_node_id).toBe('nd-1');
    });
});
