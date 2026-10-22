import React from 'react';
import { render, screen } from '@testing-library/react';
import { FEATURE_MANIFESTS, navigationModel, resolveFeatureId } from '@/features/registry';
import { visibleFinanceTabs } from '@/features/finance';
import { UniverseInstruments } from '@/components/universe/UniverseInstruments';

jest.mock('@/lib/universe/morgen', () => ({ isUniverseV2Enabled: () => true }));
jest.mock('@/components/universe/UniverseLinks', () => ({ CountUp: ({ value }: { value: number }) => <>{value}</> }));
jest.mock('@/components/universe/PlanetSphere', () => ({ planetMaterial: () => ({ day: '#abc', mid: '#789' }) }));

const customer = { role: 'owner' as const, flags: new Set<string>(), internal: false };
const saimor = { role: 'owner' as const, flags: new Set<string>(), internal: true };

describe('SAIMÔR-internal things stay hidden from customer companies', () => {
  it('hides Labs from the navigation and from direct links for customers', () => {
    const labs = FEATURE_MANIFESTS.find((m) => m.id === 'labs')!;
    expect(labs.internalOnly).toBe(true);
    const ids = (ctx: typeof customer) => Object.values(navigationModel(ctx)).flat().map((m) => m.id);
    expect(ids(customer)).not.toContain('labs');
    expect(ids(saimor)).toContain('labs');
    expect(resolveFeatureId('labs', customer)).toBe('today');
    expect(resolveFeatureId('labs', saimor)).toBe('labs');
  });

  it('hides Finance and the classic surface from customers', () => {
    const ids = (ctx: typeof customer) => Object.values(navigationModel(ctx)).flat().map((m) => m.id);
    expect(ids(customer)).not.toContain('finance');
    expect(ids(saimor)).toContain('finance');
    expect(resolveFeatureId('finance', customer)).toBe('today');
    const { OsDock } = require('@/components/os-shell/OsDock');
    const noop = () => undefined;
    const p = { items: [], activeId: 'today', moraOpen: false, unread: 0, onNavigate: noop, onSearch: noop, onControl: noop, controlOpen: false, onNotifications: noop, onMora: noop };
    const { unmount } = render(<OsDock {...p} />);
    expect(screen.queryByTestId('legacy-shell-link')).not.toBeInTheDocument();
    unmount();
    render(<OsDock {...p} showLegacy />);
    expect(screen.getByTestId('legacy-shell-link')).toBeInTheDocument();
  });

  it('shows customers only overview and cashflow in finance, no treasury, XRPL or profit center', () => {
    expect(visibleFinanceTabs(false).map((t) => t.id)).toEqual(['overview', 'cashflow']);
    expect(visibleFinanceTabs(true).map((t) => t.id)).toEqual(['overview', 'cashflow', 'profit', 'treasury', 'capital']);
  });

  it('shows Wache and Wirtschaft (Paddle) only to SAIMÔR', () => {
    const noop = () => undefined;
    const props = {
      mail: [], calendar: [], feed: [], substanceBars: [],
      incidents: [{ id: 'i1', title: 'Datenbank langsam', status: 'open' } as never],
      openIncidents: [{ id: 'i1', title: 'Datenbank langsam', status: 'open' } as never],
      business: { activeCount: 0, monthlyRevenueMinor: 0, currency: null, providers: [] },
      onSelectTerritory: noop, onOpenMail: noop, onOpenCalendar: noop, onOpenFeed: noop, onOpenNightwatch: noop,
    };
    const { unmount } = render(<UniverseInstruments {...props} />);
    expect(screen.queryByTestId('uv2-wache-timeline')).not.toBeInTheDocument();
    expect(screen.queryByText(/Paddle|Noch kein Umsatz/)).not.toBeInTheDocument();
    expect(screen.queryByText('Datenbank langsam')).not.toBeInTheDocument();
    unmount();

    render(<UniverseInstruments {...props} internal />);
    expect(screen.getByTestId('uv2-wache-timeline')).toBeInTheDocument();
    expect(screen.getByText('Paddle bereit')).toBeInTheDocument();
  });
});
