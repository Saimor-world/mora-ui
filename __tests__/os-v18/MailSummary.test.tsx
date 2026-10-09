import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const coreGet = jest.fn();
jest.mock('@/lib/api/http', () => ({ coreGet: (...a: unknown[]) => coreGet(...a), corePost: jest.fn(), getCoreBaseUrl: () => 'http://localhost:8081' }));

import { MailSummaryView } from '@/features/today/ui/MailSummary';

const REF = (subject: string, date: string) => ({ uid: subject, message_id: `<${subject}@dev-imap.example.test>`, subject, from: `Testabsender <t@x.example.test>`, date });
const SUMMARY = {
  method: 'regelbasiert', status: 'ok', total: 3, verified_at: '2026-10-09T07:30:00+00:00',
  headline: '3 Nachrichten im Posteingang, davon 1× Rechnungen & Zahlungen, 1× Termine & Einladungen.',
  groups: [
    { key: 'rechnung', label: 'Rechnungen & Zahlungen', count: 1, refs: [REF('Rechnung RE-TEST', '2026-10-09T07:00:00+00:00')] },
    { key: 'termin', label: 'Termine & Einladungen', count: 1, refs: [REF('Terminvorschlag', '2026-10-09T05:00:00+00:00')] },
  ],
  other: { count: 1, refs: [REF('Neuigkeiten', '2026-10-08T05:00:00+00:00')] },
  source: { provider: 'local_test', dev_only: true },
};

function renderView(props: React.ComponentProps<typeof MailSummaryView>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MailSummaryView {...props} /></QueryClientProvider>);
}

beforeEach(() => coreGet.mockReset());

describe('V1.8 MailSummaryView', () => {
  it('shows groups with source references, labelled regelbasiert and dev-only', async () => {
    coreGet.mockResolvedValue(SUMMARY);
    renderView({ enabled: true });
    expect(await screen.findByTestId('mail-summary')).toHaveTextContent(SUMMARY.headline);
    expect(screen.getByTestId('mail-summary-method')).toHaveTextContent('regelbasiert');
    expect(screen.getByText('Test-Server · nur Entwicklung')).toBeInTheDocument();
    expect(screen.getAllByTestId('mail-ref')).toHaveLength(3);
    expect(screen.getByTestId('mail-group-rechnung')).toHaveTextContent('Rechnung RE-TEST');
    expect(screen.getAllByTestId('mail-ref')[0]).toHaveAttribute('data-message-id', '<Rechnung RE-TEST@dev-imap.example.test>');
    expect(coreGet).toHaveBeenCalledWith('/v3/connections/mail/summary', { throwAuthErrors: true });
  });

  it('signal variant shows only the newest message as first signal', async () => {
    coreGet.mockResolvedValue(SUMMARY);
    renderView({ enabled: true, variant: 'signal' });
    const sig = await screen.findByTestId('mail-summary-signal');
    expect(screen.getAllByTestId('mail-ref')).toHaveLength(1);
    expect(sig).toHaveTextContent('Rechnung RE-TEST');
    expect(sig).toHaveTextContent('Testabsender');
  });

  it('empty mailbox is explicit and different from an error', async () => {
    coreGet.mockResolvedValue({ ...SUMMARY, status: 'empty', total: 0, groups: [], other: { count: 0, refs: [] }, headline: 'Postfach verbunden – im Posteingang liegen keine Nachrichten.' });
    renderView({ enabled: true });
    expect(await screen.findByTestId('mail-summary-empty')).toHaveTextContent('wirklich leer');
  });

  it('no answer from CORE is an error, never an empty mailbox', async () => {
    coreGet.mockResolvedValue(null);
    renderView({ enabled: true });
    const err = await screen.findByTestId('mail-summary-error');
    expect(err).toHaveTextContent('kein leeres Postfach');
    expect(screen.queryByTestId('mail-summary-empty')).toBeNull();
  });

  it('409 from CORE means not verified', async () => {
    coreGet.mockRejectedValue(Object.assign(new Error('Kein verifiziert verbundenes Postfach.'), { status: 409 }));
    renderView({ enabled: true });
    expect(await screen.findByTestId('mail-summary-error')).toHaveTextContent('Kein verifiziert verbundenes Postfach.');
  });

  it('does not call CORE when disabled', () => {
    renderView({ enabled: false });
    expect(coreGet).not.toHaveBeenCalled();
  });
});
