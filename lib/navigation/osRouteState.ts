import type { CoreMode, ViewLevel } from '@/lib/types/mora';

export type OsRouteView = 'home' | 'universe' | 'department' | 'space' | 'folder' | 'ambient';

export interface OsRouteState {
  view: OsRouteView;
  departmentId?: string;
  spaceId?: string;
  folderId?: string;
}

export interface OsNavigationSnapshot {
  viewLevel: ViewLevel;
  coreMode: CoreMode;
  activeDepartmentId?: string | null;
  activeSpaceId?: string | null;
  activeFolderId?: string | null;
}

const NAVIGATION_PARAMS = ['view', 'department', 'space', 'folder'] as const;

export function parseOsRouteState(search: string): OsRouteState {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  const departmentId = params.get('department') || undefined;
  const spaceId = params.get('space') || undefined;
  const folderId = params.get('folder') || undefined;

  if (view === 'universe') return { view: 'universe' };
  if (view === 'ambient') return { view: 'ambient' };
  if (view === 'department' && departmentId) return { view: 'department', departmentId };
  if (view === 'space' && departmentId && spaceId) return { view: 'space', departmentId, spaceId };
  if (view === 'folder' && departmentId && folderId) {
    return { view: 'folder', departmentId, spaceId, folderId };
  }

  return { view: 'home' };
}

export function getOsRouteState(snapshot: OsNavigationSnapshot): OsRouteState {
  if (snapshot.viewLevel === 'ambient') return { view: 'ambient' };

  if (snapshot.activeFolderId && snapshot.activeDepartmentId) {
    return {
      view: 'folder',
      departmentId: snapshot.activeDepartmentId,
      spaceId: snapshot.activeSpaceId || undefined,
      folderId: snapshot.activeFolderId,
    };
  }

  if (snapshot.viewLevel === 'space' && snapshot.activeDepartmentId && snapshot.activeSpaceId) {
    return { view: 'space', departmentId: snapshot.activeDepartmentId, spaceId: snapshot.activeSpaceId };
  }

  if (snapshot.viewLevel === 'department' && snapshot.activeDepartmentId) {
    return { view: 'department', departmentId: snapshot.activeDepartmentId };
  }

  if (snapshot.viewLevel === 'core' && snapshot.coreMode === 'explore') return { view: 'universe' };
  return { view: 'home' };
}

export function mergeOsRouteSearch(currentSearch: string, route: OsRouteState): string {
  const params = new URLSearchParams(currentSearch);
  NAVIGATION_PARAMS.forEach((key) => params.delete(key));

  if (route.view !== 'home') params.set('view', route.view);
  if (route.departmentId) params.set('department', route.departmentId);
  if (route.spaceId) params.set('space', route.spaceId);
  if (route.folderId) params.set('folder', route.folderId);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}
