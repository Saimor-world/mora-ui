import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TodaySurface from '@/features/today';

const meta = { complete: true, status: 'empty', scope: {}, connection: 'local' };
const mockSnapshot = {
  calendar: { ...meta, count: 0, events: [], next_event: null },
  tasks: { ...meta, counts: { open: 0, overdue: 0, due_today: 0, in_progress: 0 }, items: [], due_today: [], overdue: [] },
  mail: { ...meta, items: [], inbox_loaded: 0 }, nightwatch: { ...meta, incidents: [], open_incidents: 0 },
};
let mockWorld: Record<string, unknown>;
const mockSetPostOpenId = jest.fn();
jest.mock('@/lib/os/useScopedToday', () => ({ useScopedToday: () => ({ snapshot: mockSnapshot, loading: false, refreshing: false, loadError: null, refresh: jest.fn() }) }));
jest.mock('@/lib/lea/useWorld', () => ({ useWorld: () => mockWorld }));
jest.mock('@/lib/store/sessionStore', () => ({ useSessionStore: (select: (s: unknown) => unknown) => select({ user: { id: 'reader', tenant_id: 'tenant', name: 'Test', role: 'owner' } }) }));
jest.mock('@/lib/os-prototype/shellStore', () => ({ useOsShellStore: Object.assign((select: (s: unknown) => unknown) => select({ phaseOverride: null }), { getState: () => ({ setPostOpenId: mockSetPostOpenId }) }) }));
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
  mockSnapshot.mail.items = [];
  mockSetPostOpenId.mockClear();
});

it('hands the exact Today mail ID to Post before navigating', () => {
  mockSnapshot.mail.items = [{ id: 'mail-from-today', subject: 'Selected Today mail', from_addr: 'fixture@example.test', read: false }] as never;
  const navigate = jest.fn();
  render(<TodaySurface navigate={navigate} preview={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Nachricht öffnen: Selected Today mail' }));
  expect(mockSetPostOpenId).toHaveBeenCalledWith('mail-from-today');
  expect(navigate).toHaveBeenCalledWith('post');
  expect(mockSetPostOpenId.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
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
