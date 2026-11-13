import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import PostSurface from '@/features/post';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDemoStore } from '@/lib/demo/demoStore';

const mockCalendar = {
  data: [{ id: 'post-event-id', title: 'Post appointment', date: '2099-01-01', time: '14:00', duration: 45 }],
  fetchStatus: 'idle', isLoading: false, isError: false, error: null, refetch: jest.fn(),
};
jest.mock('@/features/post/data/usePost', () => ({ usePostCalendar: () => mockCalendar, usePostInbox: () => ({ data: [], fetchStatus: 'idle', refetch: jest.fn() }) }));
jest.mock('@/features/post/MailClient', () => ({ MailClient: () => null }));
jest.mock('@/components/home/CalendarContinuity', () => ({ CalendarContinuity: () => null }));
jest.mock('@/lib/os-prototype/legacyApps', () => ({ openLegacyApp: jest.fn() }));
beforeEach(() => {
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.setState({ user: { id: 'user-test', tenant_id: 'tenant-test', active_company_id: 'company-test' } as never, sessionGeneration: 0 });
  useOsShellStore.setState({ objectTarget: null });
  mockCalendar.isError = false;
});
afterEach(() => { cleanup(); useOsShellStore.setState({ objectTarget: null }); });

it('opens a Post event from the very same calendar data and ID that rendered the row', () => {
  const navigate = jest.fn();
  render(<PostSurface preview={false} navigate={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen: Post appointment' }));
  expect(useOsShellStore.getState().objectTarget).toMatchObject({ kind: 'event', id: 'post-event-id', surface: 'post' });
  expect(navigate).toHaveBeenCalledWith('post');
  const details = within(screen.getByRole('region', { name: 'Termindetails' }));
  expect(details.getByText('Post appointment')).toBeInTheDocument();
  expect(details.getByText('Dauer: 45 Minuten')).toBeInTheDocument();
});

it('removes the event detail when the current calendar becomes unreadable', () => {
  const navigate = jest.fn();
  const { rerender } = render(<PostSurface preview={false} navigate={navigate} />);
  fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen: Post appointment' }));
  mockCalendar.isError = true;
  rerender(<PostSurface preview={false} navigate={navigate} />);
  const details = within(screen.getByRole('region', { name: 'Termindetails' }));
  expect(details.getByRole('status')).toHaveTextContent('nicht verfügbar');
  expect(details.queryByText('Post appointment')).not.toBeInTheDocument();
});

it('does not carry an old Post appointment target into a different account', () => {
  render(<PostSurface preview={false} navigate={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Termin öffnen: Post appointment' }));
  act(() => useSessionStore.setState({ user: { id: 'other-user', tenant_id: 'tenant-test', active_company_id: 'company-test' } as never, sessionGeneration: 1 }));
  const details = within(screen.getByRole('region', { name: 'Termindetails' }));
  expect(details.getByRole('status')).toHaveTextContent('anderen Arbeitsbereich');
  expect(details.queryByText('Post appointment')).not.toBeInTheDocument();
});
