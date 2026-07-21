import type {
  ConnectorHealth,
  ConnectorStatus,
  OpenFlowLagebild as OpenFlowLagebildType,
  InitiativeSummary,
  OpenFlowSignal,
  OpenFlowSourceKind,
} from '@/lib/openflow/types';
import type { IncidentStatusPanel } from '@/lib/panel/types';
import { priorityFromSeverity } from '@/lib/ui/status';
import type { HomeStatus } from '@/lib/queries/useHomeView';
import { ESTATE_LABELS } from '@/lib/estate';

/** Decorative backend placeholders — never show OpenClaw/Larry product copy in UI. */
export const LEGACY_SETUP_PLACEHOLDER_LABELS = [
  'Mail für OpenClaw vorbereiten',
  'Mail fuer OpenClaw vorbereiten',
  'Kalender für OpenClaw vorbereiten',
  'Kalender fuer OpenClaw vorbereiten',
  'OpenClaw Infrastruktur',
  'Larry Dashboard',
] as const;

export const RUNTIME_INFRASTRUCTURE_PLACEHOLDER_LABELS = [
  'OpenClaw Infrastruktur',
  'Runtime-Infrastruktur',
  ESTATE_LABELS.desk,
  'Larry Dashboard',
] as const;

export function isLegacySetupPlaceholder(label: string): boolean {
  return (LEGACY_SETUP_PLACEHOLDER_LABELS as readonly string[]).includes(label);
}

export function isRuntimeInfrastructurePlaceholder(label: string): boolean {
  return (RUNTIME_INFRASTRUCTURE_PLACEHOLDER_LABELS as readonly string[]).includes(label);
}

export function isDeskEntryPlaceholder(label: string): boolean {
  return label === ESTATE_LABELS.desk || label === 'Larry Dashboard';
}

interface MailPreviewItem {
  id: string;
  subject: string;
  from: string;
  snippet?: string;
  date?: string;
}

interface CalendarPreviewItem {
  id: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
}

interface FeedPreviewItem {
  id: string;
  sourceTitle: string;
  title: string;
  summary?: string;
  published?: string;
}

interface CloudPreviewItem {
  connectorId: string;
  connectorLabel: string;
  provider: string;
  itemId: string;
  itemName: string;
  itemKind: string;
  itemPath?: string;
}

interface CommunicationSummaryLike {
  mailConfigured?: boolean;
  calendarConfigured?: boolean;
  browserPermission?: string;
  mailStatusLabel?: string;
  calendarStatusLabel?: string;
  browserStatusLabel?: string;
  localTruthStatusLabel?: string;
  mailStatusDetail?: string;
  calendarStatusDetail?: string;
}

interface HomeViewLike {
  changes?: Array<{
    id: string | number;
    title: string;
    scope?: string | null;
    occurred_at?: string;
    severity?: number | null;
  }>;
  attention?: Array<{
    id: string | number;
    title: string;
    category?: string;
    scope?: string | null;
    severity?: number | null;
  }>;
  next_steps?: Array<{ id: string; title: string; source?: string }>;
}

interface BuildOpenFlowLagebildInput {
  mailPreview: MailPreviewItem[];
  calendarPreview: CalendarPreviewItem[];
  feedPreview: FeedPreviewItem[];
  cloudPreview: CloudPreviewItem[];
  homeView: HomeViewLike | null;
  communicationSummary: CommunicationSummaryLike;
  /** Real Nightwatch incidents (already-mapped OpenFlow signals) to surface as attention. */
  nightwatchSignals?: OpenFlowSignal[];
  /** Evidence-bound panel payloads derived from real Nightwatch incidents. */
  incidentStatusPanels?: IncidentStatusPanel[];
  homeStatus?: HomeStatus | null;
}

const INITIATIVE_PATTERNS = [
  { id: 'initiative-website-relaunch', title: 'Website Relaunch', match: /website|relaunch|launch/i },
  { id: 'initiative-ki-einführung', title: 'KI Einführung', match: /\bki\b|\bai\b|artificial intelligence|automation|agent/i },
  { id: 'initiative-security-check', title: 'Security Check', match: /security|audit|ssl|risk|risiko/i },
  { id: 'initiative-kundenprojekt', title: 'Kundenprojekt', match: /kunde|customer|client|projekt/i },
];

function buildSignalId(prefix: string, value: string | number) {
  return `${prefix}-${String(value).replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}`;
}

function cleanTitle(value: string | null | undefined, fallback: string): string {
  const title = (value || '').trim();
  return title || fallback;
}

function inferInitiativeId(title: string): string | undefined {
  return INITIATIVE_PATTERNS.find((pattern) => pattern.match.test(title))?.id;
}

