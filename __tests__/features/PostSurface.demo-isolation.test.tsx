import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const openLegacyApp = jest.fn();
jest.mock('@/lib/os-prototype/legacyApps', () => ({ openLegacyApp: (...args: unknown[]) => openLegacyApp(...args) }));
jest.mock('@/features/post/data/usePost', () => ({
  usePostInbox: () => ({ data: [], fetchStatus: 'idle', refetch: jest.fn() }),
  usePostCalendar: () => ({ data: [], fetchStatus: 'idle', refetch: jest.fn() }),
}));
jest.mock('@/components/home/CalendarContinuity', () => ({ CalendarContinuity: () => <div data-testid="personal-continuity" /> }));
jest.mock('@/features/post/MailClient', () => ({ MailClient: () => null }));

import PostSurface from '@/features/post';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';

beforeEach(() => {
  jest.clearAllMocks();
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.setState({ user: { id: 'presenter-test', tenant_id: 'tenant-test' } as never });
});
afterEach(() => useDemoStore.getState().setDemoCompany(null));

it('keeps the personal mail and calendar launchers working outside demos', () => {
  render(<PostSurface preview={false} navigate={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Im Postfach öffnen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kalender öffnen' }));
  expect(openLegacyApp.mock.calls).toEqual([['mail'], ['calendar']]);
  expect(screen.getByTestId('personal-continuity')).toBeInTheDocument();
});

it('disables personal launchers and removes calendar threads when switching into demo', () => {
  render(<PostSurface preview={false} navigate={jest.fn()} />);
  act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
  const mail = screen.getByRole('button', { name: 'Im Postfach öffnen' });
  const calendar = screen.getByRole('button', { name: 'Kalender öffnen' });
  expect(mail).toBeDisabled();
  expect(calendar).toBeDisabled();
  fireEvent.click(mail);
  fireEvent.click(calendar);
  expect(openLegacyApp).not.toHaveBeenCalled();
  expect(screen.queryByTestId('personal-continuity')).not.toBeInTheDocument();
  expect(screen.getByText('Persönliches Postfach und Kalender sind in der Demo gesperrt.')).toHaveAttribute('role', 'status');
  act(() => useDemoStore.getState().setDemoCompany(null));
  expect(mail).toBeEnabled();
  expect(calendar).toBeEnabled();
  expect(screen.getByTestId('personal-continuity')).toBeInTheDocument();
});
