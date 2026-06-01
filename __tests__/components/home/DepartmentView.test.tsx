import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '@/__tests__/test-utils';
import { DepartmentView } from '@/components/home/DepartmentView';
import { getUserColorHex } from '@/lib/utils/userColors';
import type { PeerUser } from '@/lib/hooks/usePresence';
import type { ConnectorStatus, OpenFlowSignal } from '@/lib/openflow/types';

const peers: PeerUser[] = [
  { sessionId: 's1', name: 'Mara', email: 'mara@acme.de', role: 'member', status: 'online', lastHeartbeat: 0 },
];

const recentDocs = [
  { id: 'n1', title: 'Angebot Kunde X', updatedAt: '2026-06-01T08:00:00.000Z' },
];

const suggestions: OpenFlowSignal[] = [
  {
    id: 'sug-1', source: 'os', title: 'Entscheidung sichern', summary: 'Launch-Termin festlegen.',
    priority: 'normal', status: 'new', trustScope: 'department',
    relatedNodeIds: [], relatedRelationIds: [], suggestedActions: [],
  },
];

const connectors: ConnectorStatus[] = [
  { id: 'crm', label: 'CRM', source: 'crm', status: 'needs_setup', detail: 'Noch nicht verbunden.' },
];

describe('DepartmentView', () => {
  it('renders the department name and the four pillar headings', () => {
    renderWithProviders(
      <DepartmentView departmentName="Vertrieb" peers={peers} recentDocs={recentDocs} suggestions={suggestions} connectors={connectors} />
    );
    expect(screen.getByText('Vertrieb')).toBeInTheDocument();
    expect(screen.getByText('Team online')).toBeInTheDocument();
    expect(screen.getByText('Letzte Dokumente')).toBeInTheDocument();
    expect(screen.getByText('Mora-Vorschläge')).toBeInTheDocument();
    expect(screen.getByText('Externe Daten')).toBeInTheDocument();
  });

  it('gives each online peer their deterministic aura color', () => {
    renderWithProviders(
      <DepartmentView departmentName="Vertrieb" peers={peers} recentDocs={[]} suggestions={[]} connectors={[]} />
    );
    const dot = screen.getByTestId('peer-aura-s1');
    expect(dot).toHaveStyle({ backgroundColor: getUserColorHex('mara@acme.de') });
  });

  it('shows honest empty states instead of synthetic data', () => {
    renderWithProviders(
      <DepartmentView departmentName="Vertrieb" peers={[]} recentDocs={[]} suggestions={[]} connectors={[]} />
    );
    expect(screen.getByText('Niemand ist gerade online.')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Dokumente in dieser Abteilung.')).toBeInTheDocument();
  });

  it('opens a recent document on click', () => {
    const onOpenDoc = jest.fn();
    renderWithProviders(
      <DepartmentView departmentName="Vertrieb" peers={[]} recentDocs={recentDocs} suggestions={[]} connectors={[]} onOpenDoc={onOpenDoc} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Angebot Kunde X/ }));
    expect(onOpenDoc).toHaveBeenCalledWith('n1');
  });
});
