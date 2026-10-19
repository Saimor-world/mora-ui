import { renderHook, act } from '@testing-library/react';

jest.mock('@/lib/api/coreClient', () => ({
  searchGlobal: jest.fn().mockResolvedValue({ results: [] }),
  searchSemantic: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/store/navStore', () => {
  const { create } = require('zustand');
  return { useNavStore: create(() => ({ activeCompanyId: null })) };
});

jest.mock('@/lib/queries/useDepartments', () => {
  const stableDepts: never[] = [];
  return { useDepartments: () => ({ data: stableDepts, isFetching: false }) };
});

jest.mock('@/lib/queries/useTree', () => {
  const stableTree: never[] = [];
  return { useTree: () => ({ data: stableTree, isFetching: false }) };
});

import { useSearchQuery } from '@/apps/search/hooks/useSearchQuery';
import { useNavStore } from '@/lib/store/navStore';
import { searchSemantic, searchGlobal } from '@/lib/api/coreClient';

describe('useSearchQuery', () => {
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks();
    useNavStore.setState({ activeCompanyId: null });
    (searchSemantic as jest.Mock).mockResolvedValue([]);
    (searchGlobal as jest.Mock).mockResolvedValue({ results: [] });
  });
  afterEach(() => jest.useRealTimers());

  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useSearchQuery());
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('updates query on setQuery', () => {
    const { result } = renderHook(() => useSearchQuery());
    act(() => { result.current.setQuery('test'); });
    expect(result.current.query).toBe('test');
  });

  it('does not restore a late reply after the query was cleared', async () => {
    let resolve!: (items: unknown[]) => void;
    (searchSemantic as jest.Mock).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    useNavStore.setState({ activeCompanyId: 'company-a' });
    const { result } = renderHook(() => useSearchQuery('Plan'));
    await act(async () => { jest.advanceTimersByTime(210); });
    expect(searchSemantic).toHaveBeenCalled();
    act(() => result.current.setQuery(''));
    await act(async () => { resolve([{ node_id: 'old', company_id: 'company-a', metadata: { title: 'Old plan' } }]); });
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('discards in-flight results when the organisation changes', async () => {
    let resolve!: (items: unknown[]) => void;
    (searchSemantic as jest.Mock).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    useNavStore.setState({ activeCompanyId: 'company-a' });
    const { result } = renderHook(() => useSearchQuery('Plan'));
    await act(async () => { jest.advanceTimersByTime(210); });
    act(() => useNavStore.setState({ activeCompanyId: 'company-b' }));
    await act(async () => { resolve([{ node_id: 'old', company_id: 'company-a', metadata: { title: 'Private A' } }]); });
    expect(result.current.results).toEqual([]);
    await act(async () => { jest.advanceTimersByTime(210); });
    expect(searchSemantic).toHaveBeenLastCalledWith('Plan', 'company-b', 10, .55);
    expect(result.current.results).toEqual([]);
  });

  it('rejects results explicitly attributed to a different organisation', async () => {
    useNavStore.setState({ activeCompanyId: 'company-a' });
    (searchSemantic as jest.Mock).mockResolvedValue([
      { node_id: 'a', company_id: 'company-a', metadata: { title: 'Plan A' } },
      { node_id: 'b', company_id: 'company-b', metadata: { title: 'Private B' } },
    ]);
    const { result } = renderHook(() => useSearchQuery('Plan'));
    await act(async () => { jest.advanceTimersByTime(210); });
    expect(result.current.results.map(item => item.id)).toEqual(['a']);
  });
});
