/**
 * useAmbientMora.test.ts
 *
 * Tests the Môra AI interaction hook (Phase A):
 *   - sendToMora calls moraAgentClient.chat + cursorBridge.parseAIResponse
 *   - Maps pane/navigate CursorCommands → AmbientToolCalls
 *   - Fallback createNode when no tools + defaultFolderId provided
 *   - executeMoraTools dispatches to correct stores
 *   - Error handling sets error state
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAmbientMora } from '@/lib/hooks/useAmbientMora';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/api/moraAgentClient', () => ({
    moraAgentClient: {
        chat: jest.fn(),
    },
    buildChatContext: jest.fn(() => undefined),
}));

jest.mock('@/lib/ai/cursorBridge', () => ({
    parseAIResponse: jest.fn(),
}));

// Stable mock stores — defined in factory scope to avoid per-render recreation
const mockAddNode             = jest.fn().mockResolvedValue({});
const mockOpenPane            = jest.fn();
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

import { moraAgentClient } from '@/lib/api/moraAgentClient';
import { parseAIResponse } from '@/lib/ai/cursorBridge';

const mockChat          = moraAgentClient.chat  as jest.MockedFunction<typeof moraAgentClient.chat>;
const mockParseResponse = parseAIResponse        as jest.MockedFunction<typeof parseAIResponse>;

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    jest.clearAllMocks();
    // Default: AI returns plain text, no action commands
    mockChat.mockResolvedValue({
        response:   'Verstanden.',
        session_id: 'sess-1',
        tool_uses:  [],
        iterations: 1,
        metadata:   {},
    } as any);
    mockParseResponse.mockReturnValue({ cleanContent: 'Verstanden.', commands: [] });
});

describe('useAmbientMora', () => {

    // ── sendToMora ─────────────────────────────────────────────────────────────

    it('returns empty result for empty transcript', async () => {
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('');
        });
        expect(mockChat).not.toHaveBeenCalled();
        expect(res.toolCalls).toHaveLength(0);
    });

    it('calls moraAgentClient.chat with the transcript', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.sendToMora('Erstelle eine Note');
        });
        expect(mockChat).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Erstelle eine Note' }),
        );
    });

    it('returns cleanContent as text', async () => {
        mockParseResponse.mockReturnValue({ cleanContent: 'Gerne!', commands: [] });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Hallo');
        });
        expect(res.text).toBe('Gerne!');
    });

    it('maps a pane CursorCommand to openPane AmbientToolCall', async () => {
        mockParseResponse.mockReturnValue({
            cleanContent: 'Öffne Finder.',
            commands: [{ type: 'pane', paneType: 'finder', message: 'Finder' }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Öffne den Finder');
        });
        expect(res.toolCalls).toHaveLength(1);
        expect(res.toolCalls[0]).toMatchObject({ tool: 'openPane', input: { type: 'finder' } });
    });

    it('maps a navigate CursorCommand to navigateToDepartment AmbientToolCall', async () => {
        mockParseResponse.mockReturnValue({
            cleanContent: 'Navigiere.',
            commands: [{ type: 'navigate', target: 'dept-growth' }],
        });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Geh zu Growth');
        });
        expect(res.toolCalls[0]).toMatchObject({
            tool:  'navigateToDepartment',
            input: { departmentId: 'dept-growth' },
        });
    });

    it('falls back to createNode when no commands and defaultFolderId provided', async () => {
        mockParseResponse.mockReturnValue({ cleanContent: 'OK', commands: [] });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Eine Idee', 'folder-123');
        });
        expect(res.toolCalls).toHaveLength(1);
        expect(res.toolCalls[0]).toMatchObject({
            tool:  'createNode',
            input: { folder_id: 'folder-123' },
        });
    });

    it('does NOT fall back to createNode when no defaultFolderId', async () => {
        mockParseResponse.mockReturnValue({ cleanContent: 'OK', commands: [] });
        const { result } = renderHook(() => useAmbientMora());
        let res: any;
        await act(async () => {
            res = await result.current.sendToMora('Eine Idee', null);
        });
        expect(res.toolCalls).toHaveLength(0);
    });

    it('sets isLoading to false after completion', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.sendToMora('Test');
        });
        expect(result.current.isLoading).toBe(false);
    });

    it('sets error and rethrows when moraAgentClient.chat fails', async () => {
        mockChat.mockRejectedValue(new Error('Network error'));
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await expect(result.current.sendToMora('Test')).rejects.toThrow('Network error');
        });
        expect(result.current.error).toBe('Network error');
    });

    // ── executeMoraTools ───────────────────────────────────────────────────────

    it('executeMoraTools dispatches createNode to useMoraStore', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool:  'createNode',
                input: { title: 'Test', content: 'Inhalt', folder_id: 'f-1' },
            }]);
        });
        expect(mockAddNode).toHaveBeenCalledWith({
            title:     'Test',
            content:   'Inhalt',
            folder_id: 'f-1',
            type:      'note',
        });
    });

    it('executeMoraTools dispatches openPane to usePaneStore', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool:  'openPane',
                input: { type: 'finder', title: 'Finder' },
            }]);
        });
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder' }),
        );
    });

    it('executeMoraTools dispatches navigateToDepartment to useNavStore', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool:  'navigateToDepartment',
                input: { departmentId: 'dept-eng' },
            }]);
        });
        expect(mockNavigateToDepartment).toHaveBeenCalledWith('dept-eng');
    });

    it('executeMoraTools dispatches searchGlobal as openPane search', async () => {
        const { result } = renderHook(() => useAmbientMora());
        await act(async () => {
            await result.current.executeMoraTools([{
                tool:  'searchGlobal',
                input: { query: 'Sprint Retro' },
            }]);
        });
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'search', data: { query: 'Sprint Retro' } }),
        );
    });
});
