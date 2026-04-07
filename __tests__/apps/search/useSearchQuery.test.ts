import { renderHook, act } from '@testing-library/react';

jest.mock('@/lib/api/coreClient', () => ({
  searchGlobal: jest.fn().mockResolvedValue({ results: [] }),
  searchSemantic: jest.fn().mockResolvedValue([]),
}));

// Stable state object inside factory — prevents new references on every render
// which would cause infinite re-render loops via buildLocalResults dependency
jest.mock('@/lib/store/moraState', () => {
  const stableState = {
    companies: [],
    departments: [],
    spacesByDepartment: {},
    nodesByCompany: {},
    activeCompanyId: null,
    setActiveDepartment: jest.fn(),
    setActiveSpace: jest.fn(),
    setViewLevel: jest.fn(),
  };
  return { useMoraStore: (selector: any) => selector(stableState) };
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
