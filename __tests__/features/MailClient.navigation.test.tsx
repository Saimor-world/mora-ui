import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MailClient } from '@/features/post/MailClient';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useSessionStore } from '@/lib/store/sessionStore';

jest.mock('@/lib/os-prototype/legacyApps', () => ({ openLegacyApp: jest.fn() }));

const items = [
  { id: 'mail-first', subject: 'First mail', from: 'first@example.test', body_text: 'First body', read: false },
  { id: 'mail-second', subject: 'Second mail', from: 'second@example.test', body_text: 'Second body', read: true },
];
beforeEach(() => {
  useOsShellStore.setState({ postOpenId: null });
  useSessionStore.setState({ user: { id: 'mail-user-a', tenant_id: 'mail-tenant' } as never, sessionGeneration: 0 });
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
});
afterEach(() => { cleanup(); useOsShellStore.setState({ postOpenId: null }); });
const pane = () => within(screen.getByTestId('post-mail-pane'));

it('opens the queued exact message under StrictMode instead of the automatic first mail', () => {
  useOsShellStore.getState().setPostOpenId('mail-second');
  render(<StrictMode><MailClient items={items} /></StrictMode>);
  expect(pane().getByText('Second body')).toBeInTheDocument();
  expect(pane().queryByText('First body')).not.toBeInTheDocument();
  expect(useOsShellStore.getState().postOpenId).toBeNull();
});

it('accepts a new target while mounted and resets an excluding unread filter', () => {
  render(<MailClient items={items} />);
  fireEvent.click(screen.getByRole('tab', { name: /Ungelesen/ }));
  act(() => useOsShellStore.getState().setPostOpenId('mail-second'));
  expect(pane().getByText('Second body')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Alle/ })).toHaveAttribute('aria-selected', 'true');
  act(() => useOsShellStore.getState().setPostOpenId('mail-first'));
  expect(pane().getByText('First body')).toBeInTheDocument();
});

it('reports a missing exact target without silently opening a different message', () => {
  useOsShellStore.getState().setPostOpenId('mail-missing');
  render(<MailClient items={items} />);
  expect(pane().getByText('Die ausgewählte Nachricht ist in diesem Posteingang nicht verfügbar.')).toBeInTheDocument();
  expect(pane().queryByText('First body')).not.toBeInTheDocument();
  fireEvent.click(pane().getByRole('button', { name: 'Zum Posteingang' }));
  expect(pane().queryByText(/nicht verfügbar/)).not.toBeInTheDocument();
});

it('retains the requested ID while its message list arrives later on a phone', () => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  useOsShellStore.getState().setPostOpenId('mail-second');
  const { rerender } = render(<MailClient items={[]} />);
  expect(pane().getByText(/nicht verfügbar/)).toBeInTheDocument();
  rerender(<MailClient items={items} />);
  expect(pane().getByText('Second body')).toBeInTheDocument();
});

it('refuses a queued message target after changing accounts, even if IDs collide', () => {
  useOsShellStore.getState().setPostOpenId('mail-second');
  useSessionStore.setState({ user: { id: 'mail-user-b', tenant_id: 'mail-tenant' } as never, sessionGeneration: 1 });
  render(<MailClient items={items} />);
  expect(pane().getByText(/nicht verfügbar/)).toBeInTheDocument();
  expect(pane().queryByText('Second body')).not.toBeInTheDocument();
});
