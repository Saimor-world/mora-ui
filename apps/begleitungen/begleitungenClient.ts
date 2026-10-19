/**
 * Begleitungen API Client
 *
 * Connects to saimor-core endpoints for client journeys.
 * Falls back to local demo data when backend is unavailable (dev mode).
 *
 * OPEN POINTS (Backend Endpoints Needed):
 * - GET  /v3/begleitungen/overview     → BegleitungenOverview
 * - GET  /v3/begleitungen/:id          → Begleitung + Klientin + Sessions
 * - POST /v3/begleitungen              → Create Begleitung
 * - PATCH /v3/begleitungen/:id         → Update Begleitung
 * - GET  /v3/begleitungen/:id/sessions → BegleitungSession[]
 * - POST /v3/begleitungen/:id/sessions → Create Session
 * - PATCH /v3/begleitungen/sessions/:id → Update Session
 * - POST /v3/begleitungen/sessions/:id/summarize → Generate Mora summary
 */

import { coreGet, corePost, corePatch } from '@/lib/api/coreClient';
import type {
  Angebot,
  Begleitung,
  BegleitungDatei,
  BegleitungenOverview,
  BegleitungSession,
  Klientin,
  KlientinMitAttention,
  SessionSummaryRequest,
  SessionSummaryResponse,
} from './types';
import { generateDemoData, getDemoBegleitungDetail } from './demoData';

const IS_DEV = process.env.NODE_ENV === 'development';
const USE_DEMO_FALLBACK = process.env.NEXT_PUBLIC_BEGLEITUNGEN_DEMO !== 'false';

let cachedDemoData: BegleitungenOverview | null = null;

function getDemoOverview(): BegleitungenOverview {
  if (!cachedDemoData) {
    cachedDemoData = generateDemoData();
  }
  return cachedDemoData;
}

export async function fetchBegleitungenOverview(): Promise<BegleitungenOverview | null> {
  try {
    const data = await coreGet('/v3/begleitungen/overview', { isOptional: true });
    if (data && typeof data === 'object' && 'klientinnen' in data) {
      return data as BegleitungenOverview;
    }
  } catch (error) {
    console.warn('[Begleitungen] Overview fetch failed:', error);
  }

  if (IS_DEV && USE_DEMO_FALLBACK) {
    console.info('[Begleitungen] Using demo fallback data');
    return getDemoOverview();
  }

  return null;
}

export interface BegleitungDetail {
  begleitung: Begleitung;
  klientin: Klientin;
  angebot: Angebot;
  sessions: BegleitungSession[];
  dateien: BegleitungDatei[];
}

export async function fetchBegleitungDetail(begleitungId: string): Promise<BegleitungDetail | null> {
  try {
    const data = await coreGet(`/v3/begleitungen/${encodeURIComponent(begleitungId)}`, { isOptional: true });
    if (data && typeof data === 'object' && 'begleitung' in data) {
      return data as BegleitungDetail;
    }
  } catch (error) {
    console.warn('[Begleitungen] Detail fetch failed:', error);
  }

  if (IS_DEV && USE_DEMO_FALLBACK) {
    return getDemoBegleitungDetail(begleitungId);
  }

  return null;
}

export async function createSession(
  begleitungId: string,
  datum: string,
  notizen?: string
): Promise<BegleitungSession | null> {
  try {
    const data = await corePost(`/v3/begleitungen/${encodeURIComponent(begleitungId)}/sessions`, {
      datum,
      status: 'geplant',
      rohNotizen: notizen,
    });
    if (data && typeof data === 'object' && 'id' in data) {
      return data as BegleitungSession;
    }
  } catch (error) {
    console.warn('[Begleitungen] Session creation failed:', error);
  }
  return null;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<BegleitungSession, 'status' | 'rohNotizen' | 'zusammenfassung' | 'naechsteSchritte'>>
): Promise<BegleitungSession | null> {
  try {
    const data = await corePatch(`/v3/begleitungen/sessions/${encodeURIComponent(sessionId)}`, updates);
    if (data && typeof data === 'object' && 'id' in data) {
      return data as BegleitungSession;
    }
  } catch (error) {
    console.warn('[Begleitungen] Session update failed:', error);
  }
  return null;
}

export async function generateSessionSummary(
  request: SessionSummaryRequest
): Promise<SessionSummaryResponse | null> {
  try {
    const data = await corePost('/v3/begleitungen/summarize', request);
    if (data && typeof data === 'object' && 'zusammenfassung' in data) {
      return data as SessionSummaryResponse;
    }
  } catch (error) {
    console.warn('[Begleitungen] Summary generation failed:', error);
  }
  return null;
}

export function computeAttentionSignals(klientinnen: KlientinMitAttention[]): KlientinMitAttention[] {
  const now = new Date();
  const vierzehnTageMs = 14 * 24 * 60 * 60 * 1000;
  const siebenTageMs = 7 * 24 * 60 * 60 * 1000;

  return klientinnen.map((k) => {
    if (k.begleitung.status !== 'aktiv') {
      return k;
    }

    const letzteSessionDatum = k.letzteSession?.datum ? new Date(k.letzteSession.datum) : null;
    const endDatum = k.begleitung.endDatum ? new Date(k.begleitung.endDatum) : null;

    if (letzteSessionDatum) {
      const tageSeitLetzter = Math.floor((now.getTime() - letzteSessionDatum.getTime()) / (24 * 60 * 60 * 1000));
      if (now.getTime() - letzteSessionDatum.getTime() > vierzehnTageMs) {
        return {
          ...k,
          attention: {
            typ: 'keine_session',
            nachricht: `Keine Session seit ${tageSeitLetzter} Tagen`,
            dringlichkeit: tageSeitLetzter > 21 ? 'hoch' : 'mittel',
            tage: tageSeitLetzter,
          },
        };
      }
    }

    if (endDatum) {
      const tageVerbleibend = Math.floor((endDatum.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (tageVerbleibend <= 14 && tageVerbleibend > 0) {
        return {
          ...k,
          attention: {
            typ: 'endet_bald',
            nachricht: `Mentoring endet in ${tageVerbleibend} Tagen`,
            dringlichkeit: tageVerbleibend <= 7 ? 'mittel' : 'niedrig',
            tage: tageVerbleibend,
          },
        };
      } else if (tageVerbleibend <= 0) {
        return {
          ...k,
          attention: {
            typ: 'ueberfallig',
            nachricht: 'Mentoring-Zeitraum überschritten',
            dringlichkeit: 'hoch',
            tage: Math.abs(tageVerbleibend),
          },
        };
      }
    }

    return k;
  });
}

export function filterNeedsAttention(klientinnen: KlientinMitAttention[]): KlientinMitAttention[] {
  return klientinnen.filter((k) => k.attention !== undefined);
}
