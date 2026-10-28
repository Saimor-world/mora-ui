// Café Morgenrot (FIKTIV) live from CORE: its own tenant, its own company, read only through the normal session.
import { coreGet, CoreError } from '@/lib/api/http';
import { parseTodaySnapshot, snapshotMatchesTodayContext, type TodaySnapshot } from '@/lib/api/todayClient';

/** The one place that names the demo company in CORE. */
export const MORGENROT = { tenantId: 'tenant-demo-morgenrot', companyId: 'demo-morgenrot' } as const;

export type MorgenrotDepartment = { id: string; name: string };
export type MorgenrotViewer = { userId: string; name: string | null; role: string };

export type MorgenrotState =
  | { kind: 'online'; viewer: MorgenrotViewer; snapshot: TodaySnapshot; departments: MorgenrotDepartment[] }
  /** Not signed in, or signed in to another company: never the seed, but a way to sign in. */
  | { kind: 'login'; signedInElsewhere: boolean }
  /** Signed in as Morgenrot, but CORE refuses this company or Today. */
  | { kind: 'forbidden' }
  /** CORE did not answer: only now the fictional offline example may be shown. */
  | { kind: 'offline' };

const unreachable = (error: unknown) => error instanceof CoreError && error.status >= 500;

/**
 * Reads session, Today and departments through the ordinary session routes.
 * Never calls /demo/* (those routes may reseed or reset a tenant).
 */
export async function loadMorgenrot(): Promise<MorgenrotState> {
  let session: Record<string, unknown> | null;
  try {
    session = await coreGet('/v3/auth/session', { throwAuthErrors: true });
  } catch (error) {
    if (unreachable(error)) return { kind: 'offline' };
    return { kind: 'login', signedInElsewhere: false };
  }
  if (session === null) return { kind: 'offline' };
  const tenant = String(session.tenant_id ?? '');
  if (!tenant) return { kind: 'login', signedInElsewhere: false };
  if (tenant !== MORGENROT.tenantId) return { kind: 'login', signedInElsewhere: true };

  const query = `?company_id=${encodeURIComponent(MORGENROT.companyId)}`;
  try {
    const [rawToday, rawTree] = await Promise.all([
      coreGet(`/v3/today${query}`, { throwAuthErrors: true }),
      coreGet(`/v3/tree${query}`, { throwAuthErrors: true }),
    ]);
    if (rawToday === null || rawTree === null) return { kind: 'offline' };
    const snapshot = parseTodaySnapshot(rawToday);
    const userId = String(session.user_id ?? '');
    // A snapshot for another company or person is never shown as Morgenrot.
    if (!snapshot || !snapshotMatchesTodayContext(snapshot, MORGENROT.companyId, userId || null)) return { kind: 'forbidden' };
    const departments = (Array.isArray(rawTree?.departments) ? rawTree.departments : [])
      .filter((d: any) => d && d.id && d.name)
      .map((d: any) => ({ id: String(d.id), name: String(d.name) }));
    const name = typeof session.full_name === 'string' && session.full_name.trim() ? session.full_name.trim() : null;
    return {
      kind: 'online',
      viewer: { userId, name, role: String(session.role ?? 'member') },
      snapshot,
      departments,
    };
  } catch (error) {
    if (unreachable(error)) return { kind: 'offline' };
    if (error instanceof CoreError && error.status === 401) return { kind: 'login', signedInElsewhere: false };
    return { kind: 'forbidden' };
  }
}
