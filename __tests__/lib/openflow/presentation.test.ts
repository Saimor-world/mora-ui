import type {
  OpenFlowSignal,
  InitiativeSummary,
  ConnectorStatus,
  OpenFlowRun,
} from '@/lib/openflow/types';

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
