import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IncidentStatusPanel } from '@/components/home/IncidentStatusPanel';
import type { IncidentStatusPanel as IncidentStatusPanelData } from '@/lib/panel/types';

const panel = (overrides: Partial<IncidentStatusPanelData> = {}): IncidentStatusPanelData => ({
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
  ...overrides,
});

describe('IncidentStatusPanel', () => {
  it('renders a verified incident_status panel from Nightwatch evidence', () => {
    render(<IncidentStatusPanel panel={panel()} />);

    expect(screen.getByTestId('incident-status-panel')).toBeInTheDocument();
    expect(screen.getByText('Sensor-Signal')).toBeInTheDocument();
    expect(screen.getByText('Domain down')).toBeInTheDocument();
    expect(screen.getByText('HTTP 502')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('does not render missing-evidence panels as verified truth', () => {
    render(<IncidentStatusPanel panel={panel({ evidence: [] })} />);
    expect(screen.queryByTestId('incident-status-panel')).not.toBeInTheDocument();
  });

  it('does not render placeholder panels as normal cards', () => {
    render(<IncidentStatusPanel panel={panel({ state: 'placeholder' })} />);
    expect(screen.queryByTestId('incident-status-panel')).not.toBeInTheDocument();
  });
});
