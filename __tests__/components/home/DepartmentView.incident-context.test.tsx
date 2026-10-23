import React from 'react';
import { render, screen } from '@testing-library/react';
import { DepartmentView } from '@/components/home/DepartmentView';
import type { IncidentStatusPanel } from '@/lib/panel/types';

const panel = (overrides: Partial<IncidentStatusPanel> = {}): IncidentStatusPanel => ({
  id: 'incident-status-incident-1',
  type: 'incident_status',
  state: 'verified',
  source: 'nightwatch',
  source_type: 'nightwatch.incident',
  timestamp: '2026-06-08T08:00:00Z',
  confidence: 'verified',
  reason: 'Open tenant-scoped Nightwatch incident node exists in CORE.',
  evidence: [
    {
      source: 'nightwatch',
      source_type: 'nightwatch.incident',
      status: 'verified',
      confidence: 'verified',
      reason: 'CORE returned this incident through the tenant-scoped Nightwatch incidents endpoint.',
      timestamp: '2026-06-08T08:00:00Z',
    },
  ],
  payload: {
    incident_id: 'incident-1',
    title: 'Operations incident',
    summary: 'HTTP 502',
    severity: 'critical',
    status: 'open',
    host: 'api.saimor.world',
  },
  ...overrides,
});

function renderDepartmentView(props: Partial<React.ComponentProps<typeof DepartmentView>> = {}) {
  return render(
    <DepartmentView
      departmentName="Operations"
      peers={[]}
      recentDocs={[]}
      suggestions={[]}
      connectors={[]}
      {...props}
    />
  );
}

describe('DepartmentView incident context', () => {
  it('renders evidence-bound department incident panels under the header', () => {
    renderDepartmentView({ incidentPanels: [panel()] });

    expect(screen.getByTestId('department-view-incident-context')).toBeTruthy();
    expect(screen.getByTestId('incident-status-panel')).toBeTruthy();
    expect(screen.getByText('Operations incident')).toBeTruthy();
  });

  it('does not render evidence-less panels', () => {
    renderDepartmentView({ incidentPanels: [panel({ evidence: [] })] });

    expect(screen.queryByTestId('incident-status-panel')).toBeNull();
    expect(screen.queryByTestId('department-view-incident-context')).toBeNull();
  });

  it('shows an honest unscoped incident note without a fake panel', () => {
    renderDepartmentView({ hasUnscopedIncidents: true });

    expect(screen.queryByTestId('incident-status-panel')).toBeNull();
    expect(screen.getByText('Globale Systemsignale vorhanden, aber keinem Bereich belegbar zugeordnet.')).toBeTruthy();
  });
});
