import { moraAgentClient } from '@/lib/api/moraAgentClient';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('moraAgentClient v3', () => {
    it('listTools calls GET /v3/mora/tools', async () => {
        (coreGet as jest.Mock).mockResolvedValue([]);
        await moraAgentClient.listTools();
        expect(coreGet).toHaveBeenCalledWith('/v3/mora/tools');
    });

    it('executeTools calls POST /v3/mora/tools/execute', async () => {
        (corePost as jest.Mock).mockResolvedValue({ result: 'ok' });
        const payload = { tool: 'summarize', params: { node_id: 'nd-1' } };
        await moraAgentClient.executeTools(payload);
        expect(corePost).toHaveBeenCalledWith('/v3/mora/tools/execute', payload);
    });

    it('getTaskStatus has been removed (no v3 endpoint, no active consumer)', () => {
        expect((moraAgentClient as any).getTaskStatus).toBeUndefined();
    });
});
