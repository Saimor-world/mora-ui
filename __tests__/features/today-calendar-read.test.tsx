import React from 'react';
import { render, screen } from '@testing-library/react';
import TodaySurface from '@/features/today';

const meta = { complete: true, status: 'empty', scope: {}, connection: 'local' };
const mockSnapshot = {
  calendar: { ...meta, count: 0, events: [], next_event: null },
  tasks: { ...meta, counts: { open: 0, overdue: 0, due_today: 0, in_progress: 0 }, items: [], due_today: [], overdue: [] },
  mail: { ...meta, items: [], inbox_loaded: 0 }, nightwatch: { ...meta, incidents: [], open_incidents: 0 },
};
let mockWorld: Record<string, unknown>;
jest.mock('@/lib/os/useScopedToday', () => ({ useScopedToday: () => ({ snapshot: mockSnapshot, loading: false, refreshing: false, loadError: null, refresh: jest.fn() }) }));
jest.mock('@/lib/lea/useWorld', () => ({ useWorld: () => mockWorld }));
jest.mock('@/lib/store/sessionStore', () => ({ useSessionStore: (select: (s: unknown) => unknown) => select({ user: { id: 'reader', tenant_id: 'tenant', name: 'Test', role: 'owner' } }) }));
jest.mock('@/lib/os-prototype/shellStore', () => ({ useOsShellStore: (select: (s: unknown) => unknown) => select({ phaseOverride: null }) }));
jest.mock('@/lib/hooks/useIsPhone', () => ({ useIsPhone: () => false }));
jest.mock('@/lib/hooks/useIsSaimorInternal', () => ({ useIsSaimorInternal: () => false }));
jest.mock('@/components/os-shell/RolePreview', () => ({ useRolePreview: () => ({ role: 'owner' }), RolePreviewBanner: () => null, RolePreviewToggle: () => null, RolePreviewMenu: () => null }));
jest.mock('@/features/finance/data/useFinanceSignal', () => ({ useFinanceSignal: () => ({ kind: 'unavailable' }) }));
jest.mock('@/lib/lea/dayStore', () => ({ useDayStore: (select: (s: unknown) => unknown) => select({ phases: {} }) }));
jest.mock('@/components/day/DayPanel', () => ({ DayPanel: () => null }));
jest.mock('@/features/today/ui/PhoneHome', () => ({ PhoneHome: () => null }));
jest.mock('@/features/today/ui/MoraBriefing', () => ({ MoraBriefing: () => null }));
jest.mock('@/features/mora/ui/AgentFeed', () => ({ AgentFeed: () => null }));

beforeEach(() => {
  mockWorld = { enabled: true, loading: false, calendarUnavailable: true, tasksUnavailable: false,
    events: [], tasks: [], calendar: null };
  mockSnapshot.calendar.events = [];
});

it('does not call an unknown calendar free in either desktop representation', () => {
  render(<TodaySurface navigate={jest.fn()} preview={false} />);
  expect(screen.getByText('Kalenderstand nicht vollständig lesbar')).toBeInTheDocument();
  expect(screen.getByText('Kalender gerade nicht verfügbar')).toBeInTheDocument();
  expect(screen.queryByText('Heute frei')).not.toBeInTheDocument();
  expect(screen.queryByText('Keine Termine heute.')).not.toBeInTheDocument();
});

it('does not revive an old Today event after the stored read model proves today empty', () => {
  mockWorld = { ...mockWorld, calendarUnavailable: false, calendar: { complete: true, window: { timezone: 'Europe/Berlin' } } };
  mockSnapshot.calendar.events = [{ id: 'old', title: 'Old legacy appointment', date: '2000-01-01' }] as never;
  render(<TodaySurface navigate={jest.fn()} preview={false} />);
  expect(screen.queryByText('Old legacy appointment')).not.toBeInTheDocument();
  expect(screen.getByText('Keine Termine heute.')).toBeInTheDocument();
});
