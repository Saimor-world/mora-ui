import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OpenFlowLagebild } from '@/components/home/OpenFlowLagebild';
import type { OpenFlowLagebild as Lagebild } from '@/lib/openflow/types';

const view: Lagebild = {
  headline: null,
  changed: [
    {
      id: 'sig-mail-1',
      source: 'mail',
      title: 'Launch Termin?',
      summary: 'kunde@example.com - Wann geht die Website live?',
      priority: 'high',
      status: 'new',
      trustScope: 'personal',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [{ id: 'reply', label: 'Antwort entwerfen', kind: 'reply', paneType: 'mail' }],
    },
  ],
  attention: [
    {
      id: 'sig-risk-1',
      source: 'os',
      title: 'Owner fehlt',
      summary: 'Website Relaunch braucht eine Entscheidung.',
      priority: 'high',
      status: 'new',
      trustScope: 'organization',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [{ id: 'ask', label: 'MORA fragen', kind: 'ask_user', paneType: 'chat' }],
    },
  ],
  nextSteps: [
    {
      id: 'sig-next-1',
      source: 'os',
      title: 'Entscheidung sichern',
      summary: 'Launch-Termin als Entscheidung anlegen.',
      priority: 'normal',
      status: 'new',
      trustScope: 'organization',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [{ id: 'flow', label: 'Als Flow öffnen', kind: 'open_flow' }],
    },
    {
      id: 'setup-mail',
      source: 'mail',
      title: 'Mail verbinden',
      summary: 'Diese Quelle ist noch nicht belegbar verbunden.',
      priority: 'normal',
      status: 'new',
      trustScope: 'personal',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [
        {
          id: 'mail-connect',
          label: 'Setup prüfen',
          kind: 'connect_source',
          paneType: 'integrations',
          paneData: { focus: 'mail' },
        },
      ],
    },
  ],
  initiatives: [
    {
      id: 'initiative-website-relaunch',
      title: 'Website Relaunch',
      signalCount: 2,
      riskCount: 1,
      decisionCount: 1,
      sourceKinds: ['mail', 'os'],
    },
  ],
  connectors: [
    {
      id: 'mail',
      label: 'Mail',
      source: 'mail',
      status: 'connected',
      detail: 'Postfach ist verbunden.',
      actionLabel: 'Postfach öffnen',
    },
  ],
};

describe('OpenFlowLagebild', () => {
  it('renders the calm OS Lage hierarchy', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.getByText('MÔRA Orientierung')).toBeInTheDocument();
    expect(screen.getByText('Belegte Signale')).toBeInTheDocument();
    expect(screen.getByText('Nächster Schritt')).toBeInTheDocument();
    expect(screen.getByText('Launch Termin?')).toBeInTheDocument();
  });

  it('does not render initiatives as a competing Home column', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.queryByText('Initiativen')).not.toBeInTheDocument();
    expect(screen.queryByText('Website Relaunch')).not.toBeInTheDocument();
    expect(screen.queryByText('2 Signale')).not.toBeInTheDocument();
  });

  it('opens the suggested pane for signal actions', () => {
    const onOpenPane = jest.fn();
    render(<OpenFlowLagebild view={view} onOpenPane={onOpenPane} onGoExplore={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Antwort entwerfen' }));

    expect(onOpenPane).toHaveBeenCalledWith({
      id: 'mail-main',
      type: 'mail',
      title: 'Mail',
      size: { width: 960, height: 680 },
      data: {},
    });
  });

  it('shows the calm hero when there is no headline', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);
    expect(screen.getByText('Alles ruhig')).toBeInTheDocument();
  });

  it('renders the dynamic headline once and not again in the lists below', () => {
    const headlineSignal = view.attention[0];
    const withHeadline: Lagebild = { ...view, headline: headlineSignal };
    render(<OpenFlowLagebild view={withHeadline} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    // Headline title appears exactly once (in the hero, not duplicated in attention list)
    expect(screen.getAllByText('Owner fehlt')).toHaveLength(1);
    // Hero context label present
    expect(screen.getByText(/Jetzt wichtig/)).toBeInTheDocument();
  });

  it('renders verified incident_status panels as contextual attention detail', () => {
    const withIncidentPanel: Lagebild = {
      ...view,
      panels: {
        incidentStatus: [
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
      },
    };

    render(<OpenFlowLagebild view={withIncidentPanel} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.getByTestId('incident-status-panel')).toBeInTheDocument();
    expect(screen.getByText('Domain down')).toBeInTheDocument();
  });

  it('does not render placeholder panels and falls back to empty state if attention is empty', () => {
    const withPlaceholderPanel: Lagebild = {
      ...view,
      attention: [],
      changed: [],
      panels: {
        incidentStatus: [
          {
            id: 'incident-status-n1',
            type: 'incident_status',
            state: 'placeholder',
            source: 'nightwatch',
            source_type: 'nightwatch.incident',
            timestamp: '2026-06-02T10:00:00Z',
            confidence: 'verified',
            reason: 'Resolved incident node exists.',
            evidence: [],
            payload: {
              incident_id: 'n1',
              title: 'Domain down',
              summary: 'HTTP 502',
              severity: 'critical',
              status: 'resolved',
              host: 'saimor.world',
            },
          },
        ],
      },
    };

    render(<OpenFlowLagebild view={withPlaceholderPanel} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.queryByTestId('incident-status-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Domain down')).not.toBeInTheDocument();
    expect(screen.getByText('Keine belegten Signale mit Handlungsdruck.')).toBeInTheDocument();
  });

  it('does not treat evidence-less verified panels as visible attention', () => {
    const withEvidenceLessPanel: Lagebild = {
      ...view,
      attention: [],
      changed: [],
      panels: {
        incidentStatus: [
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
      },
    };

    render(<OpenFlowLagebild view={withEvidenceLessPanel} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.queryByTestId('incident-status-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Domain down')).not.toBeInTheDocument();
    expect(screen.getByText('Keine belegten Signale mit Handlungsdruck.')).toBeInTheDocument();
  });

  it('opens integrations for connector setup prompts without external dashboard language', () => {
    const onOpenPane = jest.fn();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<OpenFlowLagebild view={view} onOpenPane={onOpenPane} onGoExplore={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Setup prüfen' }));

    expect(onOpenPane).toHaveBeenCalledWith({
      id: 'integrations-main',
      type: 'integrations',
      title: 'Integrationen',
      size: { width: 860, height: 680 },
      data: { focus: 'mail' },
    });
    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
