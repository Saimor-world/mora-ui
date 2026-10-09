import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const coreGet = jest.fn();
const corePost = jest.fn();
jest.mock('@/lib/api/http', () => ({ coreGet: (...a: unknown[]) => coreGet(...a), corePost: (...a: unknown[]) => corePost(...a), getCoreBaseUrl: () => 'http://localhost:8081' }));
jest.mock('@/lib/os-prototype/useSources', () => ({ ...jest.requireActual('@/lib/os-prototype/useSources'), isLocalCore: () => true }));
jest.mock('@/lib/queries/useDepartments', () => ({ useDepartments: () => ({ data: [{ id: 'd1', name: 'Vertrieb' }, { id: 'd2', name: 'Management' }] }) }));

import { SourceDock } from '@/features/settings/ui/SourceDock';

const MAIL = {
  id: 'mail', label: 'E-Mail', group: 'mail', status: 'available', detail: '',
  action: { kind: 'credentials', provider: 'mail', field_schema: [
    { name: 'provider', label: 'Anbieter', type: 'select', default: 'local_test', options: [{ value: 'local_test', label: 'Lokaler Test-Server (nur Entwicklung)' }, { value: 'gmail', label: 'Gmail' }] },
    { name: 'email', label: 'E-Mail', type: 'email', required: true },
    { name: 'app_password', label: 'App-Passwort', type: 'password', required: true },
  ] },
};
const SUMMARY = {
  method: 'regelbasiert', status: 'ok', total: 1, headline: '1 Nachricht im Posteingang.',
  groups: [{ key: 'rechnung', label: 'Rechnungen & Zahlungen', count: 1, refs: [{ uid: '5', message_id: '<r@x>', subject: 'Rechnung RE-TEST-0412', from: 'Buchhaltung <b@x.example.test>', date: '2026-10-09T07:00:00+00:00' }] }],
  other: { count: 0, refs: [] }, source: { dev_only: true },
};

function renderDock() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><SourceDock live navigate={jest.fn()} /></QueryClientProvider>);
}

async function fillAndSubmit() {
  fireEvent.click(await screen.findByTestId('dock-primary'));
  expect(screen.getByTestId('dock-consent')).toHaveTextContent('dockt an Vertrieb');
  fireEvent.click(screen.getByTestId('dock-approve'));
  const form = screen.getByTestId('dock-form-mail');
  const inputs = form.querySelectorAll('input');
  fireEvent.change(inputs[0], { target: { value: 'postfach@saimor-local.example.test' } });
  fireEvent.change(inputs[1], { target: { value: 'nur-im-test-1234' } });
  fireEvent.click(screen.getByTestId('dock-submit'));
}

beforeEach(() => {
  coreGet.mockReset(); corePost.mockReset();
  coreGet.mockImplementation(async (path: string) => (path === '/v3/connections/mail/summary' ? SUMMARY : { connections: [MAIL] }));
});

describe('V1.8 SourceDock · E-Mail', () => {
  it('docks only after CORE confirms the fetch and shows the first real mail as signal', async () => {
    let resolve: (v: unknown) => void = () => {};
    corePost.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    renderDock();
    await fillAndSubmit();
    expect(await screen.findByTestId('dock-connecting')).toHaveTextContent('erst, wenn der Abruf klappt');
    expect(corePost).toHaveBeenCalledWith('/v3/connections/mail/connect', { provider: 'local_test', email: 'postfach@saimor-local.example.test', app_password: 'nur-im-test-1234' });
    resolve({ status: 'connected', confirmed: true, fetched: 5, dev_only: true });
    expect(await screen.findByTestId('dock-verified')).toHaveTextContent('5 Nachrichten · in CORE bestätigt · lokaler Test-Server');
    expect(await screen.findByTestId('mail-summary-signal')).toHaveTextContent('Rechnung RE-TEST-0412');
    expect(screen.getByTestId('dock-first-signal')).toHaveTextContent('regelbasiert');
  });

  it('an unconfirmed answer is an error, not docked', async () => {
    corePost.mockResolvedValueOnce({ status: 'configured' });
    renderDock();
    await fillAndSubmit();
    expect(await screen.findByTestId('dock-error')).toHaveTextContent('nicht bestätigt');
    expect(screen.getByTestId('dock-error')).toHaveTextContent('Ein Fehler ist kein leeres Postfach.');
    expect(screen.queryByTestId('dock-docked')).toBeNull();
  });

  it('no answer from CORE (network) is an error, not docked', async () => {
    corePost.mockResolvedValueOnce(null);
    renderDock();
    await fillAndSubmit();
    expect(await screen.findByTestId('dock-error')).toHaveTextContent('nicht erreichbar');
  });

  it('wrong credentials from the IMAP server surface as rejected credentials', async () => {
    corePost.mockRejectedValueOnce(new Error('Anmeldung am Postfach fehlgeschlagen. Zugangsdaten prüfen.'));
    renderDock();
    await fillAndSubmit();
    expect(await screen.findByTestId('dock-error')).toHaveTextContent('Die Zugangsdaten wurden abgelehnt.');
  });
});
