import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Nur die Netzwege werden ersetzt. `centAusEingabe` rechnet Geld um — eine
// nachgebaute Fassung im Mock wuerde die Attrappe pruefen statt die
// Umrechnung, und genau die soll hier stimmen.
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
  anzahl: 1,
  summe_cent: 48_000,
  offene_pflege: 1,
  flaechen: [{
    place_id: 'duenenweg', titel: 'Duenenweg', region_key: 'buesum',
    akte_angelegt: true, summe_cent: 48_000, offene_pflege: 1,
    veranstaltungen: 0, aktualisiert_am: '2026-08-17',
  }],
};

function akteAntwort(over: any = {}) {
  return {
    angelegt: true, place_id: 'duenenweg', summe_cent: 48_000,
    summe_nach_jahr: { '2026': 48_000 },
    offene_pflege: [{ was: 'Rueckschnitt', faellig_am: '2026-10-01', erledigt_am: null }],
    akte: {
      place_id: 'duenenweg',
      kosten: [{ zweck: 'Granulat', betrag_cent: 48_000, jahr: 2026, art: 'material' }],
      pflege: [{ was: 'Rueckschnitt', faellig_am: '2026-10-01', erledigt_am: null }],
      veranstaltungen: [], zustaendig: [], notiz: null,
      aktualisiert_am: '2026-08-17', fassung: 3,
      ...over,
    },
  };
}

async function oeffneAkte() {
  render(<EarthApp {...props} />);
  await waitFor(() => expect(screen.getByText('Duenenweg')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Duenenweg'));
  await waitFor(() => expect(screen.getByText('Granulat')).toBeInTheDocument());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFlaechen.mockResolvedValue(liste);
  mockAkte.mockResolvedValue(akteAntwort());
  mockSpeichern.mockResolvedValue({ ok: true, antwort: akteAntwort() });
});

describe('Kosten erfassen', () => {
  it('nimmt einen Posten auf, ohne die vorhandenen zu verlieren', async () => {
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /posten/i }));

    fireEvent.change(screen.getByLabelText(/zweck/i), { target: { value: 'Saatgut' } });
    fireEvent.change(screen.getByLabelText(/betrag/i), { target: { value: '120,50' } });
    fireEvent.click(screen.getByRole('button', { name: /eintragen/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, akte] = mockSpeichern.mock.calls[0];
    expect(akte.kosten).toHaveLength(2);
    expect(akte.kosten[0].zweck).toBe('Granulat');
  });

  it('rechnet Euro in Cent — ganzzahlig, ohne Gleitkomma', async () => {
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /posten/i }));
    fireEvent.change(screen.getByLabelText(/zweck/i), { target: { value: 'Saatgut' } });
    fireEvent.change(screen.getByLabelText(/betrag/i), { target: { value: '120,50' } });
    fireEvent.click(screen.getByRole('button', { name: /eintragen/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, akte] = mockSpeichern.mock.calls[0];
    const neu = akte.kosten[akte.kosten.length - 1];
    expect(neu.betrag_cent).toBe(12050);
    expect(Number.isInteger(neu.betrag_cent)).toBe(true);
  });

  it('nimmt auch den Punkt als Dezimaltrenner', async () => {
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /posten/i }));
    fireEvent.change(screen.getByLabelText(/zweck/i), { target: { value: 'Saatgut' } });
    fireEvent.change(screen.getByLabelText(/betrag/i), { target: { value: '120.5' } });
    fireEvent.click(screen.getByRole('button', { name: /eintragen/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, akte] = mockSpeichern.mock.calls[0];
    expect(akte.kosten[akte.kosten.length - 1].betrag_cent).toBe(12050);
  });

  it('schickt nichts ab, solange der Zweck fehlt', async () => {
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /posten/i }));
    fireEvent.change(screen.getByLabelText(/betrag/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /eintragen/i }));
    expect(mockSpeichern).not.toHaveBeenCalled();
  });

  it('schickt den gelesenen Stand mit — sonst ueberschreibt es fremde Arbeit', async () => {
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /posten/i }));
    fireEvent.change(screen.getByLabelText(/zweck/i), { target: { value: 'Saatgut' } });
    fireEvent.change(screen.getByLabelText(/betrag/i), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /eintragen/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, , erwartet] = mockSpeichern.mock.calls[0];
    expect(erwartet).toBe(3);
  });
});

describe('Pflege abhaken', () => {
  it('setzt ein Erledigungsdatum, statt den Termin zu loeschen', async () => {
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /erledigt/i }));

    await waitFor(() => expect(mockSpeichern).toHaveBeenCalled());
    const [, akte] = mockSpeichern.mock.calls[0];
    // Der Nachweis braucht beides: was anstand und was getan wurde.
    expect(akte.pflege).toHaveLength(1);
    expect(akte.pflege[0].erledigt_am).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('Wenn jemand anders schneller war', () => {
  it('sagt es und laedt neu, statt die fremde Aenderung zu verschlucken', async () => {
    mockSpeichern.mockResolvedValue({ ok: false, konflikt: true });
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /erledigt/i }));

    await waitFor(() =>
      expect(screen.getByText(/zwischenzeitlich|jemand anders/i)).toBeInTheDocument(),
    );
    // Neu geladen: Der Nutzer sieht den echten Stand, nicht seinen alten.
    await waitFor(() => expect(mockAkte).toHaveBeenCalledTimes(2));
  });

  it('meldet auch den gewoehnlichen Fehlschlag, statt Erfolg vorzugeben', async () => {
    mockSpeichern.mockResolvedValue({ ok: false, konflikt: false });
    await oeffneAkte();
    fireEvent.click(screen.getByRole('button', { name: /erledigt/i }));
    await waitFor(() =>
      expect(screen.getByText(/nicht gespeichert|fehlgeschlagen/i)).toBeInTheDocument(),
    );
  });
});
