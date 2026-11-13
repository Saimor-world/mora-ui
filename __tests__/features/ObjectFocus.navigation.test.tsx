import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ObjectFocus } from '@/features/today/ui/ObjectFocus';
import { objectNavigationScope, useOsShellStore } from '@/lib/os-prototype/shellStore';
import { openOsObject } from '@/lib/os-prototype/objectNavigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const snapshot = {
  requested_scope: { tenant_id: 'tenant-test', user_id: 'user-test', company_id: 'company-test' },
  tasks: { status: 'ok', items: [
    { id: 'task-one', title: 'Selected task', status: 'in_progress', priority: 'high', due_date: '2026-11-04' },
    { id: 'task-two', title: 'Other task', status: 'backlog' },
  ], due_today: [], overdue: [] },
} as unknown as TodaySnapshot;
const events = [{ id: 'event-one', title: 'Selected event', date: '2026-11-04', time: '14:00', duration: 30, location: 'Test room' }];
beforeEach(() => {
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.setState({ user: { id: 'user-test', tenant_id: 'tenant-test', active_company_id: 'company-test' } as never, sessionGeneration: 0 });
  useNavStore.setState({ activeCompanyId: 'company-test' });
  useOsShellStore.setState({ objectTarget: null });
});
afterEach(() => { cleanup(); useOsShellStore.setState({ objectTarget: null }); useDemoStore.getState().setDemoCompany(null); });
function view(props: Partial<React.ComponentProps<typeof ObjectFocus>> = {}) {
  return <ObjectFocus snapshot={snapshot} events={events} eventStatus="ok" loading={false} {...props} />;
}

it('publishes the exact task command before navigation and resolves only that task', () => {
  const navigate = jest.fn(() => expect(useOsShellStore.getState().objectTarget?.id).toBe('task-one'));
  expect(openOsObject('task', 'task-one', navigate, objectNavigationScope())).toBe(true);
  expect(navigate).toHaveBeenCalledWith('today');
  render(view());
  expect(screen.getByRole('region', { name: 'Aufgabendetails' })).toBeInTheDocument();
  expect(screen.getByText('Selected task')).toBeInTheDocument();
  expect(screen.getByText('Status: In Arbeit')).toBeInTheDocument();
  expect(screen.getByText('Fällig: 04.11.2026')).toBeInTheDocument();
  expect(screen.queryByText('Other task')).not.toBeInTheDocument();
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Aufgabe ansehen' }));
});

it('opens the exact event with its delivered fields and can close without changing it', () => {
  openOsObject('event', 'event-one', jest.fn(), objectNavigationScope());
  const { container } = render(view());
  expect(screen.getByText('Selected event')).toBeInTheDocument();
  expect(screen.getByText('Ort: Test room')).toBeInTheDocument();
  expect(screen.getByText('Dauer: 30 Minuten')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /erledigt|besetzen|speichern/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Details schließen' }));
  expect(container).toBeEmptyDOMElement();
});

it('reports a missing target without substituting the first available task', () => {
  openOsObject('task', 'missing-task', jest.fn(), objectNavigationScope());
  render(view());
  expect(screen.getByRole('status')).toHaveTextContent('nicht verfügbar');
  expect(screen.queryByText('Selected task')).not.toBeInTheDocument();
});

it('retains the ID while loading and resolves it once its source arrives', () => {
  openOsObject('task', 'task-one', jest.fn(), objectNavigationScope());
  const { rerender } = render(view({ snapshot: null, loading: true }));
  expect(screen.queryByText(/nicht verfügbar/)).not.toBeInTheDocument();
  rerender(view());
  expect(screen.getByText('Selected task')).toBeInTheDocument();
});

it('handles new targets while mounted and marks a cached snapshot as unconfirmed', () => {
  openOsObject('task', 'task-one', jest.fn(), objectNavigationScope());
  render(view({ snapshotStale: true }));
  expect(screen.getByText(/aktuell nicht bestätigt/)).toBeInTheDocument();
  act(() => { openOsObject('task', 'task-two', jest.fn(), objectNavigationScope()); });
  expect(screen.getByText('Other task')).toBeInTheDocument();
  expect(screen.queryByText('Selected task')).not.toBeInTheDocument();
});

it('refuses a target from another account even if the same object ID is supplied', () => {
  openOsObject('task', 'task-one', jest.fn(), objectNavigationScope());
  const { rerender } = render(view());
  act(() => useSessionStore.setState({ user: { id: 'other-user', tenant_id: 'tenant-test', active_company_id: 'company-test' } as never, sessionGeneration: 1 }));
  rerender(view());
  expect(screen.getByRole('status')).toHaveTextContent('anderen Arbeitsbereich');
  expect(screen.queryByText('Selected task')).not.toBeInTheDocument();
});

it('rejects stale callbacks after a company switch and does not navigate', () => {
  const oldScope = objectNavigationScope();
  useSessionStore.setState({ user: { id: 'user-test', tenant_id: 'tenant-test', active_company_id: 'other-company' } as never });
  const navigate = jest.fn();
  expect(openOsObject('task', 'task-one', navigate, oldScope)).toBe(false);
  expect(navigate).not.toHaveBeenCalled();
  expect(useOsShellStore.getState().objectTarget).toBeNull();
});

it('does not expose task rows from a mismatching snapshot scope', () => {
  openOsObject('task', 'task-one', jest.fn(), objectNavigationScope());
  render(view({ snapshot: { ...snapshot, requested_scope: { ...snapshot.requested_scope, user_id: 'other-user' } } }));
  expect(screen.getByRole('status')).toHaveTextContent('nicht verfügbar');
  expect(screen.queryByText('Selected task')).not.toBeInTheDocument();
});

it('never displays an unavailable calendar response as a readable event', () => {
  openOsObject('event', 'event-one', jest.fn(), objectNavigationScope());
  render(view({ eventStatus: 'unavailable' }));
  expect(screen.getByRole('status')).toHaveTextContent('nicht verfügbar');
  expect(screen.queryByText('Selected event')).not.toBeInTheDocument();
});
