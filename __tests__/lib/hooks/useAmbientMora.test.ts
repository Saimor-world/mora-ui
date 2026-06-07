/**
 * useAmbientMora.test.ts
 *
 * Tests the Mora Field Phase C hook:
 *   - sendToMora posts to /v3/mora/field
 *   - maps backend tool intents to AmbientToolCalls
 *   - no longer creates storage actions from generic text
 *   - executeMoraTools dispatches to the correct stores
 */

import { renderHook, act } from '@testing-library/react';
import { useAmbientMora } from '@/lib/hooks/useAmbientMora';

const mockCorePost = jest.fn();

jest.mock('@/lib/api/http', () => ({
    corePost: (...args: any[]) => mockCorePost(...args),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    buildChatContext: jest.fn(() => ({
        company_id: 'company-1',
        department_id: 'dept-1',
        space_id: 'space-1',
        folder_id: 'folder-current',
        view_level: 'folder',
        layer: 'L4',
        route_path: '/home',
    })),
}));

const mockAddNode = jest.fn().mockResolvedValue({});
const mockOpenPane = jest.fn();
const mockNavigateToDepartment = jest.fn();

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: {
        getState: () => ({ addNode: mockAddNode }),
    },
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: {
        getState: () => ({ openPane: mockOpenPane }),
    },
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: {
        getState: () => ({ navigateToDepartment: mockNavigateToDepartment }),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
    mockCorePost.mockResolvedValue({
        text: 'Verstanden.',
        intent: 'conversation',
        toolCalls: [],
    });
});

