import { renderHook, act } from '@testing-library/react';

jest.mock('@/lib/api/coreClient', () => ({
  searchGlobal: jest.fn().mockResolvedValue({ results: [] }),
  searchSemantic: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/store/navStore', () => {
  const { create } = require('zustand');
  const store = create(() => ({ activeCompanyId: null }));
  return { useNavStore: (sel?: any) => sel ? store(sel) : store.getState(), ...store };
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

describe('useSearchQuery', () => {
  beforeEach(() => jest.useFakeTimers());
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
});
