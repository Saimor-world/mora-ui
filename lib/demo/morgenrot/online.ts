// Café Morgenrot (FIKTIV) live from CORE: its own tenant, its own company, read only through the normal session.
import { coreGet, CoreError } from '@/lib/api/http';
import { parseTodaySnapshot, snapshotMatchesTodayContext, type TodaySnapshot } from '@/lib/api/todayClient';

/** The one place that names the demo company in CORE. */
export const MORGENROT = { tenantId: 'tenant-demo-morgenrot', companyId: 'demo-morgenrot' } as const;

export interface MorgenrotNode {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  folder_id?: string | null;
  body?: string[];
  content?: string;
  metadata?: Record<string, unknown> | null;
}

export interface MorgenrotFolder {
  id: string;
  name?: string;
  title?: string;
  space_id?: string | null;
  department_id?: string | null;
  metadata?: Record<string, unknown> | null;
  nodes?: MorgenrotNode[];
  children?: MorgenrotNode[];
}

export interface MorgenrotSpace {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  department_id?: string | null;
  folders?: MorgenrotFolder[];
  children?: MorgenrotFolder[];
  nodes?: MorgenrotNode[];
}

export interface MorgenrotDepartment {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  spaces?: MorgenrotSpace[];
  folders?: MorgenrotFolder[];
  children?: (MorgenrotSpace | MorgenrotFolder)[];
}

export type MorgenrotViewer = { userId: string; name: string | null; role: string };

export type MorgenrotState =
  | { kind: 'online'; viewer: MorgenrotViewer; snapshot: TodaySnapshot; departments: MorgenrotDepartment[] }
  /** Not signed in, or signed in to another company: never the seed, but a way to sign in. */
  | { kind: 'login'; signedInElsewhere: boolean }
  /** Signed in as Morgenrot, but CORE refuses this company or Today. */
  | { kind: 'forbidden' }
  /** CORE did not answer: only now the fictional offline example may be shown. */
  | { kind: 'offline'; error?: string };

const unreachable = (error: unknown) => error instanceof CoreError && error.status >= 500;

function normalizeArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.folders)) return obj.folders as T[];
    if (Array.isArray(obj.departments)) return obj.departments as T[];
    if (Array.isArray(obj.spaces)) return obj.spaces as T[];
    if (Array.isArray(obj.nodes)) return obj.nodes as T[];
  }
  return [];
}

/**
 * Reads session, Today and departments through the ordinary session routes.
 * Never calls /demo/* (those routes may reseed or reset a tenant).
 */
