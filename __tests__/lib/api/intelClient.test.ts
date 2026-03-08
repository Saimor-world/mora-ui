import { triggerMoraScan } from '@/lib/api/intelClient';

jest.mock('@/lib/api/coreClient', () => ({
    corePost: jest.fn(),
}));
import { corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('triggerMoraScan', () => {
    it('routes to POST /v3/intel/scan via corePost (not raw fetch)', async () => {
        (corePost as jest.Mock).mockResolvedValue({
            report_id: 'r2', report_node_id: 'nd-2', summary: 'Intel summary',
            stats: { nodes_analyzed: 5, relations_found: 3, insights_generated: 2 },
            folder_id: 'f-abc'
        });
        const result = await triggerMoraScan('f-abc');
        expect(corePost).toHaveBeenCalledWith(
            '/v3/intel/scan',
            { folder_id: 'f-abc' }
        );
        expect(result.report_id).toBe('r2');
    });

    it('throws on error (no silent swallow)', async () => {
        (corePost as jest.Mock).mockRejectedValue(new Error('Intel scan failed'));
        await expect(triggerMoraScan('bad-folder')).rejects.toThrow('Intel scan failed');
    });
});
