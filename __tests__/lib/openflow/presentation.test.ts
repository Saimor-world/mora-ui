import type {
  OpenFlowSignal,
  InitiativeSummary,
  ConnectorStatus,
  OpenFlowRun,
} from '@/lib/openflow/types';
import {
  buildConnectorStatuses,
  buildOpenFlowLagebild,
  deriveInitiativesFromSignals,
  selectHeadline,
} from '@/lib/openflow/presentation';

function sig(over: Partial<OpenFlowSignal> & Pick<OpenFlowSignal, 'id' | 'priority'>): OpenFlowSignal {
  return {
    source: 'os',
    title: over.id,
    summary: '',
    status: 'new',
    trustScope: 'organization',
    relatedNodeIds: [],
    relatedRelationIds: [],
    suggestedActions: [],
    ...over,
  } as OpenFlowSignal;
}

describe('openflow headline (dynamic Home situation)', () => {
  it('picks the highest-priority attention signal as the headline', () => {
    const head = selectHeadline(
      [sig({ id: 'a-normal', priority: 'normal' }), sig({ id: 'a-urgent', priority: 'urgent' })],
      [sig({ id: 'c-high', priority: 'high' })],
    );
    expect(head?.id).toBe('a-urgent');
  });

  it('prefers attention over a same-priority change', () => {
    const head = selectHeadline(
      [sig({ id: 'a-high', priority: 'high' })],
      [sig({ id: 'c-high', priority: 'high' })],
    );
    expect(head?.id).toBe('a-high');
  });

  it('returns null (calm) when nothing but low-priority noise exists', () => {
    expect(selectHeadline([], [sig({ id: 'c-low', priority: 'low' })])).toBeNull();
    expect(selectHeadline([], [])).toBeNull();
  });

  it('exposes a headline on the built lagebild and null when calm', () => {
    const calm = buildOpenFlowLagebild({
      mailPreview: [], calendarPreview: [], feedPreview: [], cloudPreview: [],
      homeView: null,
      communicationSummary: { mailConfigured: true, calendarConfigured: true, browserPermission: 'granted', localTruthStatusLabel: 'Local Truth bereit' },
    });
    expect(calm.headline).toBeNull();

    const withIncident = buildOpenFlowLagebild({
      mailPreview: [], calendarPreview: [], feedPreview: [], cloudPreview: [],
      homeView: null,
      communicationSummary: { mailConfigured: true, calendarConfigured: true, browserPermission: 'granted', localTruthStatusLabel: 'Local Truth bereit' },
      nightwatchSignals: [sig({ id: 'nw-1', priority: 'high', source: 'server', title: 'api.saimor.world degraded' })],
    });
    expect(withIncident.headline?.id).toBe('nw-1');
  });
});

describe('openflow types', () => {
  it('allows the core OS signal shape used by Home and Dashboard presenters', () => {
    const signal: OpenFlowSignal = {
      id: 'sig-mail-1',
      source: 'mail',
      title: 'Customer asked about launch date',
      summary: 'Related to Website Relaunch. Decision missing.',
      priority: 'high',
      status: 'new',
      trustScope: 'personal',
      occurredAt: '2026-06-01T08:00:00.000Z',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [
        { id: 'reply', label: 'Antwort entwerfen', kind: 'reply' },
      ],
    };

    const initiative: InitiativeSummary = {
      id: 'initiative-website-relaunch',
      title: 'Website Relaunch',
      signalCount: 1,
      riskCount: 0,
      decisionCount: 1,
      sourceKinds: ['mail'],
      updatedAt: signal.occurredAt,
    };

    const connector: ConnectorStatus = {
      id: 'mail',
      label: 'Mail',
      source: 'mail',
      status: 'connected',
      detail: 'Postfach ist verbunden.',
    };

    const run: OpenFlowRun = {
      id: 'flow-1',
      title: 'Mail triage',
      status: 'waiting_for_human',
      currentStepLabel: 'Approve reply',
      relatedSignalIds: [signal.id],
    };

    expect(signal.suggestedActions[0].kind).toBe('reply');
    expect(initiative.sourceKinds).toEqual(['mail']);
    expect(connector.status).toBe('connected');
    expect(run.relatedSignalIds).toEqual(['sig-mail-1']);
  });
});

