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
 * No invented numbers or fake metrics.
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

    // Collect child spaces or folders
    const spaces: CoreRawNode[] = Array.isArray(dept.spaces)
      ? dept.spaces
      : Array.isArray(dept.children)
        ? dept.children.filter((c) => c && (c.type === 'space' || c.type === 'folder'))
        : [];

    if (spaces.length > 0) {
      for (const space of spaces) {
        const folders: CoreRawNode[] = Array.isArray(space.folders)
          ? space.folders
          : Array.isArray(space.children)
            ? space.children.filter((c) => c && c.type === 'folder')
            : [];

        if (folders.length > 0) {
          for (const folder of folders) {
            const rawFiles: CoreRawNode[] = Array.isArray(folder.nodes)
              ? folder.nodes
              : Array.isArray(folder.children)
                ? folder.children.filter((c) => c && c.type === 'node')
                : [];
            moons.push({
              id: String(folder.id || `folder-${moons.length}`),
              title: String(folder.name || folder.title || 'Ordner'),
              files: rawFiles.map((node, fIndex) => ({
                id: String(node.id || `node-${fIndex}`),
                name: String(node.title || node.name || 'Dokument'),
                meta: String(node.type || 'Dokument'),
                body: Array.isArray(node.body)
                  ? node.body
                  : [String(node.content || node.description || '')].filter(Boolean),
              })),
            });
          }
        } else {
          // Space acts as moon
          const rawFiles: CoreRawNode[] = Array.isArray(space.nodes)
            ? space.nodes
            : Array.isArray(space.children)
              ? space.children.filter((c) => c && c.type === 'node')
              : [];
          moons.push({
            id: String(space.id || `space-${moons.length}`),
            title: String(space.name || space.title || 'Bereich'),
            files: rawFiles.map((node, fIndex) => ({
              id: String(node.id || `node-${fIndex}`),
              name: String(node.title || node.name || 'Dokument'),
              meta: String(node.type || 'Bereich'),
              body: Array.isArray(node.body)
                ? node.body
                : [String(node.content || node.description || '')].filter(Boolean),
            })),
          });
        }
      }
    } else {
      // Check if department itself has direct folders or nodes
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
        moons.push({
          id: String(folder.id || `folder-${moons.length}`),
          title: String(folder.name || folder.title || 'Ordner'),
          files: rawFiles.map((node, fIndex) => ({
            id: String(node.id || `node-${fIndex}`),
            name: String(node.title || node.name || 'Dokument'),
            meta: String(node.type || 'Dokument'),
            body: Array.isArray(node.body)
              ? node.body
              : [String(node.content || node.description || '')].filter(Boolean),
          })),
        });
      }
    }

    return {
      id,
      title,
      jobRoles: ['inhaber', 'service', 'kueche', 'aushilfe'],
      glass,
      moons,
    };
  });
}

/**
 * Derives attention flags and actionable items from the live Today snapshot.
 */
export function deriveLiveAttention(
  snapshot: TodaySnapshot | null,
  navigate: (id: string) => void
): { attention: Set<string>; items: LiveAttentionItem[] } {
  const attention = new Set<string>();
  if (!snapshot) return { attention, items: [] };

  const derived = deriveAttention(snapshot);
  const items: LiveAttentionItem[] = derived.slice(0, 3).map((a, i) => ({
    id: a.id,
    title: a.title,
    detail: a.reason,
    action: 'Öffnen',
    primary: i === 0,
    onAction: () => {
      navigate(a.id === 'mail-unread' ? 'post' : 'today');
    },
  }));

  // Match attention items to departments if metadata is present
  if (snapshot.tasks?.due_today?.length) {
    attention.add('service');
    attention.add('kueche');
  }
  if (snapshot.mail?.unread_count) {
    attention.add('verwaltung');
  }

  return { attention, items };
}
