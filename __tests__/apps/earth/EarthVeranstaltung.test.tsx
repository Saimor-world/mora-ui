import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('@/lib/api/earthClient', () => ({
  ...jest.requireActual('@/lib/api/earthClient'),
  fetchFlaechen: jest.fn(),
  fetchAkte: jest.fn(),
  speichereAkte: jest.fn(),
}));

import EarthApp from '@/apps/earth';
import { fetchFlaechen, fetchAkte, speichereAkte } from '@/lib/api/earthClient';

const mockFlaechen = fetchFlaechen as jest.Mock;
const mockAkte = fetchAkte as jest.Mock;
const mockSpeichern = speichereAkte as jest.Mock;

const props = { paneId: 'earth-1', onClose: jest.fn(), onNavigate: jest.fn() };

const liste = {
  anzahl: 1, summe_cent: 0, offene_pflege: 0,
  flaechen: [{
    place_id: 'duenenweg', titel: 'Duenenweg', region_key: 'buesum',
    akte_angelegt: true, summe_cent: 0, offene_pflege: 0,
    veranstaltungen: 0, aktualisiert_am: '2026-08-17',
  }],
};

const antwort = {
  angelegt: true, place_id: 'duenenweg', summe_cent: 0,
  summe_nach_jahr: {}, offene_pflege: [],
  akte: {
    place_id: 'duenenweg', kosten: [], pflege: [], veranstaltungen: [],
    zustaendig: [], notiz: null, aktualisiert_am: '2026-08-17', fassung: 1,
  },
};

async function oeffnen() {
  render(<EarthApp {...props} />);
  await waitFor(() => expect(screen.getByText('Duenenweg')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Duenenweg'));
  await waitFor(() => expect(screen.getByText('Veranstaltungen')).toBeInTheDocument());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlaechen.mockResolvedValue(liste);
  mockAkte.mockResolvedValue(antwort);
  mockSpeichern.mockResolvedValue({ ok: true, antwort });
});

describe('Veranstaltung anlegen', () => {
  it('nimmt Titel und Datum auf', async () => {
    await oeffnen();
    fireEvent.click(screen.getByRole('button', { name: /termin anlegen/i }));
    fireEvent.change(screen.getByLabelText(/titel/i), { target: { value: 'Pflanzaktion' } });
    fireEvent.change(screen.getByLabelText(/^datum/i), { target: { value: '2026-09-20' } });
    fireEvent.click(screen.getByRole('button', { name: /^anlegen$/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, akte] = mockSpeichern.mock.calls[0];
    expect(akte.veranstaltungen).toHaveLength(1);
    expect(akte.veranstaltungen[0].titel).toBe('Pflanzaktion');
    expect(akte.veranstaltungen[0].am).toBe('2026-09-20');
  });

  it('ist standardmaessig intern — wer nichts entscheidet, veroeffentlicht nichts', async () => {
    await oeffnen();
    fireEvent.click(screen.getByRole('button', { name: /termin anlegen/i }));
    fireEvent.change(screen.getByLabelText(/titel/i), { target: { value: 'Pflanzaktion' } });
    fireEvent.change(screen.getByLabelText(/^datum/i), { target: { value: '2026-09-20' } });
    fireEvent.click(screen.getByRole('button', { name: /^anlegen$/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, akte] = mockSpeichern.mock.calls[0];
    expect(akte.veranstaltungen[0].oeffentlich).toBe(false);
  });

  it('schickt nichts ab ohne Titel oder Datum', async () => {
    await oeffnen();
    fireEvent.click(screen.getByRole('button', { name: /termin anlegen/i }));
    fireEvent.change(screen.getByLabelText(/titel/i), { target: { value: 'Pflanzaktion' } });
    fireEvent.click(screen.getByRole('button', { name: /^anlegen$/i }));
    expect(mockSpeichern).not.toHaveBeenCalled();
  });

  it('sagt, dass „oeffentlich" heute nur vormerkt', async () => {
    // Es gibt keinen Weg von der Akte in die oeffentliche Projektion — mit
    // Absicht. Ein Haken, der nichts veroeffentlicht, waere ein Versprechen,
    // das die Software nicht haelt.
    await oeffnen();
    fireEvent.click(screen.getByRole('button', { name: /termin anlegen/i }));
    fireEvent.click(screen.getByLabelText(/öffentlich|oeffentlich/i));
    expect(screen.getByText(/vorgemerkt|noch nicht.*Karte|nicht automatisch/i)).toBeInTheDocument();
  });
});
