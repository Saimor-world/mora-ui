/**
 * Live planet counts — overlay CORE /v3/universe with the real OS sources
 * that already exist in the app. Never invent numbers.
 *
 * Real vs still mocked is listed in PLANET_SOURCE_TRUTH.
 */
import type { ModelPlanet } from '@/lib/universe/planetModel';
import type { TodaySnapshot } from '@/lib/api/todayClient';

export type PlanetTruth = 'live' | 'model' | 'disconnected';

export type LivePlanetInput = {
  mailCount?: number | null;
  /** Ungelesen aus CORE (today.mail.unread_count) – dieselbe Zahl wie Home und Post. */
  mailUnread?: number | null;
  mailStatus?: 'ok' | 'empty' | 'disconnected' | 'unavailable' | 'loading' | 'idle' | string | null;
  calendarCount?: number | null;
  calendarStatus?: 'ok' | 'empty' | 'disconnected' | 'unavailable' | 'loading' | 'idle' | string | null;
  openTasks?: number | null;
  tasksStatus?: string | null;
  openIncidents?: number | null;
  nightwatchStatus?: string | null;
  docsByCapability?: Record<string, number>;
  feedCount?: number | null;
  tenantCount?: number | null;
  openInvoices?: number | null;
  financeStatus?: string | null;
};

export const PLANET_SOURCE_TRUTH: Record<string, { truth: PlanetTruth; apis: string[]; note: string }> = {
  post: {
    truth: 'live',
    apis: ['GET /v3/mail/messages', 'GET /v3/calendar/events', 'GET /v3/today'],
    note: 'Mails and calendar events from the communication connectors / today snapshot.',
  },
  wache: {
    truth: 'live',
    apis: ['GET /v3/nightwatch/incidents', 'GET /v3/today'],
    note: 'Open incidents from Nightwatch.',
  },
  werkstatt: {
    truth: 'live',
    apis: ['GET /v3/today'],
    note: 'Open tasks from the today snapshot.',
  },
  wissen: {
    truth: 'live',
    apis: ['GET /v3/department-stats', 'GET /v3/universe'],
    note: 'Document counts from department stats / universe model.',
  },
  finanzen: {
    truth: 'model',
    apis: ['GET /v3/universe', 'GET /v3/finance/state (optional)'],
    note: 'Open invoices and 14-day bookings come from CORE universe. Finance state is used when the glance answers.',
  },
  betrieb: {
    truth: 'live',
    apis: ['GET /v3/workspace/billing', 'GET /v3/subscriptions'],
    note: 'Active tenants / subscriptions. Estimated EUR stays on the universe model when present.',
  },
  markt: {
    truth: 'live',
    apis: ['GET /v3/integrations/rss/items'],
    note: 'Feed items when the RSS connector answers; otherwise universe model.',
  },
  rd: {
    truth: 'model',
    apis: ['GET /v3/universe'],
    note: 'No dedicated R&D workflow API yet — CORE universe counts only.',
  },
  domain: {
    truth: 'live',
    apis: ['GET /v3/department-stats', 'GET /v3/tree'],
    note: 'Spaces and documents of a department.',
  },
};

function readable(status?: string | null): boolean {
  if (!status) return false;
  return status === 'ok' || status === 'empty' || status === 'partial' || status === 'stale';
}

