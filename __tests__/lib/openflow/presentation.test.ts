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
} from '@/lib/openflow/presentation';

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
});