export async function loadMorgenrot(): Promise<MorgenrotState> {
  let session: Record<string, unknown> | null;
  try {
    session = await coreGet('/v3/auth/session', { throwAuthErrors: true });
  } catch (error: any) {
    console.error('[loadMorgenrot] session check error:', error?.message || error);
    if (unreachable(error)) return { kind: 'offline', error: error?.message || 'CORE Server-Fehler' };
    return { kind: 'login', signedInElsewhere: false };
  }
  if (session === null) {
    console.warn('[loadMorgenrot] session returned null (network or timeout)');
    return { kind: 'offline', error: 'Netzwerkfehler oder Timeout beim Sitzungsaufruf' };
  }
  const tenant = String(session.tenant_id ?? '');
  if (!tenant) return { kind: 'login', signedInElsewhere: false };
  if (tenant !== MORGENROT.tenantId) return { kind: 'login', signedInElsewhere: true };

  const query = `?company_id=${encodeURIComponent(MORGENROT.companyId)}`;
  try {
    const [rawToday, rawTree, rawFolders, rawNodes] = await Promise.all([
      coreGet(`/v3/today${query}`, { throwAuthErrors: true }),
      coreGet(`/v3/tree${query}`, { throwAuthErrors: true }),
      coreGet(`/v3/folders${query}`, { isOptional: true }).catch(() => null),
      coreGet(`/v3/nodes${query}&limit=500`, { isOptional: true }).catch(() => null),
    ]);

    if (rawToday === null || rawTree === null) {
      console.warn('[loadMorgenrot] today or tree returned null');
      return { kind: 'offline', error: 'Today oder Firmenbaum nicht erreichbar' };
    }
    const snapshot = parseTodaySnapshot(rawToday);
    const userId = String(session.user_id ?? '');
    // A snapshot for another company or person is never shown as Morgenrot.
    if (!snapshot || !snapshotMatchesTodayContext(snapshot, MORGENROT.companyId, userId || null)) {
      return { kind: 'forbidden' };
    }

    const flatFolders: MorgenrotFolder[] = normalizeArray(rawFolders);
    const flatNodes: MorgenrotNode[] = normalizeArray(rawNodes);

    // Group nodes by folder
    const nodesByFolder: Record<string, MorgenrotNode[]> = {};
    for (const node of flatNodes) {
      if (!node?.id || !node.folder_id) continue;
      (nodesByFolder[node.folder_id] ||= []).push(node);
    }

    // Attach nodes into folders
    const enrichedFolders = flatFolders.map((f) => ({
      ...f,
      nodes: nodesByFolder[f.id] ?? f.nodes ?? [],
      children: nodesByFolder[f.id] ?? f.children ?? [],
    }));

    // Map space_id -> folders, and department_id -> folders
    const foldersBySpace: Record<string, MorgenrotFolder[]> = {};
    const foldersByDept: Record<string, MorgenrotFolder[]> = {};

    for (const folder of enrichedFolders) {
      if (folder.space_id) {
        (foldersBySpace[folder.space_id] ||= []).push(folder);
      }
      const deptId = folder.department_id || (folder.metadata?.department_id as string | undefined);
      if (deptId) {
        (foldersByDept[deptId] ||= []).push(folder);
      }
    }

    // Build real departments tree with full spaces, folders and nodes
    const rawDeptsList: any[] = normalizeArray(rawTree?.departments ?? rawTree);
    const departments: MorgenrotDepartment[] = rawDeptsList
      .filter((d) => d && (d.id || d.name))
      .map((d: any) => {
        const deptId = String(d.id);
        const deptName = String(d.name || d.title || 'Abteilung');

        const spaces: MorgenrotSpace[] = normalizeArray<any>(d.spaces ?? d.children).map((sp: any) => {
          const spaceId = String(sp.id);
          const childFolders = foldersBySpace[spaceId] ?? sp.folders ?? [];
          return {
            ...sp,
            id: spaceId,
            name: String(sp.name || sp.title || 'Bereich'),
            folders: childFolders,
            children: childFolders,
          };
        });

        // Folders directly on the department (or matched by department_id)
        const directFolders = [
          ...(foldersByDept[deptId] ?? []),
          ...(foldersByDept[d.slug] ?? []),
          ...normalizeArray<any>(d.folders),
        ];

        // Deduplicate direct folders by id
        const seenFolderIds = new Set<string>();
        const uniqueDirectFolders: MorgenrotFolder[] = [];
        for (const f of directFolders) {
          if (f?.id && !seenFolderIds.has(f.id)) {
            seenFolderIds.add(f.id);
            uniqueDirectFolders.push(f);
          }
        }

        return {
          id: deptId,
          name: deptName,
          slug: d.slug,
          spaces,
          folders: uniqueDirectFolders,
          children: [...spaces, ...uniqueDirectFolders],
        };
      });

    const name = typeof session.full_name === 'string' && session.full_name.trim() ? session.full_name.trim() : null;
    return {
      kind: 'online',
      viewer: { userId, name, role: String(session.role ?? 'member') },
      snapshot,
      departments,
    };
  } catch (error: any) {
    console.error('[loadMorgenrot] data fetch error:', error?.message || error);
    if (unreachable(error)) return { kind: 'offline', error: error?.message || 'Serverfehler beim Laden' };
    if (error instanceof CoreError && error.status === 401) return { kind: 'login', signedInElsewhere: false };
    return { kind: 'forbidden' };
  }
}
