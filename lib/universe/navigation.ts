import type { PaneOpenRequest } from '@/lib/store/paneStore';
import { departmentIdOf, type UniverseModel } from './planetModel';

const SOURCE_APPS: Record<string, Pick<PaneOpenRequest, 'id' | 'type' | 'title'>> = {
  google_mail: { id: 'mail-main', type: 'mail', title: 'Mail' },
  imap: { id: 'mail-main', type: 'mail', title: 'Mail' },
  outlook: { id: 'mail-main', type: 'mail', title: 'Mail' },
  microsoft_mail: { id: 'mail-main', type: 'mail', title: 'Mail' },
  google_calendar: { id: 'calendar-main', type: 'calendar', title: 'Kalender' },
  microsoft_calendar: { id: 'calendar-main', type: 'calendar', title: 'Kalender' },
  caldav: { id: 'calendar-main', type: 'calendar', title: 'Kalender' },
  google_drive: { id: 'files-main', type: 'meine-dateien', title: 'Dateien' },
  cloud_storage: { id: 'files-main', type: 'meine-dateien', title: 'Dateien' },
  nextcloud_oauth: { id: 'files-main', type: 'meine-dateien', title: 'Dateien' },
  nextcloud: { id: 'files-main', type: 'meine-dateien', title: 'Dateien' },
  onedrive: { id: 'files-main', type: 'meine-dateien', title: 'Dateien' },
  dropbox: { id: 'files-main', type: 'meine-dateien', title: 'Dateien' },
  github: { id: 'work-main', type: 'work', title: 'Arbeit' },
  gitlab: { id: 'work-main', type: 'work', title: 'Arbeit' },
  linear: { id: 'tasks-main', type: 'tasks', title: 'Aufgaben' },
  jira: { id: 'tasks-main', type: 'tasks', title: 'Aufgaben' },
};

export type MoonNavigationTarget =
  | { kind: 'pane'; pane: PaneOpenRequest }
  | { kind: 'department'; departmentId: string }
  | { kind: 'space'; spaceId: string; departmentId: string }
  | { kind: 'folder'; folderId: string; departmentId: string };

export type MoonNavigationContext = {
  model?: UniverseModel | null;
  /** Departments exposed by the current membership-scoped UI. */
  departmentIds: ReadonlySet<string>;
  spaceDepartments: Readonly<Record<string, string>>;
  folderDepartments: Readonly<Record<string, string>>;
};

/** The CORE moon key declares its destination; a space is never interpreted as a folder. */
export function resolveMoonTarget(key: string, context: MoonNavigationContext): MoonNavigationTarget | null {
  if (key.startsWith('source:')) {
    const source = key.slice(7);
    if (!source) return null;
    const app = SOURCE_APPS[source] ?? { id: 'integrations-main', type: 'integrations' as const, title: 'Integrationen' };
    return { kind: 'pane', pane: { ...app, size: { width: 1040, height: 720 } } };
  }

  const departmentId = departmentIdOf(key) ?? key;
  if (context.departmentIds.has(departmentId)) return { kind: 'department', departmentId };

  const spaceId = key.startsWith('space:') ? key.slice(6) : key;
  const modelParent = context.model?.planets.find(planet => planet.moons.some(moon => moon.key === `space:${spaceId}`));
  const spaceDepartment = context.spaceDepartments[spaceId]
    ?? (modelParent?.department_id || (modelParent ? departmentIdOf(modelParent.key) : null));
  if (spaceDepartment && context.departmentIds.has(spaceDepartment)) {
    return { kind: 'space', spaceId, departmentId: spaceDepartment };
  }
  if (key.startsWith('space:')) return null;

  const folderId = key.startsWith('folder:') ? key.slice(7) : key;
  const folderDepartment = context.folderDepartments[folderId];
  if (folderDepartment && context.departmentIds.has(folderDepartment)) {
    return { kind: 'folder', folderId, departmentId: folderDepartment };
  }
  return null;
}
