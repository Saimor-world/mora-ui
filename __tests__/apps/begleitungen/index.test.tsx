import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const openPane = jest.fn();
const removePane = jest.fn();
const getPane = jest.fn();

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const pane = {
      id: 'bgl-pane-1',
      type: 'begleitungen',
      title: 'Begleitungen',
      position: { x: 120, y: 80 },
      size: { width: 860, height: 680 },
      minimized: false,
      zIndex: 520,
    };
    const store = {
      openPane,
      removePane,
      getPane: getPane.mockImplementation(() => pane),
      minimizePane: jest.fn(),
      focusPane: jest.fn(),
      updatePanePosition: jest.fn(),
      updatePaneSize: jest.fn(),
      activePaneId: 'bgl-pane-1',
      panes: [pane],
    };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@/lib/store/navStore', () => ({
  useNavStore: (selector?: any) => {
    const store = { isStandardMode: false };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@/apps/begleitungen/begleitungenClient', () => ({
  fetchBegleitungenOverview: jest.fn(),
  fetchBegleitungDetail: jest.fn(),
  computeAttentionSignals: jest.fn((k) => k),
  filterNeedsAttention: jest.fn((k) => k.filter((x: any) => x.attention)),
}));

jest.mock('@/lib/api/cognitionClient', () => ({
  executeAgenticLoop: jest.fn(),
}));

import BegleitungenApp from '@/apps/begleitungen/index';
import { fetchBegleitungenOverview, fetchBegleitungDetail } from '@/apps/begleitungen/begleitungenClient';
import { executeAgenticLoop } from '@/lib/api/cognitionClient';
import { APP_IDS } from '@/lib/apps/AppLoader';
import { getAppManifest } from '@/lib/apps/appRegistry';
import { SURFACE_TIERS } from '@/lib/surface/surfaceRegistry';

const mockOverview = fetchBegleitungenOverview as jest.Mock;
const mockDetail = fetchBegleitungDetail as jest.Mock;
const mockMora = executeAgenticLoop as jest.Mock;

beforeEach(() => {
  openPane.mockClear();
  mockOverview.mockReset();
  mockDetail.mockReset();
  mockMora.mockReset();
});

