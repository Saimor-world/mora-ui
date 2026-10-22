import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UniverseInstruments } from '@/components/universe/UniverseInstruments';
import { SubstanceWidget } from '@/components/universe/SubstanceWidget';

jest.mock('@/lib/universe/morgen', () => ({ isUniverseV2Enabled: () => true }));
jest.mock('@/components/universe/UniverseLinks', () => ({ CountUp: ({ value }: { value: number }) => <>{value}</> }));
jest.mock('@/components/universe/PlanetSphere', () => ({ planetMaterial: () => ({ day: '#abc', mid: '#789' }) }));
const noop = () => undefined;
const props = {
  mail: [], calendar: [], feed: [], incidents: [], openIncidents: [], substanceBars: [],
  mailStatus: 'ok' as const, calendarStatus: 'ok' as const,
  business: { activeCount: 0, monthlyRevenueMinor: 0, currency: null, providers: [] },
  onSelectTerritory: noop, onOpenMail: noop, onOpenCalendar: noop, onOpenFeed: noop, onOpenNightwatch: noop,
};

it('keeps source failures visible instead of reporting a quiet inbox', () => {
  render(<UniverseInstruments {...props} mailStatus="unavailable" calendarStatus="unavailable" />);
  expect(screen.getAllByText('Nicht erreichbar – Verbindung prüfen')).toHaveLength(2);
  expect(screen.queryByText('Posteingang ruhig')).not.toBeInTheDocument();
});

it('expands system details when there is an open incident (SAIMÔR-internal view)', () => {
  const { container } = render(<UniverseInstruments {...props} internal openIncidents={[{ id: 'test-incident', title: 'Testvorfall', status: 'open' } as never]} />);
  expect(container.querySelector('details')).toHaveAttribute('open');
  expect(screen.getByText('Testvorfall')).toBeInTheDocument();
});

it('leaves empty areas reachable without zero counters', () => {
  const select = jest.fn();
  render(<SubstanceWidget onSelect={select} bars={[{ id: 'empty', name: 'Leerer Bereich', color: '#abc', documents: 0, folders: 0, spaces: 1, ratio: 1 }]} />);
  expect(screen.getByText('Raum für deine Arbeit.')).toBeInTheDocument();
  expect(screen.queryByText(/0 Dok/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Leerer Bereich/ }));
  expect(select).toHaveBeenCalledWith('empty');
});

it('preserves nonzero folder content without claiming zero documents', () => {
  render(<SubstanceWidget onSelect={noop} bars={[{ id: 'folders', name: 'Mit Ordnern', color: '#abc', documents: 0, folders: 2, spaces: 1, ratio: 1 }]} />);
  expect(screen.getByText('Mit Ordnern')).toBeInTheDocument();
  expect(screen.queryByText('Raum für deine Arbeit.')).not.toBeInTheDocument();
  expect(screen.queryByText(/0 Dok/)).not.toBeInTheDocument();
  expect(screen.queryByText('Dokumente gesamt')).not.toBeInTheDocument();
});