function n(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function truthOf(capability: string | undefined, kind?: string): PlanetTruth {
  if (kind === 'domain') return PLANET_SOURCE_TRUTH.domain.truth;
  return PLANET_SOURCE_TRUTH[capability || '']?.truth ?? 'model';
}

/** Overlay live counts onto a CORE planet. Live numbers win only when the source answered. */
export function overlayLivePlanet(planet: ModelPlanet, live: LivePlanetInput): ModelPlanet {
  const cap = planet.capability;
  const counts = { ...(planet.counts || {}) };
  let usedLive = false;

  if (cap === 'post') {
    if (readable(live.mailStatus) && n(live.mailCount) != null) {
      counts.mails = n(live.mailCount)!;
      usedLive = true;
    }
    if (readable(live.mailStatus) && n(live.mailUnread) != null) {
      counts.unread = n(live.mailUnread)!;
      usedLive = true;
    }
    if (readable(live.calendarStatus) && n(live.calendarCount) != null) {
      counts.events = n(live.calendarCount)!;
      usedLive = true;
    }
  }
  if (cap === 'wache' && readable(live.nightwatchStatus) && n(live.openIncidents) != null) {
    counts.open_incidents = n(live.openIncidents)!;
    usedLive = true;
  }
  if (cap === 'werkstatt' && readable(live.tasksStatus) && n(live.openTasks) != null) {
    counts.open_tasks = n(live.openTasks)!;
    usedLive = true;
  }
  if (cap === 'wissen' && n(live.docsByCapability?.wissen) != null) {
    counts.docs = n(live.docsByCapability?.wissen)!;
    usedLive = true;
  }
  if (cap === 'finanzen' && readable(live.financeStatus) && n(live.openInvoices) != null) {
    counts.open_invoices = n(live.openInvoices)!;
    usedLive = true;
  }
  if (cap === 'betrieb' && n(live.tenantCount) != null) {
    counts.tenants = n(live.tenantCount)!;
    usedLive = true;
  }
  if (cap === 'markt' && n(live.feedCount) != null) {
    counts.feeds = n(live.feedCount)!;
    usedLive = true;
  }
  if (planet.kind === 'domain' && n(live.docsByCapability?.[planet.key]) != null) {
    counts.docs = n(live.docsByCapability?.[planet.key])!;
    usedLive = true;
  }

  const listed = PLANET_SOURCE_TRUTH[cap || (planet.kind === 'domain' ? 'domain' : '')];
  const disconnected = cap === 'post' && (live.mailStatus === 'unavailable' || live.mailStatus === 'disconnected');
  const truth: PlanetTruth = disconnected ? 'disconnected' : usedLive ? 'live' : (listed?.truth ?? 'model');

  return { ...planet, counts, sources: [
    ...(planet.sources || []),
    { type: 'overlay', status: truth, label: truth },
  ] };
}

/**
 * Collect only real totals from sources that answered. Preview samples (mail or
 * feed previews) and failed reads are never turned into counts; a missing value
 * keeps the CORE /v3/universe number on the planet.
 */
export function buildLivePlanetInput({
  today,
  mailStatus,
  activeTenants,
  metrics,
}: {
  today: TodaySnapshot | null | undefined;
  mailStatus?: string | null;
  activeTenants?: number | null;
  metrics?: Record<string, { nodes: number; source: string }>;
}): LivePlanetInput {
  return {
    // Nur die Server-Zahl (total/unread_count). Die Stichprobe inbox_loaded ist nie eine Gesamtzahl.
    mailCount: typeof today?.mail.total === 'number' ? today.mail.total : null,
    mailUnread: typeof today?.mail.unread_count === 'number' ? today.mail.unread_count : null,
    mailStatus: today?.mail.status ?? (mailStatus === 'unavailable' ? 'unavailable' : null),
    calendarCount: today?.calendar.count ?? null,
    calendarStatus: today?.calendar.status ?? null,
    openTasks: today?.tasks.counts.open ?? null,
    tasksStatus: today?.tasks.status ?? null,
    // Without a Today snapshot there is no verified incident read: no "0 open" all-clear.
    openIncidents: today?.nightwatch.open_incidents ?? null,
    nightwatchStatus: today?.nightwatch.status ?? null,
    tenantCount: activeTenants || null,
    docsByCapability: Object.fromEntries(
      Object.entries(metrics || {})
        .filter(([, metric]) => metric.source === 'live')
        .map(([id, metric]) => [id, metric.nodes]),
    ),
  };
}

export function overlayUniversePlanets(planets: ModelPlanet[], live: LivePlanetInput): ModelPlanet[] {
  return planets.map((p) => overlayLivePlanet(p, live));
}

export function overlayTruth(planet: ModelPlanet | null | undefined): PlanetTruth {
  const hit = (planet?.sources || []).find((s) => s.type === 'overlay');
  if (hit?.status === 'live' || hit?.status === 'model' || hit?.status === 'disconnected') return hit.status;
  return truthOf(planet?.capability, planet?.kind);
}