function signal(
  input: Omit<OpenFlowSignal, 'relatedNodeIds' | 'relatedRelationIds' | 'suggestedActions'> &
    Partial<Pick<OpenFlowSignal, 'relatedNodeIds' | 'relatedRelationIds' | 'suggestedActions'>>
): OpenFlowSignal {
  return {
    relatedNodeIds: [],
    relatedRelationIds: [],
    suggestedActions: [],
    ...input,
  };
}

function uniqueSourceKinds(values: OpenFlowSourceKind[]): OpenFlowSourceKind[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function uniqueSignalsById(signals: OpenFlowSignal[]): OpenFlowSignal[] {
  const seen = new Set<string>();

  return signals.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function isRenderableIncidentStatusPanel(panel: IncidentStatusPanel): boolean {
  return Boolean(
    panel.type === 'incident_status'
    && panel.state === 'verified'
    && panel.source === 'nightwatch'
    && panel.source_type === 'nightwatch.incident'
    && panel.payload?.incident_id
    && panel.evidence?.length
    && panel.evidence.every((item) => item.source && item.source_type && item.reason)
  );
}

const PRIORITY_RANK: Record<OpenFlowSignal['priority'], number> = {
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0,
};

/**
 * Pick the single most important signal — the dynamic Home headline.
 * Operator-first: attention (open friction / incidents) outranks mere changes;
 * within that, higher priority and more recent wins. Returns null for the calm
 * state (nothing but low-priority noise), so Home can say "Alles ruhig".
 */
export function selectHeadline(
  attention: OpenFlowSignal[],
  changed: OpenFlowSignal[],
): OpenFlowSignal | null {
  const score = (s: OpenFlowSignal, attentionBoost: number) =>
    PRIORITY_RANK[s.priority] * 10 + attentionBoost;

  const pool = [
    ...attention.map((s) => ({ s, w: score(s, 5) })),
    ...changed.map((s) => ({ s, w: score(s, 0) })),
  ];
  if (pool.length === 0) return null;

  pool.sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w;
    return String(b.s.occurredAt || '').localeCompare(String(a.s.occurredAt || ''));
  });

  const top = pool[0].s;
  // Purely low-priority noise → stay calm, no headline.
  if (PRIORITY_RANK[top.priority] === 0) return null;
  return top;
}

export function deriveInitiativesFromSignals(signals: OpenFlowSignal[]): InitiativeSummary[] {
  const buckets = new Map<string, InitiativeSummary>();

  signals.forEach((item) => {
    const pattern =
      INITIATIVE_PATTERNS.find((entry) => entry.id === item.relatedInitiativeId) ??
      INITIATIVE_PATTERNS.find((entry) => entry.match.test(`${item.title} ${item.summary}`));
    if (!pattern) return;

    const existing = buckets.get(pattern.id);
    if (!existing) {
      buckets.set(pattern.id, {
        id: pattern.id,
        title: pattern.title,
        signalCount: 1,
        riskCount: item.priority === 'high' || item.priority === 'urgent' ? 1 : 0,
        decisionCount: /decision|entscheidung|termin|owner/i.test(`${item.title} ${item.summary}`) ? 1 : 0,
        sourceKinds: [item.source],
        updatedAt: item.occurredAt,
      });
      return;
    }

    existing.signalCount += 1;
    existing.riskCount += item.priority === 'high' || item.priority === 'urgent' ? 1 : 0;
    existing.decisionCount += /decision|entscheidung|termin|owner/i.test(`${item.title} ${item.summary}`) ? 1 : 0;
    existing.sourceKinds = uniqueSourceKinds([...existing.sourceKinds, item.source]);
    existing.updatedAt = item.occurredAt || existing.updatedAt;
  });

  return Array.from(buckets.values()).sort((a, b) => b.signalCount - a.signalCount);
}

