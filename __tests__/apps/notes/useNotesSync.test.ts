import { renderHook, act } from '@testing-library/react';
import { useNotesSync } from '@/apps/notes/hooks/useNotesSync';

jest.mock('@/lib/api/coreClient', () => ({
  fetchPersonalHomeNote: jest.fn(),
  savePersonalHomeNote: jest.fn(),
}));
import { fetchPersonalHomeNote, savePersonalHomeNote } from '@/lib/api/coreClient';
const mockFetch = fetchPersonalHomeNote as jest.Mock;
const mockSave = savePersonalHomeNote as jest.Mock;

describe('useNotesSync', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('starts in loading state', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useNotesSync());
    expect(result.current.loadState).toBe('loading');
  });

  it('transitions to ready when note loads', async () => {
    mockFetch.mockResolvedValue({ content: 'Hello notes' });
    const { result } = renderHook(() => useNotesSync());
    await act(async () => {});
    expect(result.current.loadState).toBe('ready');
    expect(result.current.content).toBe('Hello notes');
  });

  it('loads note content from v3 response envelope', async () => {
    mockFetch.mockResolvedValue({ note: { content: 'Envelope notes' } });
    const { result } = renderHook(() => useNotesSync());
    await act(async () => {});
    expect(result.current.loadState).toBe('ready');
    expect(result.current.content).toBe('Envelope notes');
  });

  it('transitions to no-server when fetch returns null', async () => {
    mockFetch.mockResolvedValue(null);
    const { result } = renderHook(() => useNotesSync());
    await act(async () => {});
    expect(result.current.loadState).toBe('no-server');
  });

  it('saves content on handleBlur when content changed', async () => {
    mockFetch.mockResolvedValue({ content: 'old content' });
    mockSave.mockResolvedValue(true);
    const { result } = renderHook(() => useNotesSync());
    await act(async () => {});

    act(() => { result.current.setContent('new content'); });
    await act(async () => { result.current.handleBlur(); });

    expect(mockSave).toHaveBeenCalledWith('new content');
    expect(result.current.saveState).toBe('saved');
  });

  it('does not save when content unchanged', async () => {
    mockFetch.mockResolvedValue({ content: 'same' });
    const { result } = renderHook(() => useNotesSync());
    await act(async () => {});

    await act(async () => { result.current.handleBlur(); });
    expect(mockSave).not.toHaveBeenCalled();
  });
});
