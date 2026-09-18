'use client';

import { coreRequest, CoreError } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { ContinuityPanel, type ContinuityRequest } from './ContinuityPanel';

async function call(path: string, body?: object): Promise<unknown> {
  try {
    const result = await coreRequest(path, { method: body ? 'POST' : 'GET', body, throwAuthErrors: true });
    if (!result) throw new Error('Kalender-Fäden sind nicht verfügbar.');
    return typeof result === 'object' && 'data' in result ? result.data : result;
  } catch (error) {
    if (error instanceof CoreError && error.status === 409) {
      throw new Error('Der Vorschlag hat sich geändert. Bitte Kalender erneut prüfen.');
    }
    throw new Error('Kalender-Fäden sind nicht verfügbar. Prüfe Anmeldung und Kalenderverbindung.');
  }
}

const request: ContinuityRequest = async (operation, body) => {
  if (operation === 'list') return call('/v3/continuity/threads');
  if (operation === 'scan') {
    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await call(`/v1/calendar/fabric/sync?start_date=${start}&end_date=${end}`, {});
    return call('/v3/continuity/calendar/scan', {});
  }
  if (!body) throw new Error('Vorschlag fehlt.');
  return call(`/v3/continuity/threads/${encodeURIComponent(body.id)}/approve`, { proposal_hash: body.proposal_hash });
};

export function CalendarContinuity() {
  const user = useSessionStore(state => state.user);
  const generation = useSessionStore(state => state.sessionGeneration);
  if (!user) return null;
  return <div className="mt-6 rounded-2xl border border-white/10 p-4 text-sm text-white/75 [&_button]:m-1 [&_button]:rounded-lg [&_button]:border [&_button]:border-white/20 [&_button]:px-3 [&_button]:py-2 [&_p]:my-2 [&_article]:mt-4">
    <ContinuityPanel key={`${user.tenant_id}:${user.id}:${generation}`} request={request} />
  </div>;
}