describe('BegleitungenApp', () => {
  it('renders the client list from backend data', async () => {
    mockOverview.mockResolvedValue({
      klientinnen: [
        {
          klientin: { id: 'kl-1', name: 'Test Person', email: 'test@example.com', erstelltAm: '2026-01-01' },
          begleitung: { id: 'bgl-1', klientinId: 'kl-1', angebotId: 'a-1', status: 'aktiv', startDatum: '2026-08-01', aktuelleWoche: 5, gesamtWochen: 12, erstelltAm: '2026-08-01' },
          angebot: { id: 'a-1', name: '12-Wochen-Programm', typ: 'programm' },
          sessionCount: 3,
        },
      ],
      needsAttention: [],
      stats: { aktiv: 1, pausiert: 0, abgeschlossen: 0, total: 1 },
    });

    render(<BegleitungenApp paneId="bgl-pane-1" />);

    expect(await screen.findByText('Test Person')).toBeInTheDocument();
    expect(screen.getByText(/12-Wochen-Programm, Woche 5 von 12/)).toBeInTheDocument();
    expect(screen.getByText('3 Sessions')).toBeInTheDocument();
  });

  it('shows attention badge when clients need attention', async () => {
    mockOverview.mockResolvedValue({
      klientinnen: [
        {
          klientin: { id: 'kl-1', name: 'Needs Attention', email: 'test@example.com', erstelltAm: '2026-01-01' },
          begleitung: { id: 'bgl-1', klientinId: 'kl-1', angebotId: 'a-1', status: 'aktiv', startDatum: '2026-08-01', erstelltAm: '2026-08-01' },
          angebot: { id: 'a-1', name: 'Beratung', typ: 'laufend' },
          sessionCount: 2,
          attention: { typ: 'keine_session', nachricht: 'Keine Session seit 18 Tagen', dringlichkeit: 'mittel', tage: 18 },
        },
      ],
      needsAttention: [
        {
          klientin: { id: 'kl-1', name: 'Needs Attention', email: 'test@example.com', erstelltAm: '2026-01-01' },
          begleitung: { id: 'bgl-1', klientinId: 'kl-1', angebotId: 'a-1', status: 'aktiv', startDatum: '2026-08-01', erstelltAm: '2026-08-01' },
          angebot: { id: 'a-1', name: 'Beratung', typ: 'laufend' },
          sessionCount: 2,
          attention: { typ: 'keine_session', nachricht: 'Keine Session seit 18 Tagen', dringlichkeit: 'mittel', tage: 18 },
        },
      ],
      stats: { aktiv: 1, pausiert: 0, abgeschlossen: 0, total: 1 },
    });

    render(<BegleitungenApp paneId="bgl-pane-1" />);

    expect(await screen.findByText('Keine Session seit 18 Tagen')).toBeInTheDocument();
    expect(screen.getByText('1 Begleitung braucht Aufmerksamkeit')).toBeInTheDocument();
  });

  it('filters clients by status', async () => {
    mockOverview.mockResolvedValue({
      klientinnen: [
        {
          klientin: { id: 'kl-1', name: 'Active Client', email: 'a@example.com', erstelltAm: '2026-01-01' },
          begleitung: { id: 'bgl-1', klientinId: 'kl-1', angebotId: 'a-1', status: 'aktiv', startDatum: '2026-08-01', erstelltAm: '2026-08-01' },
          angebot: { id: 'a-1', name: 'Programm', typ: 'programm' },
          sessionCount: 5,
        },
        {
          klientin: { id: 'kl-2', name: 'Done Client', email: 'b@example.com', erstelltAm: '2026-01-01' },
          begleitung: { id: 'bgl-2', klientinId: 'kl-2', angebotId: 'a-1', status: 'abgeschlossen', startDatum: '2026-06-01', erstelltAm: '2026-06-01' },
          angebot: { id: 'a-1', name: 'Programm', typ: 'programm' },
          sessionCount: 12,
        },
      ],
      needsAttention: [],
      stats: { aktiv: 1, pausiert: 0, abgeschlossen: 1, total: 2 },
    });

    const user = userEvent.setup();
    render(<BegleitungenApp paneId="bgl-pane-1" />);

    expect(await screen.findByText('Active Client')).toBeInTheDocument();
    expect(screen.getByText('Done Client')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abgeschlossen' }));

    await waitFor(() => {
      expect(screen.queryByText('Active Client')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Done Client')).toBeInTheDocument();
  });

  it('shows empty state when no clients exist', async () => {
    mockOverview.mockResolvedValue({
      klientinnen: [],
      needsAttention: [],
      stats: { aktiv: 0, pausiert: 0, abgeschlossen: 0, total: 0 },
    });

    render(<BegleitungenApp paneId="bgl-pane-1" />);

    expect(await screen.findByText('Noch keine Begleitungen angelegt.')).toBeInTheDocument();
    expect(screen.getByText('Erste Begleitung anlegen')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockOverview.mockResolvedValue(null);

    render(<BegleitungenApp paneId="bgl-pane-1" />);

    expect(await screen.findByText('Begleitungen konnten nicht geladen werden.')).toBeInTheDocument();
  });

  it('is registered across the app platform', () => {
    expect(APP_IDS).toContain('begleitungen');
    expect(getAppManifest('begleitungen')).toBeDefined();
    expect(SURFACE_TIERS.begleitungen).toBe('app');
  });

  it('has correct manifest metadata', () => {
    const manifest = getAppManifest('begleitungen');
    expect(manifest?.name).toBe('Begleitungen');
    expect(manifest?.category).toBe('people');
    expect(manifest?.icon).toBe('Users');
  });
});
