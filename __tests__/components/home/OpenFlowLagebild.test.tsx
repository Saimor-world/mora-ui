import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OpenFlowLagebild } from '@/components/home/OpenFlowLagebild';
import type { OpenFlowLagebild as Lagebild } from '@/lib/openflow/types';

const view: Lagebild = {
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
      suggestedActions: [{ id: 'flow', label: 'Als Flow oeffnen', kind: 'open_flow' }],
    },
    {
      id: 'setup-mail',
      source: 'mail',
      title: 'Mail verbinden',
      summary: 'Mail ist noch nicht verbunden.',
      priority: 'high',
      status: 'new',
      trustScope: 'personal',
      relatedNodeIds: [],
      relatedRelationIds: [],
      suggestedActions: [
        {
          id: 'mail-connect',
          label: 'Mail verbinden',
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
      actionLabel: 'Postfach oeffnen',
    },
  ],
};

describe('OpenFlowLagebild', () => {
  it('renders the three OS questions', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.getByText('Was hat sich veraendert?')).toBeInTheDocument();
    expect(screen.getByText('Was braucht Aufmerksamkeit?')).toBeInTheDocument();
    expect(screen.getByText('Naechster sinnvoller Schritt')).toBeInTheDocument();
    expect(screen.getByText('Launch Termin?')).toBeInTheDocument();
  });

  it('renders initiatives as gravity centers', () => {
    render(<OpenFlowLagebild view={view} onOpenPane={jest.fn()} onGoExplore={jest.fn()} />);

    expect(screen.getByText('Initiativen')).toBeInTheDocument();
    expect(screen.getByText('Website Relaunch')).toBeInTheDocument();
    expect(screen.getByText('2 Signale')).toBeInTheDocument();
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

  it('opens integrations for connector setup prompts', () => {
    const onOpenPane = jest.fn();
    render(<OpenFlowLagebild view={view} onOpenPane={onOpenPane} onGoExplore={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mail verbinden' }));

    expect(onOpenPane).toHaveBeenCalledWith({
      id: 'integrations-main',
      type: 'integrations',
      title: 'Integrationen',
      size: { width: 860, height: 680 },
      data: { focus: 'mail' },
    });
  });
});