describe('openflow presentation', () => {
  it('turns communication previews into changed, attention, and next-step signals', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [
        {
          id: 'mail-1',
          from: 'kunde@example.com',
          subject: 'Launch Termin?',
          snippet: 'Wann geht die neue Website live?',
          date: '2026-06-01T08:00:00.000Z',
        },
      ],
      calendarPreview: [
        {
          id: 'cal-1',
          title: 'Launch Sync',
          date: '2026-06-02',
          time: '10:00',
        },
      ],
      feedPreview: [],
      cloudPreview: [
        {
          connectorId: 'drive',
          connectorLabel: 'Drive',
          provider: 'google',
          itemId: 'doc-1',
          itemName: 'Website Briefing.pdf',
          itemKind: 'file',
          itemPath: '/Website',
        },
      ],
      homeView: null,
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        mailStatusLabel: 'Mail verbunden',
        calendarStatusLabel: 'Kalender verbunden',
        browserStatusLabel: 'Browser bereit',
        localTruthStatusLabel: 'Local Truth bereit',
        mailStatusDetail: 'Postfach ist verbunden.',
        calendarStatusDetail: 'Kalender ist verbunden.',
      },
    });

    expect(view.changed.map((item) => item.source)).toEqual(['mail', 'calendar', 'cloud']);
    expect(view.attention[0].priority).toBe('high');
    expect(view.nextSteps[0].suggestedActions[0].kind).toBe('reply');
  });

  it('derives initiatives from signal titles and relation hints without creating a new backend entity', () => {
    const initiatives = deriveInitiativesFromSignals([
      {
        id: 'sig-1',
        source: 'mail',
        title: 'Website Relaunch: Kunde fragt nach Launch Termin',
        summary: 'Termin fehlt.',
        priority: 'high',
        status: 'new',
        trustScope: 'personal',
        relatedNodeIds: [],
        relatedRelationIds: [],
        suggestedActions: [],
      },
      {
        id: 'sig-2',
        source: 'cloud',
        title: 'Website Relaunch Briefing aktualisiert',
        summary: 'Neue Datei.',
        priority: 'normal',
        status: 'linked',
        trustScope: 'personal',
        relatedNodeIds: [],
        relatedRelationIds: [],
        suggestedActions: [],
      },
    ]);

    expect(initiatives).toEqual([
      expect.objectContaining({
        id: 'initiative-website-relaunch',
        title: 'Website Relaunch',
        signalCount: 2,
        sourceKinds: ['mail', 'cloud'],
      }),
    ]);
  });

  it('maps setup state into connector statuses', () => {
    const connectors = buildConnectorStatuses({
      mailConfigured: false,
      calendarConfigured: true,
      browserPermission: 'default',
      mailStatusLabel: 'Mail nicht eingerichtet',
      calendarStatusLabel: 'Kalender verbunden',
      browserStatusLabel: 'Browser freigeben',
      localTruthStatusLabel: 'Desktop Bridge getrennt',
      mailStatusDetail: 'Setze Mail Zugangsdaten.',
      calendarStatusDetail: 'Kalender ist verbunden.',
    });

    expect(connectors).toEqual([
      expect.objectContaining({ id: 'mail', status: 'needs_setup' }),
      expect.objectContaining({ id: 'calendar', status: 'connected' }),
      expect.objectContaining({ id: 'browser', status: 'needs_setup' }),
      expect.objectContaining({ id: 'local-truth', status: 'offline' }),
    ]);
  });

  it('does not derive KI initiatives from words that merely contain ai', () => {
    const initiatives = deriveInitiativesFromSignals([
      {
        id: 'sig-daily-mail',
        source: 'mail',
        title: 'Daily Mail status available',
        summary: 'Routine delivery status.',
        priority: 'normal',
        status: 'new',
        trustScope: 'personal',
        relatedNodeIds: [],
        relatedRelationIds: [],
        suggestedActions: [],
      },
    ]);

    expect(initiatives.map((item) => item.id)).not.toContain('initiative-ki-einfuehrung');
  });

  it('deduplicates signals before deriving initiative counts from lagebild buckets', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [
        {
          id: 'website-mail',
          from: 'kunde@example.com',
          subject: 'Website Relaunch Launch Termin dringend',
          snippet: 'Bitte Termin entscheiden.',
          date: '2026-06-01T08:00:00.000Z',
        },
      ],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: null,
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        localTruthStatusLabel: 'Local Truth bereit',
      },
    });

    expect(view.initiatives).toEqual([
      expect.objectContaining({
        id: 'initiative-website-relaunch',
        signalCount: 1,
        riskCount: 1,
      }),
    ]);
  });

  it('keeps high-priority signals in attention even when they are beyond the changed display limit', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [
        {
          id: 'late-mail',
          from: 'kunde@example.com',
          subject: 'Launch Problem dringend',
          snippet: 'Risiko fuer Website Relaunch.',
          date: '2026-06-01T08:00:00.000Z',
        },
      ],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: {
        changes: Array.from({ length: 8 }, (_, index) => ({
          id: `change-${index}`,
          title: `Routine Aenderung ${index}`,
          scope: 'Betrieb',
          severity: 0.1,
        })),
      },
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        localTruthStatusLabel: 'Local Truth bereit',
      },
    });

    expect(view.changed).toHaveLength(8);
    expect(view.changed.map((item) => item.id)).not.toContain('mail-late-mail');
    expect(view.attention.map((item) => item.id)).toContain('mail-late-mail');
  });

  it('keeps legacy connector setup prompts when no Home status contract is present', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: null,
      communicationSummary: {
        mailConfigured: false,
        calendarConfigured: false,
        browserPermission: 'default',
        mailStatusLabel: 'Mail nicht eingerichtet',
        calendarStatusLabel: 'Kalender nicht eingerichtet',
        browserStatusLabel: 'Browser freigeben',
        localTruthStatusLabel: 'Desktop Bridge getrennt',
      },
    });

    expect(view.nextSteps.map((item) => item.title)).toEqual(
      expect.arrayContaining(['Mail fuer OpenClaw vorbereiten', 'Kalender fuer OpenClaw vorbereiten'])
    );
    expect(view.nextSteps[0].suggestedActions[0]).toEqual(
      expect.objectContaining({ kind: 'connect_source', paneType: 'integrations' })
    );
  });

  it('filters Home status placeholders out of normal next steps', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: null,
      communicationSummary: {
        mailConfigured: false,
        calendarConfigured: false,
        browserPermission: 'default',
        mailStatusLabel: 'Mail nicht eingerichtet',
        calendarStatusLabel: 'Kalender nicht eingerichtet',
        browserStatusLabel: 'Browser freigeben',
        localTruthStatusLabel: 'Desktop Bridge getrennt',
      },
      homeStatus: {
        tenant_id: 'tenant-demo',
        user_role: 'owner',
        company: { id: 'c1', name: 'Simple Coffee Group', is_visitor: false },
        home_truth: { changes: [], attention: [], next_steps: [] },
        runtime: { status: 'unknown', evidence: [] },
        home_cards: {
          verified: [],
          placeholder: [
            { label: 'Mail fuer OpenClaw vorbereiten', reason: 'No backend evidence contract found' },
            { label: 'Kalender fuer OpenClaw vorbereiten', reason: 'No backend evidence contract found' },
          ],
          unknown: [{ id: 'next_steps', reason: 'No tenant-scoped task nodes' }],
        },
        placeholders_detected: [
          { label: 'Mail fuer OpenClaw vorbereiten', reason: 'No backend evidence contract found' },
          { label: 'Kalender fuer OpenClaw vorbereiten', reason: 'No backend evidence contract found' },
        ],
        unknowns: [
          { id: 'runtime_larry_openclaw', reason: 'No CORE evidence contract currently proves runtime state' },
          { id: 'connector_handshake', reason: 'Stored connector config is not a live handshake' },
        ],
      },
    });

    expect(view.nextSteps.map((item) => item.title)).not.toEqual(
      expect.arrayContaining(['Mail fuer OpenClaw vorbereiten', 'Kalender fuer OpenClaw vorbereiten'])
    );
    expect(view.truthState?.nextStepsUnknown).toBe(true);
    expect(view.truthState?.runtimeUnknown).toBe(true);
    expect(view.truthState?.connectorHandshakeUnknown).toBe(true);
  });

  it('carries evidence-bound incident_status panels separately from app surfaces', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: null,
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        localTruthStatusLabel: 'Local Truth bereit',
      },
      incidentStatusPanels: [
        {
          id: 'incident-status-n1',
          type: 'incident_status',
          state: 'verified',
          source: 'nightwatch',
          source_type: 'nightwatch.incident',
          timestamp: '2026-06-02T10:00:00Z',
          confidence: 'verified',
          reason: 'Open tenant-scoped Nightwatch incident node exists in CORE.',
          evidence: [
            {
              source: 'nightwatch',
              source_type: 'nightwatch.incident',
              status: 'verified',
              confidence: 'verified',
              reason: 'CORE returned this incident through the tenant-scoped Nightwatch incidents endpoint.',
              timestamp: '2026-06-02T10:00:00Z',
            },
          ],
          payload: {
            incident_id: 'n1',
            title: 'Domain down',
            summary: 'HTTP 502',
            severity: 'critical',
            status: 'open',
            host: 'saimor.world',
          },
        },
      ],
    });

    expect(view.panels?.incidentStatus).toHaveLength(1);
    expect(view.panels?.incidentStatus[0]).toEqual(expect.objectContaining({
      type: 'incident_status',
      source: 'nightwatch',
      state: 'verified',
    }));
  });

  it('filters out nightwatch signals from the signals pipeline when they appear as verified incident panels', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: null,
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        localTruthStatusLabel: 'Local Truth bereit',
      },
      nightwatchSignals: [
        sig({ id: 'nightwatch-n1', priority: 'high', source: 'server', title: 'Domain down' }),
        sig({ id: 'nightwatch-n2', priority: 'high', source: 'server', title: 'Other down' }),
      ],
      incidentStatusPanels: [
        {
          id: 'incident-status-n1',
          type: 'incident_status',
          state: 'verified',
          source: 'nightwatch',
          source_type: 'nightwatch.incident',
          timestamp: '2026-06-02T10:00:00Z',
          confidence: 'verified',
          reason: 'Open tenant-scoped Nightwatch incident node exists in CORE.',
          evidence: [],
          payload: {
            incident_id: 'n1',
            title: 'Domain down',
            summary: 'HTTP 502',
            severity: 'critical',
            status: 'open',
            host: 'saimor.world',
          },
        },
      ],
    });

    // n1 is rendered as a panel, so it must be removed from changed/attention lists
    expect(view.panels?.incidentStatus).toHaveLength(1);
    expect(view.attention.map((item) => item.id)).not.toContain('nightwatch-n1');
    expect(view.changed.map((item) => item.id)).not.toContain('nightwatch-n1');

    // n2 is NOT rendered as a panel, so it should still be present in the signal list
    expect(view.attention.map((item) => item.id)).toContain('nightwatch-n2');
  });

  it('normalizes empty backend change titles before rendering OS cards', () => {
    const view = buildOpenFlowLagebild({
      mailPreview: [],
      calendarPreview: [],
      feedPreview: [],
      cloudPreview: [],
      homeView: {
        changes: [
          {
            id: 'blank-change',
            title: '',
            scope: 'Aenderung im Organisationskontext.',
            severity: 0.4,
          },
        ],
      },
      communicationSummary: {
        mailConfigured: true,
        calendarConfigured: true,
        browserPermission: 'granted',
        localTruthStatusLabel: 'Local Truth bereit',
      },
    });

    expect(view.changed[0]).toEqual(
      expect.objectContaining({
        id: 'home-change-blank-change',
        title: 'Tageslage aktualisiert',
      })
    );
  });
});
