import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IncidentStatusPanel } from '@/components/home/IncidentStatusPanel';
import type { ContextualPanel } from '@/lib/panel/panelTypes';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';

const panel: ContextualPanel<NightwatchIncidentItem> = {
  id: 'panel-incident-n1',
  type: 'incident_status',
  state: 'verified',
  source: 'nightwatch',
  source_type: 'incident',
  confidence: 'verified',
  reason: 'Database latency elevated',
  payload: {
    id: 'n1',
    title: 'DB Latency High',
    summary: 'Database latency exceeded 500ms threshold',
    severity: 'critical',
    status: 'open',
    host: 'saimor-db-1',
    detected_at: '2026-06-07T12:00:00Z',
  },
};

describe('IncidentStatusPanel', () => {
  it('renders verified incidents correctly', () => {
    render(<IncidentStatusPanel panel={panel} onOpenPane={jest.fn()} />);

    expect(screen.getByText('DB Latency High')).toBeInTheDocument();
    expect(screen.getByText('Database latency exceeded 500ms threshold')).toBeInTheDocument();
    expect(screen.getByText('SENSOR: NIGHTWATCH')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders nothing for placeholder state', () => {
    const placeholderPanel = { ...panel, state: 'placeholder' as const };
    const { container } = render(<IncidentStatusPanel panel={placeholderPanel} onOpenPane={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows missing/unknown message for unknown state', () => {
    const unknownPanel = { ...panel, state: 'unknown' as const };
    render(<IncidentStatusPanel panel={unknownPanel} onOpenPane={jest.fn()} />);
    expect(screen.getByText(/Infrastruktur-Zustand/)).toBeInTheDocument();
  });

  it('expands evidence section when Nachweis button is clicked', () => {
    render(<IncidentStatusPanel panel={panel} onOpenPane={jest.fn()} />);

    // Evidence details are hidden initially
    expect(screen.queryByText(/Database latency elevated/)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByRole('button', { name: /Nachweis/i }));

    expect(screen.getByText(/Database latency elevated/)).toBeInTheDocument();
    expect(screen.getByText(/n1/)).toBeInTheDocument();
    expect(screen.getByText(/saimor-db-1/)).toBeInTheDocument();
  });

  it('calls onOpenPane to ask MORA', () => {
    const onOpenPane = jest.fn();
    render(<IncidentStatusPanel panel={panel} onOpenPane={onOpenPane} />);

    fireEvent.click(screen.getByRole('button', { name: /MORA fragen/i }));

    expect(onOpenPane).toHaveBeenCalledWith({
      id: 'chat-main',
      type: 'chat',
      title: 'MORA',
      size: { width: 860, height: 680 },
      data: {
        initialMessage: expect.stringContaining('saimor-db-1'),
        autoSend: false,
      },
    });
  });
});