describe('useAmbientMora', () => {
    it('returns empty result for empty transcript', async () => {
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('');
        });
        expect(mockCorePost).not.toHaveBeenCalled();
        expect(res.toolCalls).toHaveLength(0);
    });

    it('posts the transcript and current OS context to Mora Field', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.sendToMora('Suche Bewerbungen');
        });
        expect(mockCorePost).toHaveBeenCalledWith('/v3/mora/field', {
            message: 'Suche Bewerbungen',
            context: expect.objectContaining({
                level: 'folder',
                entityId: 'folder-current',
                entityType: 'folder',
                companyId: 'company-1',
                departmentId: 'dept-1',
                spaceId: 'space-1',
                folderId: 'folder-current',
                source: 'ambient-room',
            }),
        });
    });

    it('posts the transcript, context and sessionId to Mora Field when sessionId is provided', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.sendToMora('Suche Bewerbungen', null, 'test-session-123');
        });
        expect(mockCorePost).toHaveBeenCalledWith('/v3/mora/field', {
            message: 'Suche Bewerbungen',
            session_id: 'test-session-123',
            context: expect.objectContaining({
                source: 'ambient-room',
            }),
        });
    });

    it('returns backend text and intent', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Ich suche fuer dich.',
            intent: 'search',
            toolCalls: [],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Suche');
        });
        expect(res.text).toBe('Ich suche fuer dich.');
        expect(res.intent).toBe('search');
    });

    it('maps backend search tool calls to searchGlobal', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Suche laeuft.',
            intent: 'search',
            toolCalls: [{
                type: 'search',
                payload: { query: 'Sprint Retro' },
            }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Suche Sprint Retro');
        });
        expect(res.toolCalls[0]).toMatchObject({
            tool: 'searchGlobal',
            input: { query: 'Sprint Retro' },
        });
    });

    it('maps backend open_pane tool calls to openPane', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Oeffne Finder.',
            intent: 'pane',
            toolCalls: [{
                type: 'open_pane',
                label: 'Finder',
                payload: { paneType: 'finder', data: { source: 'field' } },
            }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Oeffne Finder');
        });
        expect(res.toolCalls[0]).toMatchObject({
            tool: 'openPane',
            input: { type: 'finder', title: 'Finder', data: { source: 'field' } },
        });
    });

    it('maps backend department navigation to navigateToDepartment', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Navigiere.',
            intent: 'navigate',
            toolCalls: [{
                type: 'navigate',
                payload: { target: { entityType: 'department', entityId: 'dept-growth' } },
            }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Geh zu Growth');
        });
        expect(res.toolCalls[0]).toMatchObject({
            tool: 'navigateToDepartment',
            input: { departmentId: 'dept-growth' },
        });
    });

    it('maps backend create_note to createNode when defaultFolderId exists', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Notiz vorbereitet.',
            intent: 'note',
            toolCalls: [{
                type: 'create_note',
                payload: { content: 'VHS Absage ist eingegangen' },
            }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Merk dir VHS Absage', 'folder-123');
        });
        expect(res.toolCalls[0]).toMatchObject({
            tool: 'createNode',
            input: { folder_id: 'folder-123', content: 'VHS Absage ist eingegangen' },
        });
    });

    it('does not create storage actions from generic text even when a default folder exists', async () => {
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Eine Idee', 'folder-123');
        });
        expect(res.toolCalls).toHaveLength(0);
    });

    it('maps backend create_note to createNode with empty folder_id when no defaultFolderId exists', async () => {
        mockCorePost.mockResolvedValue({
            text: 'Notiz vorbereitet.',
            intent: 'note',
            toolCalls: [{
                type: 'create_note',
                payload: { content: 'VHS Absage ist eingegangen' },
            }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Merk dir VHS Absage', null);
        });
        expect(res.toolCalls[0]).toMatchObject({
            tool: 'createNode',
            input: { folder_id: '', content: 'VHS Absage ist eingegangen' },
        });
    });

    it('sets error and rethrows when Mora Field fails', async () => {
        mockCorePost.mockRejectedValue(new Error('Network error'));
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await expect(result.current.sendToMora('Test')).rejects.toThrow('Network error');
        });
        expect(result.current.error).toBe('Network error');
    });

    it('executeMoraTools posts createNode to Mora Field execute', async () => {
        mockCorePost.mockResolvedValueOnce({ results: [{ ok: true }], uiActions: [] });
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool: 'createNode',
                input: { title: 'Test', content: 'Inhalt', folder_id: 'f-1' },
            }]);
        });
        expect(mockCorePost).toHaveBeenCalledWith('/v3/mora/field/execute', {
            tools: [{ tool: 'createNode', input: { title: 'Test', content: 'Inhalt', folder_id: 'f-1' } }],
            context: expect.objectContaining({ source: 'ambient-room' }),
        });
        expect(mockAddNode).not.toHaveBeenCalled();
    });

    it('executeMoraTools dispatches openPane to usePaneStore', async () => {
        mockCorePost.mockResolvedValueOnce({
            results: [],
            uiActions: [{ tool: 'openPane', input: { type: 'finder', title: 'Finder' } }],
        });
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool: 'openPane',
                input: { type: 'finder', title: 'Finder' },
            }]);
        });
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder' }),
        );
    });

    it('executeMoraTools dispatches navigateToDepartment to useNavStore', async () => {
        mockCorePost.mockResolvedValueOnce({
            results: [],
            uiActions: [{ tool: 'navigateToDepartment', input: { departmentId: 'dept-eng' } }],
        });
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool: 'navigateToDepartment',
                input: { departmentId: 'dept-eng' },
            }]);
        });
        expect(mockNavigateToDepartment).toHaveBeenCalledWith('dept-eng');
    });

    it('executeMoraTools dispatches searchGlobal as openPane search', async () => {
        mockCorePost.mockResolvedValueOnce({
            results: [],
            uiActions: [{ tool: 'searchGlobal', input: { query: 'Sprint Retro' } }],
        });
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool: 'searchGlobal',
                input: { query: 'Sprint Retro' },
            }]);
        });
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'search', data: { query: 'Sprint Retro' } }),
        );
    });

    it('executeMoraTools throws when backend execution fails', async () => {
        mockCorePost.mockResolvedValueOnce({
            results: [{ ok: false, error: 'folder_id is required' }],
            uiActions: [],
        });
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await expect(result.current.executeMoraTools([{
                tool: 'createNode',
                input: { title: 'Test', content: 'Inhalt', folder_id: '' },
            }])).rejects.toThrow('folder_id is required');
        });
    });
});