export function buildConnectorStatuses(summary: CommunicationSummaryLike): ConnectorStatus[] {
  const browserStatus: ConnectorHealth =
    summary.browserPermission === 'granted'
      ? 'connected'
      : summary.browserPermission === 'denied'
        ? 'degraded'
        : 'needs_setup';

  const localTruthStatus: ConnectorHealth =
    /bereit/i.test(summary.localTruthStatusLabel || '')
      ? 'connected'
      : /lokal/i.test(summary.localTruthStatusLabel || '')
        ? 'local'
        : 'offline';

  return [
    {
      id: 'mail',
      label: 'Mail',
      source: 'mail',
      status: summary.mailConfigured ? 'connected' : 'needs_setup',
      detail: summary.mailStatusDetail || summary.mailStatusLabel || 'Mail ist noch nicht verbunden.',
      actionLabel: summary.mailConfigured ? 'Postfach öffnen' : 'Mail verbinden',
    },
    {
      id: 'calendar',
      label: 'Kalender',
      source: 'calendar',
      status: summary.calendarConfigured ? 'connected' : 'needs_setup',
      detail: summary.calendarStatusDetail || summary.calendarStatusLabel || 'Kalender ist noch nicht verbunden.',
      actionLabel: summary.calendarConfigured ? 'Kalender öffnen' : 'Kalender verbinden',
    },
    {
      id: 'browser',
      label: 'Browser',
      source: 'os',
      status: browserStatus,
      detail: summary.browserStatusLabel || 'Browser-Signale sind noch nicht freigegeben.',
      actionLabel: browserStatus === 'connected' ? 'Bereit' : 'Freigeben',
    },
    {
      id: 'local-truth',
      label: 'Local Truth',
      source: 'os',
      status: localTruthStatus,
      detail: summary.localTruthStatusLabel || 'Desktop Bridge ist nicht verbunden.',
      actionLabel: localTruthStatus === 'offline' ? 'Setup prüfen' : 'Oeffnen',
    },
  ];
}

function buildConnectorSetupSignals(connectors: ConnectorStatus[]): OpenFlowSignal[] {
  return connectors
    .filter((connector) => connector.status === 'needs_setup' || connector.status === 'offline' || connector.status === 'degraded')
    .slice(0, 2)
    .map((connector) =>
      signal({
        id: `setup-${connector.id}`,
        source: connector.source,
        title: `${connector.label} verbinden`,
        summary: 'Diese Quelle ist noch nicht belegbar verbunden.',
        priority: 'normal',
        status: 'new',
        trustScope: 'personal',
        suggestedActions: [
          {
            id: `${connector.id}-connect`,
            label: 'Setup prüfen',
            kind: 'connect_source',
            paneType: 'integrations',
            paneData: { focus: connector.id },
          },
        ],
      })
    );
}

function hiddenPlaceholderLabels(homeStatus: HomeStatus | null | undefined): string[] {
  return (homeStatus?.placeholders_detected || [])
    .map((item) => item.label)
    .filter((label) => !isLegacySetupPlaceholder(label));
}

function hasUnknown(homeStatus: HomeStatus | null | undefined, id: string): boolean {
  return Boolean(
    homeStatus?.unknowns?.some((item) => item.id === id)
    || homeStatus?.home_cards?.unknown?.some((item) => item.id === id)
  );
}

