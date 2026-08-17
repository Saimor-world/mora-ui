import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('@/lib/api/earthClient', () => ({
  fetchFlaechen: jest.fn(),
  fetchAkte: jest.fn(),
  euro: (cent: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cent / 100),
}));

import EarthApp from '@/apps/earth';
import { fetchFlaechen, fetchAkte } from '@/lib/api/earthClient';
import { APP_REGISTRY, getAppManifest } from '@/lib/apps/appRegistry';

const mockFlaechen = fetchFlaechen as jest.Mock;
const mockAkte = fetchAkte as jest.Mock;

const props = { paneId: 'earth-1', onClose: jest.fn(), onNavigate: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Registrierung
// ---------------------------------------------------------------------------

describe('Registrierung im OS', () => {
  it('steht mit einem Manifest in der App-Liste', () => {
    const manifest = getAppManifest('earth');
    expect(manifest).toBeDefined();
    expect(manifest!.name).toBeTruthy();
  });

  it('hat eine eindeutige Kennung', () => {
    const ids = APP_REGISTRY.map(a => a.id);
    expect(ids.filter(id => id === 'earth')).toHaveLength(1);
  });

  it('ist im AppLoader eingetragen — sonst laedt das Manifest ins Leere', () => {
    const quelle = require('fs').readFileSync(
      require('path').join(process.cwd(), 'lib/apps/AppLoader.tsx'),
      'utf-8',
    );
    expect(quelle).toContain("import('@/apps/earth')");
  });

  it('ist als Flaechentyp bekannt, sonst sperrt PaneManager sie aus', () => {
    const { isPaneEnabled } = require('@/lib/surface/surfaceRegistry');
    expect(isPaneEnabled('earth')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Was die Ansicht zeigt
// ---------------------------------------------------------------------------

describe('Flaechenliste', () => {
  it('zeigt jede Flaeche der Gemeinde, auch die ohne Akte', async () => {
    mockFlaechen.mockResolvedValue({
      anzahl: 2,
      summe_cent: 290_000,
      offene_pflege: 1,
      flaechen: [
        {
          place_id: 'duenenweg',
          titel: 'Duenenweg',
          region_key: 'buesum',
          akte_angelegt: true,
          summe_cent: 290_000,
          offene_pflege: 1,
          veranstaltungen: 0,
          aktualisiert_am: '2026-08-16',
        },
        {
          place_id: 'hafenkante',
          titel: 'Hafenkante',
          region_key: 'buesum',
          akte_angelegt: false,
          summe_cent: 0,
          offene_pflege: 0,
          veranstaltungen: 0,
          aktualisiert_am: null,
        },
      ],
    });

    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText('Duenenweg')).toBeInTheDocument());
    expect(screen.getByText('Hafenkante')).toBeInTheDocument();
  });

  it('unterscheidet „noch nichts erfasst" von „null Euro"', async () => {
    mockFlaechen.mockResolvedValue({
      anzahl: 1,
      summe_cent: 0,
      offene_pflege: 0,
      flaechen: [
        {
          place_id: 'hafenkante',
          titel: 'Hafenkante',
          region_key: 'buesum',
          akte_angelegt: false,
          summe_cent: 0,
          offene_pflege: 0,
          veranstaltungen: 0,
          aktualisiert_am: null,
        },
      ],
    });

    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText('Hafenkante')).toBeInTheDocument());
    // Keine erfundene Null: Wer nichts erfasst hat, liest das auch so.
    expect(screen.getByText(/nichts erfasst/i)).toBeInTheDocument();
    expect(screen.queryByText('0,00 €')).not.toBeInTheDocument();
  });

  it('sagt es, wenn die Gemeinde noch keine Flaeche hat', async () => {
    mockFlaechen.mockResolvedValue({ anzahl: 0, summe_cent: 0, offene_pflege: 0, flaechen: [] });
    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText(/noch keine Fl/i)).toBeInTheDocument());
  });

  it('nennt den Fehler, statt eine leere Liste vorzutaeuschen', async () => {
    mockFlaechen.mockResolvedValue(null);
    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText(/nicht erreichbar|nicht geladen/i)).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Die Akte
// ---------------------------------------------------------------------------

describe('Akte einer Flaeche', () => {
  const liste = {
    anzahl: 1,
    summe_cent: 290_000,
    offene_pflege: 1,
    flaechen: [
      {
        place_id: 'duenenweg',
        titel: 'Duenenweg',
        region_key: 'buesum',
        akte_angelegt: true,
        summe_cent: 290_000,
        offene_pflege: 1,
        veranstaltungen: 1,
        aktualisiert_am: '2026-08-16',
      },
    ],
  };

  it('oeffnet Haushalt, Pflege und Veranstaltungen einer Flaeche', async () => {
    mockFlaechen.mockResolvedValue(liste);
    mockAkte.mockResolvedValue({
      angelegt: true,
      place_id: 'duenenweg',
      summe_cent: 290_000,
      summe_nach_jahr: { '2026': 258_000, '2027': 32_000 },
      offene_pflege: [{ was: 'Erster Rueckschnitt', faellig_am: '2026-10-01', erledigt_am: null }],
      akte: {
        place_id: 'duenenweg',
        kosten: [
          { zweck: 'Granulat und Substrat', betrag_cent: 48_000, jahr: 2026, art: 'material' },
        ],
        pflege: [{ was: 'Erster Rueckschnitt', faellig_am: '2026-10-01', erledigt_am: null }],
        veranstaltungen: [{ titel: 'Pflanzaktion', am: '2026-09-20', oeffentlich: false }],
        zustaendig: [],
        notiz: null,
        aktualisiert_am: '2026-08-16',
      },
    });

    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText('Duenenweg')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Duenenweg'));

    await waitFor(() => expect(screen.getByText('Granulat und Substrat')).toBeInTheDocument());
    expect(screen.getByText('Erster Rueckschnitt')).toBeInTheDocument();
    expect(screen.getByText('Pflanzaktion')).toBeInTheDocument();
  });

  it('kennzeichnet nicht-oeffentliche Veranstaltungen als intern', async () => {
    mockFlaechen.mockResolvedValue(liste);
    mockAkte.mockResolvedValue({
      angelegt: true,
      place_id: 'duenenweg',
      summe_cent: 0,
      summe_nach_jahr: {},
      offene_pflege: [],
      akte: {
        place_id: 'duenenweg',
        kosten: [],
        pflege: [],
        veranstaltungen: [{ titel: 'Pflanzaktion', am: '2026-09-20', oeffentlich: false }],
        zustaendig: [],
        notiz: null,
        aktualisiert_am: '2026-08-16',
      },
    });

    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText('Duenenweg')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Duenenweg'));
    await waitFor(() => expect(screen.getByText('Pflanzaktion')).toBeInTheDocument());
    expect(screen.getByText(/intern/i)).toBeInTheDocument();
  });

  it('sagt bei fehlender Akte, dass noch nichts erfasst ist', async () => {
    mockFlaechen.mockResolvedValue(liste);
    mockAkte.mockResolvedValue({ angelegt: false, place_id: 'duenenweg' });

    render(<EarthApp {...props} />);
    await waitFor(() => expect(screen.getByText('Duenenweg')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Duenenweg'));
    await waitFor(() => expect(screen.getByText(/noch nichts erfasst/i)).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Die Trennung, die in CORE im Typsystem steht — hier in der Oberflaeche
// ---------------------------------------------------------------------------

describe('Trennung der Datenraeume', () => {
  it('liest ausschliesslich aus der Verwaltungsansicht', () => {
    const quelle = require('fs').readFileSync(
      require('path').join(process.cwd(), 'lib/api/earthClient.ts'),
      'utf-8',
    );
    // Nur echte Aufrufe, keine Verweise im Kommentar: Der Pfad muss in
    // Anfuehrungszeichen stehen, also tatsaechlich abgeschickt werden.
    const pfade = quelle.match(/['"`]\/v3\/[^'"`]+/g) || [];
    expect(pfade.length).toBeGreaterThan(0);
    for (const pfad of pfade) {
      expect(pfad).toContain('/v3/earth/verwaltung/');
    }
  });

  it('schreibt nichts in die oeffentliche Projektion', () => {
    const quelle = require('fs').readFileSync(
      require('path').join(process.cwd(), 'apps/earth/index.tsx'),
      'utf-8',
    );
    // Ein Haushaltsposten auf einer oeffentlichen Karte waere in vielen
    // Faellen unzulaessig. Diese App kennt den Weg dorthin gar nicht.
    expect(quelle).not.toContain('/public/');
    expect(quelle).not.toContain('publish');
  });
});

// ---------------------------------------------------------------------------
// Auffindbarkeit
// ---------------------------------------------------------------------------

describe('Auffindbarkeit', () => {
  it('steht in einer Gruppe der App-Uebersicht', () => {
    // Registrierung allein reicht nicht: `appUniverse` fuehrt eine eigene,
    // handgepflegte Gruppenliste. Wer nur das Manifest ergaenzt, baut eine
    // App, die niemand findet.
    const { getAppUniverseGroupForApp } = require('@/lib/openflow/appUniverse');
    expect(getAppUniverseGroupForApp('earth')).toBeDefined();
  });
});
