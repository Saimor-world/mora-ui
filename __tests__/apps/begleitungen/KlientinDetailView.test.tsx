import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/apps/begleitungen/begleitungenClient', () => ({
  fetchBegleitungDetail: jest.fn(),
  generateSessionSummary: jest.fn(),
}));

jest.mock('@/lib/api/cognitionClient', () => ({
  executeAgenticLoop: jest.fn(),
}));

import { KlientinDetailView } from '@/apps/begleitungen/KlientinDetailView';
import { fetchBegleitungDetail } from '@/apps/begleitungen/begleitungenClient';
import { executeAgenticLoop } from '@/lib/api/cognitionClient';

const mockDetail = fetchBegleitungDetail as jest.Mock;
const mockMora = executeAgenticLoop as jest.Mock;

beforeEach(() => {
  mockDetail.mockReset();
  mockMora.mockReset();
});

const mockBegleitungDetail = {
  begleitung: {
    id: 'bgl-1',
    klientinId: 'kl-1',
    angebotId: 'a-1',
    status: 'aktiv' as const,
    startDatum: '2026-08-01',
    aktuelleWoche: 5,
    gesamtWochen: 12,
    erstelltAm: '2026-08-01T00:00:00Z',
  },
  klientin: {
    id: 'kl-1',
    name: 'Test Client',
    email: 'test@example.com',
    telefon: '+49 171 5551234',
    notizen: 'General notes about this client.',
    erstelltAm: '2026-07-15T00:00:00Z',
  },
  angebot: {
    id: 'a-1',
    name: '12-Wochen-Programm',
    typ: 'programm' as const,
    dauerWochen: 12,
  },
  sessions: [
    {
      id: 'sess-1',
      begleitungId: 'bgl-1',
      datum: '2026-09-16T10:00:00Z',
      status: 'durchgeführt' as const,
      dauer: 60,
      rohNotizen: 'Session notes here.',
      erstelltAm: '2026-09-16T11:00:00Z',
    },
    {
      id: 'sess-2',
      begleitungId: 'bgl-1',
      datum: '2026-09-02T10:00:00Z',
      status: 'durchgeführt' as const,
      dauer: 55,
      rohNotizen: 'Earlier session notes.',
      zusammenfassung: 'Already summarized.',
      naechsteSchritte: ['Step one', 'Step two'],
      erstelltAm: '2026-09-02T11:00:00Z',
    },
  ],
  dateien: [
    {
      id: 'file-1',
      begleitungId: 'bgl-1',
      name: 'Worksheet.pdf',
      typ: 'worksheet' as const,
      groesse: 245000,
      hochgeladenAm: '2026-09-02T12:00:00Z',
    },
  ],
};

describe('KlientinDetailView', () => {
  it('renders client details and progress', async () => {
    mockDetail.mockResolvedValue(mockBegleitungDetail);

    render(<KlientinDetailView begleitungId="bgl-1" onBack={jest.fn()} />);

    expect(await screen.findByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('12-Wochen-Programm')).toBeInTheDocument();
    expect(screen.getByText('Woche 5 von 12')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('+49 171 5551234')).toBeInTheDocument();
  });

  it('shows sessions in timeline with expand/collapse', async () => {
    mockDetail.mockResolvedValue(mockBegleitungDetail);
    const user = userEvent.setup();

    render(<KlientinDetailView begleitungId="bgl-1" onBack={jest.fn()} />);

    expect(await screen.findByText('Sessions (2)')).toBeInTheDocument();

    const sessionButtons = await screen.findAllByRole('button', { name: /Mo\.|Di\.|Mi\.|Do\.|Fr\.|Sa\.|So\./i });
    expect(sessionButtons.length).toBeGreaterThan(0);

    await user.click(sessionButtons[0]);

    const notizLabels = await screen.findAllByText('Notizen');
    expect(notizLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows existing summary and next steps', async () => {
    mockDetail.mockResolvedValue(mockBegleitungDetail);
    const user = userEvent.setup();

    render(<KlientinDetailView begleitungId="bgl-1" onBack={jest.fn()} />);

    await screen.findByText('Sessions (2)');

    const sessionButtons = await screen.findAllByRole('button', { name: /Mo\.|Di\.|Mi\.|Do\.|Fr\.|Sa\.|So\./i });
    await user.click(sessionButtons[1]);

    expect(await screen.findByText('Already summarized.')).toBeInTheDocument();
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByText('Step two')).toBeInTheDocument();
  });

  it('calls Mora for summary generation when button is clicked', async () => {
    mockDetail.mockResolvedValue(mockBegleitungDetail);
    mockMora.mockResolvedValue({
      final_message: 'ZUSAMMENFASSUNG: Test summary from Mora.\nNÄCHSTE SCHRITTE:\n1. First step\n2. Second step',
    });

    const user = userEvent.setup();

    render(<KlientinDetailView begleitungId="bgl-1" onBack={jest.fn()} />);

    await screen.findByText('Sessions (2)');

    const sessionButtons = await screen.findAllByRole('button', { name: /Mo\.|Di\.|Mi\.|Do\.|Fr\.|Sa\.|So\./i });
    await user.click(sessionButtons[0]);

    const summarizeButton = await screen.findByRole('button', { name: /Mit Môra zusammenfassen/ });
    await user.click(summarizeButton);

    await waitFor(() => {
      expect(mockMora).toHaveBeenCalledWith(
        expect.stringContaining('Session-Notizen'),
        expect.objectContaining({
          level: 'begleitungen',
          entityType: 'session',
          entityId: 'sess-1',
        })
      );
    });
  });

  it('shows files tab with uploaded documents', async () => {
    mockDetail.mockResolvedValue(mockBegleitungDetail);
    const user = userEvent.setup();

    render(<KlientinDetailView begleitungId="bgl-1" onBack={jest.fn()} />);

    await screen.findByText('Sessions (2)');

    await user.click(screen.getByRole('button', { name: /Dateien \(1\)/ }));

    expect(await screen.findByText('Worksheet.pdf')).toBeInTheDocument();
    expect(screen.getByText(/239 KB/)).toBeInTheDocument();
  });

  it('shows notes tab with general client notes', async () => {
    mockDetail.mockResolvedValue(mockBegleitungDetail);
    const user = userEvent.setup();

    render(<KlientinDetailView begleitungId="bgl-1" onBack={jest.fn()} />);

    await screen.findByText('Sessions (2)');

    await user.click(screen.getByRole('button', { name: /Notizen/ }));

    expect(await screen.findByText('General notes about this client.')).toBeInTheDocument();
  });

  it('handles missing detail gracefully', async () => {
    mockDetail.mockResolvedValue(null);

    render(<KlientinDetailView begleitungId="bgl-missing" onBack={jest.fn()} />);

    expect(await screen.findByText('Begleitung nicht gefunden.')).toBeInTheDocument();
  });
});
