import type { DemoFile, DemoMoon, DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import { deriveAttention } from '../../today/data/attention';

const GLASS_PALETTE: DemoPlanet['glass'][] = ['champagne', 'sage', 'lavender', 'bluegrey', 'paleblue'];

function pickGlass(id: string, name: string, index: number): DemoPlanet['glass'] {
  const norm = `${id} ${name}`.toLowerCase();
  if (norm.includes('kueche') || norm.includes('küche') || norm.includes('kitchen')) return 'champagne';
  if (norm.includes('service')) return 'sage';
  if (norm.includes('verwaltung') || norm.includes('admin') || norm.includes('management')) return 'bluegrey';
  if (norm.includes('theke') || norm.includes('bar') || norm.includes('hr') || norm.includes('culture')) return 'lavender';
  return GLASS_PALETTE[index % GLASS_PALETTE.length];
}

export interface CoreRawNode {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  slug?: string;
  color?: string;
  description?: string;
  content?: string;
  body?: string[];
  children?: CoreRawNode[];
  nodes?: CoreRawNode[];
  folders?: CoreRawNode[];
  spaces?: CoreRawNode[];
  subfolders?: CoreRawNode[];
}

export interface LiveAttentionItem {
  id: string;
  title: string;
  detail: string;
  action: string;
  primary?: boolean;
  onAction?: () => void;
}

/**
 * Maps live CORE tree/department models to Cockpit scene types (DemoPlanet, DemoMoon, DemoFile).
 * Real departments = Planets, real folders/spaces = Moons, real nodes = Files.
 * Truthful mapping: no invented numbers or fake folders.
 */
export function coreTreeToPlanets(rawTreeOrDepartments: any): DemoPlanet[] {
  if (!rawTreeOrDepartments) return [];

  const rawDepts: CoreRawNode[] = Array.isArray(rawTreeOrDepartments)
    ? rawTreeOrDepartments.filter((d) => d && (d.type === 'department' || (!d.type && (d.id || d.name))))
    : Array.isArray(rawTreeOrDepartments.departments)
      ? rawTreeOrDepartments.departments
      : [];

  return rawDepts.map((dept, index) => {
    const id = String(dept.id || `dept-${index}`);
    const title = String(dept.name || dept.title || 'Abteilung');
    const glass = pickGlass(id, title, index);

    const moons: DemoMoon[] = [];
    const seenMoonIds = new Set<string>();

    const addMoon = (
      mId: string,
      mTitle: string,
      files: DemoFile[],
      extra?: { loadError?: boolean; hint?: string; disabled?: boolean }
    ) => {
      if (seenMoonIds.has(mId)) return;
      seenMoonIds.add(mId);
      moons.push({
        id: mId,
        title: mTitle,
        files,
        ...extra,
      });
    };

    // 1. Direct folders on department
    const directFolders: CoreRawNode[] = Array.isArray(dept.folders)
      ? dept.folders
      : Array.isArray(dept.children)
        ? dept.children.filter((c) => c && c.type === 'folder')
        : [];

    for (const folder of directFolders) {
      const rawFiles: CoreRawNode[] = Array.isArray(folder.nodes)
        ? folder.nodes
        : Array.isArray(folder.children)
          ? folder.children.filter((c) => c && c.type === 'node')
          : [];
      addMoon(
        String(folder.id || `folder-${moons.length}`),
        String(folder.name || folder.title || 'Ordner'),
        rawFiles.map((node, fIndex) => ({
          id: String(node.id || `node-${fIndex}`),
          name: String(node.title || node.name || 'Dokument'),
          meta: String(node.type || 'Dokument'),
          body: Array.isArray(node.body)
            ? node.body
            : [String(node.content || node.description || '')].filter(Boolean),
        }))
      );
    }

    // 2. Spaces of the department and their folders
    const spaces: CoreRawNode[] = Array.isArray(dept.spaces)
      ? dept.spaces
      : Array.isArray(dept.children)
        ? dept.children.filter((c) => c && (c.type === 'space' || (!c.type && c.folders)))
        : [];

    for (const space of spaces) {
      if ((space as any).loadError) {
        addMoon(
          String(space.id || `space-${moons.length}`),
          String(space.name || space.title || 'Bereich'),
          [],
          {
            loadError: true,
            hint: (space as any).errorHint || 'Ordner gerade nicht ladbar',
            disabled: true,
          }
        );
        continue;
      }

      const spaceFolders: CoreRawNode[] = Array.isArray(space.folders)
        ? space.folders
        : Array.isArray(space.children)
          ? space.children.filter((c) => c && c.type === 'folder')
          : [];

      if (spaceFolders.length > 0) {
        for (const folder of spaceFolders) {
          const rawFiles: CoreRawNode[] = Array.isArray(folder.nodes)
            ? folder.nodes
            : Array.isArray(folder.children)
              ? folder.children.filter((c) => c && c.type === 'node')
              : [];
          addMoon(
            String(folder.id || `folder-${moons.length}`),
            String(folder.name || folder.title || 'Ordner'),
            rawFiles.map((node, fIndex) => ({
              id: String(node.id || `node-${fIndex}`),
              name: String(node.title || node.name || 'Dokument'),
              meta: String(node.type || 'Dokument'),
              body: Array.isArray(node.body)
                ? node.body
                : [String(node.content || node.description || '')].filter(Boolean),
            }))
          );
        }
      } else {
        // Space itself acts as a Moon if it has nodes or stands alone
        const rawFiles: CoreRawNode[] = Array.isArray(space.nodes)
          ? space.nodes
          : Array.isArray(space.children)
            ? space.children.filter((c) => c && c.type === 'node')
            : [];
        addMoon(
          String(space.id || `space-${moons.length}`),
          String(space.name || space.title || 'Bereich'),
          rawFiles.map((node, fIndex) => ({
            id: String(node.id || `node-${fIndex}`),
            name: String(node.title || node.name || 'Dokument'),
            meta: String(node.type || 'Bereich'),
            body: Array.isArray(node.body)
              ? node.body
              : [String(node.content || node.description || '')].filter(Boolean),
          }))
        );
      }
    }

    return {
      id,
      title,
      jobRoles: ['inhaber', 'service', 'kueche', 'aushilfe'],
      glass,
      position: { x: 50, y: 50 },
      moons,
    };
  });
}

/**
 * Derives live attention items and attention badges from CORE TodaySnapshot.
 * Honest mapping: only sources actually present in CORE.
 */
export function deriveLiveAttention(
  snapshot: TodaySnapshot | null | undefined,
  navigate?: (featureId: string) => void
): {
  attention: Set<string>;
  items: LiveAttentionItem[];
} {
  const attention = new Set<string>();
  const items: LiveAttentionItem[] = [];

  if (!snapshot) {
    return { attention, items };
  }

  // Attention badge mappings for departments based on task or alert sources
  if (snapshot.tasks?.due_today?.length) {
    for (const t of snapshot.tasks.due_today) {
      const lower = `${t.title} ${t.id}`.toLowerCase();
      if (lower.includes('küche') || lower.includes('kueche') || lower.includes('bestand') || lower.includes('gericht')) {
        attention.add('kueche');
      }
      if (lower.includes('service') || lower.includes('tisch') || lower.includes('schicht') || lower.includes('reservier')) {
        attention.add('service');
      }
    }
  }

  // Live attention items directly from CORE
  if (snapshot.mail?.unread_count && snapshot.mail.unread_count > 0) {
    items.push({
      id: 'live-mail',
      title: `${snapshot.mail.unread_count} neue ${snapshot.mail.unread_count === 1 ? 'E-Mail' : 'E-Mails'}`,
      detail: 'Im gemeinsamen Posteingang aus CORE eingetroffen.',
      action: 'Post öffnen',
      primary: true,
      onAction: () => navigate?.('mora'),
    });
  }

  if (snapshot.calendar?.events?.length) {
    const nextEv = snapshot.calendar.events[0];
    items.push({
      id: 'live-cal',
      title: nextEv.title,
      detail: `${nextEv.time ? `${nextEv.time} Uhr · ` : ''}Aus dem CORE-Firmenkalender`,
      action: 'Kalender ansehen',
      onAction: () => navigate?.('calendar'),
    });
  }

  if (snapshot.tasks?.due_today?.length) {
    const nextTask = snapshot.tasks.due_today[0];
    items.push({
      id: 'live-task',
      title: nextTask.title,
      detail: 'Heute zur Erledigung fällig.',
      action: 'Aufgabe erledigen',
      onAction: () => navigate?.('tasks'),
    });
  }

  return { attention, items };
}