export function buildOpenFlowLagebild(input: BuildOpenFlowLagebildInput): OpenFlowLagebildType {
  const connectors = buildConnectorStatuses(input.communicationSummary);
  const hiddenPlaceholders = hiddenPlaceholderLabels(input.homeStatus);
  const setupSignals = buildConnectorSetupSignals(connectors);

  const homeChanges = (input.homeView?.changes || []).map((item) => {
    const title = cleanTitle(item.title, 'Tageslage aktualisiert');

    return signal({
      id: buildSignalId('home-change', item.id),
      source: 'os',
      title,
      summary: item.scope || 'Aenderung im Organisationskontext.',
      priority: priorityFromSeverity(item.severity),
      status: 'new',
      trustScope: 'organization',
      occurredAt: item.occurred_at,
      relatedInitiativeId: inferInitiativeId(`${title} ${item.scope || ''}`),
    });
  });

  const mailSignals = input.mailPreview.map((item) =>
    signal({
      id: buildSignalId('mail', item.id),
      source: 'mail',
      title: item.subject || 'Neue Mail',
      summary: [item.from, item.snippet].filter(Boolean).join(' - '),
      priority: /dringend|urgent|termin|deadline|launch|problem|risiko/i.test(`${item.subject} ${item.snippet}`)
        ? 'high'
        : 'normal',
      status: 'new',
      trustScope: 'personal',
      occurredAt: item.date,
      relatedInitiativeId: inferInitiativeId(`${item.subject} ${item.snippet || ''}`),
      suggestedActions: [
        { id: `${item.id}-reply`, label: 'Antwort entwerfen', kind: 'reply', paneType: 'mail', paneData: { messageId: item.id } },
        { id: `${item.id}-flow`, label: 'Als Flow öffnen', kind: 'open_flow' },
      ],
    })
  );

  const calendarSignals = input.calendarPreview.map((item) =>
    signal({
      id: buildSignalId('calendar', item.id),
      source: 'calendar',
      title: item.title || 'Termin',
      summary: [item.date, item.time, item.location].filter(Boolean).join(' - '),
      priority: 'normal',
      status: 'new',
      trustScope: 'personal',
      occurredAt: item.date,
      relatedInitiativeId: inferInitiativeId(item.title || ''),
      suggestedActions: [{ id: `${item.id}-open-calendar`, label: 'Kalender öffnen', kind: 'open_pane', paneType: 'calendar' }],
    })
  );

  const feedSignals = input.feedPreview.map((item) =>
    signal({
      id: buildSignalId('feed', item.id),
      source: 'feed',
      title: item.title || 'Feed-Signal',
      summary: [item.sourceTitle, item.summary].filter(Boolean).join(' - '),
      priority: 'low',
      status: 'new',
      trustScope: 'personal',
      occurredAt: item.published,
      relatedInitiativeId: inferInitiativeId(`${item.title} ${item.summary || ''}`),
    })
  );

  const cloudSignals = input.cloudPreview.map((item) =>
    signal({
      id: buildSignalId('cloud', `${item.connectorId}-${item.itemId}`),
      source: 'cloud',
      title: item.itemName,
      summary: [item.connectorLabel, item.itemPath].filter(Boolean).join(' - '),
      priority: /briefing|vertrag|contract|proposal|angebot/i.test(item.itemName) ? 'normal' : 'low',
      status: 'linked',
      trustScope: 'personal',
      relatedInitiativeId: inferInitiativeId(`${item.itemName} ${item.itemPath || ''}`),
      suggestedActions: [{ id: `${item.itemId}-open-cloud`, label: 'Quelle prüfen', kind: 'open_pane', paneType: 'meine-dateien' }],
    })
  );

  const homeAttention = (input.homeView?.attention || []).map((item) => {
    const title = cleanTitle(item.title, 'Aufmerksamkeit erforderlich');

    return signal({
      id: buildSignalId('home-attention', item.id),
      source: 'os',
      title,
      summary: item.scope || item.category || 'Braucht Aufmerksamkeit.',
      priority: priorityFromSeverity(item.severity),
      status: 'new',
      trustScope: 'organization',
      relatedInitiativeId: inferInitiativeId(`${title} ${item.scope || ''}`),
      suggestedActions: [{ id: `${item.id}-ask`, label: 'MORA fragen', kind: 'ask_user', paneType: 'chat' }],
    });
  });

  const homeNextSteps = (input.homeView?.next_steps || []).map((item) => {
    const title = cleanTitle(item.title, 'Nächsten Schritt prüfen');

    return signal({
      id: buildSignalId('home-next', item.id),
      source: 'os',
      title,
      summary: item.source || 'Vorgeschlagener nächster Schritt.',
      priority: 'normal',
      status: 'new',
      trustScope: 'organization',
      relatedInitiativeId: inferInitiativeId(`${title} ${item.source || ''}`),
      suggestedActions: [{ id: `${item.id}-open`, label: 'Oeffnen', kind: 'open_flow' }],
    });
  });

  const verifiedIncidentIds = new Set(
    (input.incidentStatusPanels || [])
      .filter(isRenderableIncidentStatusPanel)
      .map((panel) => panel.payload.incident_id)
  );

  const nightwatchSignals = (input.nightwatchSignals || []).filter((sig) => {
    if (sig.id.startsWith('nightwatch-')) {
      const incidentId = sig.id.slice('nightwatch-'.length);
      return !verifiedIncidentIds.has(incidentId);
    }
    return true;
  });
  const allChanged = [...homeChanges, ...mailSignals, ...calendarSignals, ...feedSignals, ...cloudSignals];
  // Real infrastructure incidents lead "changed" + "attention" (not "nextSteps").
  const changed = uniqueSignalsById([...nightwatchSignals, ...allChanged]).slice(0, 8);
  const attention = uniqueSignalsById([...nightwatchSignals, ...homeAttention, ...allChanged.filter((item) => item.priority === 'urgent' || item.priority === 'high')]).slice(0, 5);
  const visibleSetupSignals = input.homeStatus
    ? []
    : setupSignals.filter((item) => !hiddenPlaceholders.includes(item.title));
  const nextSteps = [...homeNextSteps, ...visibleSetupSignals, ...allChanged.filter((item) => item.suggestedActions.length > 0)].slice(0, 5);
  const initiativeSignals = uniqueSignalsById([...changed, ...attention, ...nextSteps]);

  return {
    headline: selectHeadline(attention, changed),
    changed,
    attention,
    nextSteps,
    initiatives: deriveInitiativesFromSignals(initiativeSignals).slice(0, 4),
    connectors,
    panels: {
      incidentStatus: input.incidentStatusPanels ?? [],
    },
    truthState: {
      hiddenPlaceholders,
      nextStepsUnknown: hasUnknown(input.homeStatus, 'next_steps'),
      runtimeUnknown: input.homeStatus?.runtime?.status === 'unknown' || hasUnknown(input.homeStatus, 'runtime_larry_openclaw'),
      connectorHandshakeUnknown: hasUnknown(input.homeStatus, 'connector_handshake'),
    },
  };
}
