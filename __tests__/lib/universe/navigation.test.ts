import { resolveMoonTarget, type MoonNavigationContext } from '@/lib/universe/navigation';
import type { UniverseModel } from '@/lib/universe/planetModel';

const context: MoonNavigationContext = {
  departmentIds: new Set(['dept-open']),
  spaceDepartments: { 'space-open': 'dept-open', 'space-private': 'dept-private' },
  folderDepartments: { 'folder-open': 'dept-open', 'folder-private': 'dept-private' },
};

describe('CORE moon navigation contract', () => {
  it.each([
    ['source:google_mail', 'mail'], ['source:google_calendar', 'calendar'],
    ['source:google_drive', 'meine-dateien'], ['source:cloud_storage', 'meine-dateien'],
    ['source:github', 'work'], ['source:linear', 'tasks'], ['source:notion', 'integrations'],
  ])('opens the actual application for %s', (key, type) => {
    const target = resolveMoonTarget(key, context);
    expect(target?.kind).toBe('pane');
    if (target?.kind === 'pane') expect(target.pane.type).toBe(type);
  });

  it('keeps spaces, folders and joined departments as distinct destinations', () => {
    expect(resolveMoonTarget('space:space-open', context)).toEqual({ kind: 'space', spaceId: 'space-open', departmentId: 'dept-open' });
    expect(resolveMoonTarget('space-open', context)?.kind).toBe('space');
    expect(resolveMoonTarget('folder-open', context)).toEqual({ kind: 'folder', folderId: 'folder-open', departmentId: 'dept-open' });
    expect(resolveMoonTarget('dept:dept-open', context)).toEqual({ kind: 'department', departmentId: 'dept-open' });
  });

  it('uses the CORE parent when a space is not present in the lazy-loaded tree', () => {
    const model = { planets: [{ key: 'dept:dept-open', department_id: 'dept-open', moons: [{ key: 'space:lazy-space', label: 'Bereich' }] }] } as UniverseModel;
    expect(resolveMoonTarget('space:lazy-space', { ...context, model })).toEqual({ kind: 'space', spaceId: 'lazy-space', departmentId: 'dept-open' });
  });

  it.each(['space:missing', 'space:space-private', 'folder-private', 'dept:dept-private', 'unknown-id', 'source:'])('does not invent a folder or grant navigation for %s', key => {
    expect(resolveMoonTarget(key, context)).toBeNull();
  });
});
