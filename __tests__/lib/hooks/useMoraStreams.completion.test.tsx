import { act, renderHook } from '@testing-library/react';
import { TextDecoder, TextEncoder } from 'util';
import { useMoraStream } from '@/lib/hooks/useMoraStream';
import { useMoraFrameStream } from '@/lib/hooks/useMoraFrameStream';

jest.mock('@/lib/auth/runtimeSession', () => ({ useRuntimeSession: () => ({ data: null }) }));
jest.mock('@/lib/api/coreClient', () => ({ getCoreBaseUrl: () => '/api/core' }));
jest.mock('@/lib/store/orbStore', () => ({ useOrbStore: { getState: () => ({ setOrbState: jest.fn(), setAnswerProvenance: jest.fn() }) } }));
jest.mock('@/lib/store/chatStore', () => ({ useChatStore: { getState: () => ({ setLastChatScope: jest.fn() }) } }));

const encoder = new TextEncoder();
function response(chunks: string[], status = 200) {
  let index = 0;
  return {
    ok: status === 200,
    status,
    body: { getReader: () => ({
      read: jest.fn(async () => index < chunks.length ? { done: false, value: encoder.encode(chunks[index++]) } : { done: true }),
      cancel: jest.fn(async () => undefined),
    }) },
  };
}
beforeAll(() => { Object.assign(global, { TextDecoder }); });
beforeEach(() => {
  document.cookie = 'mora_session=sess_unit_test';
  global.fetch = jest.fn();
});
afterEach(() => { document.cookie = 'mora_session=; max-age=0'; });

describe('MÔRA stream completion', () => {
  it('returns the completed typed answer before a React rerender and retains it for the next turn', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response(['data: {"kind":"thought","te', 'xt":"Erste Antwort"}\n\ndata: [DONE]\n\n']))
      .mockResolvedValueOnce(response(['data: {"kind":"thought","text":"Zweite Antwort"}\n\n']));
    const { result } = renderHook(() => useMoraFrameStream());
    await act(async () => {
      expect(await result.current.send('Erste Frage')).toEqual({ frames: [{ kind: 'thought', text: 'Erste Antwort' }], error: null, aborted: false });
    });
    await act(async () => {
      expect(await result.current.send('Zweite Frage')).toEqual({ frames: [{ kind: 'thought', text: 'Zweite Antwort' }], error: null, aborted: false });
    });
    expect(result.current.frames).toEqual([{ kind: 'thought', text: 'Zweite Antwort' }]);
    expect(result.current.isStreaming).toBe(false);
  });

  it.each([401, 503])('returns a typed stream failure for HTTP %s', async status => {
    (fetch as jest.Mock).mockResolvedValueOnce(response([], status));
    const { result } = renderHook(() => useMoraFrameStream());
    await act(async () => {
      const completed = await result.current.send('Eine Frage');
      expect(completed.frames).toEqual([]);
      expect(completed.error).toBeTruthy();
      expect(completed.aborted).toBe(false);
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it('keeps an incomplete typed answer together with the server error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(response(['data: {"kind":"thought","text":"Teilantwort"}\n\ndata: [ERROR]\n\n']));
    const { result } = renderHook(() => useMoraFrameStream());
    await act(async () => {
      const completed = await result.current.send('Eine Frage');
      expect(completed.frames).toEqual([{ kind: 'thought', text: 'Teilantwort' }]);
      expect(completed.error).toBeTruthy();
    });
  });

  it('makes a text stream failure available immediately after awaiting the request', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(response([], 503));
    const { result } = renderHook(() => useMoraStream());
    await act(async () => {
      expect(await result.current.sendMessage('Eine Frage')).toBe('');
      expect(result.current.getError()).toContain('503');
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it('does not silently finish an empty response, then clears the error on recovery', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response(['data: [DONE]\n\n']))
      .mockResolvedValueOnce(response(['data: {"token":"Wieder erreichbar"}\n\ndata: [DONE]\n\n']));
    const { result } = renderHook(() => useMoraStream());
    await act(async () => {
      expect(await result.current.sendMessage('Eine Frage')).toBe('');
      expect(result.current.getError()).toBeTruthy();
    });
    await act(async () => {
      expect(await result.current.sendMessage('Noch eine Frage')).toBe('Wieder erreichbar');
      expect(result.current.getError()).toBeNull();
    });
  });

  it('stops a failed text stream without accepting later tokens as a complete answer', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce(response(['data: {"token":"Teilantwort"}\n\ndata: {"error":"Quelle ausgefallen"}\n\n', 'data: {"token":"Nicht übernehmen"}\n\n']));
    const { result } = renderHook(() => useMoraStream());
    await act(async () => {
      expect(await result.current.sendMessage('Eine Frage')).toBe('Teilantwort');
      expect(result.current.getError()).toBe('Quelle ausgefallen');
    });
  });
});
