import { getOsRouteState, mergeOsRouteSearch, parseOsRouteState } from '@/lib/navigation/osRouteState';

describe('OS route state', () => {
  it('serializes a department without dropping unrelated query parameters', () => {
    const route = getOsRouteState({
      viewLevel: 'department',
      coreMode: 'home',
      activeDepartmentId: 'dept-intelligence',
    });

    expect(mergeOsRouteSearch('?open_node=node-1', route)).toBe(
      '?open_node=node-1&view=department&department=dept-intelligence',
    );
  });

  it('round-trips a folder route with its department and space context', () => {
    const search = mergeOsRouteSearch('', {
      view: 'folder',
      departmentId: 'dept-1',
      spaceId: 'space-1',
      folderId: 'folder-1',
    });

    expect(parseOsRouteState(search)).toEqual({
      view: 'folder',
      departmentId: 'dept-1',
      spaceId: 'space-1',
      folderId: 'folder-1',
    });
  });

  it('falls back to home for incomplete deep links', () => {
    expect(parseOsRouteState('?view=department')).toEqual({ view: 'home' });
    expect(parseOsRouteState('?view=space&department=dept-1')).toEqual({ view: 'home' });
  });

  it('removes only OS navigation parameters when returning home', () => {
    expect(mergeOsRouteSearch('?view=universe&diagnostics=1', { view: 'home' })).toBe('?diagnostics=1');
  });
});
