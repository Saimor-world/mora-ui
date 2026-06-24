import { buildChatContext, moraAgentClient } from '@/lib/api/moraAgentClient';
import { usePaneStore } from '@/lib/store/paneStore';

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
}));
import { coreGet, corePost } from '@/lib/api/coreClient';

beforeEach(() => jest.clearAllMocks());

describe('moraAgentClient v3', () => {
    beforeEach(() => {
        usePaneStore.getState().reset();
    });

    it('describes the frontmost non-Mora pane as workspace focus', () => {
        usePaneStore.setState({
            panes: [
                { id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch', minimized: false, zIndex: 500, position: { x: 0, y: 0 }, size: { width: 700, height: 600 }, data: {} },
                { id: 'chat-main', type: 'chat', title: 'Chat mit Môra', minimized: false, zIndex: 501, position: { x: 20, y: 20 }, size: { width: 700, height: 600 }, data: {} },
            ],
            activePaneId: 'chat-main',
        });

        expect(buildChatContext()?.workspace).toEqual({
            focused_pane: { id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch' },
            visible_panes: [{ id: 'nightwatch-main', type: 'nightwatch', title: 'Nightwatch' }],
        });
    });

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
