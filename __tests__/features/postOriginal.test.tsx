import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MailClient } from '@/features/post/MailClient';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { coreGet } from '@/lib/api/http';

jest.mock('@/lib/api/http', () => ({ coreGet: jest.fn() }));
jest.mock('@/lib/store/sessionStore', () => ({
  useSessionStore: (select: (s: unknown) => unknown) => select({ user: { id: 'mira', tenant_id: 'test' } }),
}));
jest.mock('@/lib/demo/demoStore', () => ({ useScopeCompanyId: () => 'test' }));
jest.mock('@/lib/os-prototype/legacyApps', () => ({ openLegacyApp: jest.fn() }));

const read = jest.mocked(coreGet);
const list = [{ id: 'a', subject: 'Angebot', snippet: 'Vorschau A' }, { id: 'b', subject: 'Angebot', snippet: 'Vorschau B' }];
function show(items = list, live = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  render(<QueryClientProvider client={client}><MailClient items={items} live={live} /></QueryClientProvider>);
  return within(screen.getByTestId('post-mail-pane'));
}
beforeEach(() => {
  useOsShellStore.getState().setPostOpenId(null);
  read.mockReset();
});

it('keeps the selected original when two subjects match and the older request finishes last', async () => {
  let finish!: (value: unknown) => void;
  read.mockImplementation(async path => path.endsWith('/a')
    ? new Promise(resolve => { finish = resolve; })
    : { id: 'b', subject: 'Angebot', body_text: 'Text B' });
  const pane = show();
  const rows = screen.getAllByTestId('post-mail-row');
  fireEvent.click(rows[0]);
  fireEvent.click(rows[1]);
  expect(await pane.findByText('Text B')).toBeVisible();
  await act(async () => { finish({ id: 'a', subject: 'Angebot', body_text: 'Text A' }); });
  expect(pane.queryByText('Text A')).toBeNull();
  expect(pane.getByText('Text B')).toBeVisible();
});

it('opens a linked ID outside the first page even with an empty inbox', async () => {
  useOsShellStore.getState().setPostOpenId('mail/42');
  read.mockResolvedValue({ id: 'mail/42', subject: 'Quelle', body_text: 'Original Mira' });
  expect(await show([]).findByText('Original Mira')).toBeVisible();
  expect(read).toHaveBeenCalledWith('/v3/mail/messages/mail%2F42', { throwAuthErrors: true });
});

it('shows an unavailable source when CORE returns a different message', async () => {
  useOsShellStore.getState().setPostOpenId('missing');
  read.mockResolvedValue({ id: 'b', subject: 'Angebot', body_text: 'Anderer Inhalt' });
  const pane = show();
  expect(await pane.findByText('Diese Nachricht ist nicht verfügbar.')).toBeVisible();
  expect(pane.queryByText('Anderer Inhalt')).toBeNull();
});

it('labels a demo excerpt and reads no live mail', () => {
  useOsShellStore.getState().setPostOpenId('a');
  const pane = show(list, false);
  expect(pane.getByText('Vorschau')).toBeVisible();
  expect(pane.getByText('Vorschau A')).toBeVisible();
  expect(read).not.toHaveBeenCalled();
});
