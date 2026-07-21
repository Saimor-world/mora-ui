import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const openPane = jest.fn();
const removePane = jest.fn();
const getPane = jest.fn();
jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const pane = {
      id: 'nw-1',
      type: 'nightwatch',
      title: 'Nightwatch',
      position: { x: 120, y: 80 },
      size: { width: 720, height: 560 },
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
      activePaneId: 'nw-1',
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

jest.mock('@/lib/api/nightwatchClient', () => ({
  fetchAllNightwatchIncidents: jest.fn(),
  fetchNightwatchIncidents: jest.fn(),
  fetchNightwatchMonitors: jest.fn(),
}));

import NightwatchApp from '@/apps/nightwatch/index';
import { fetchAllNightwatchIncidents, fetchNightwatchIncidents, fetchNightwatchMonitors } from '@/lib/api/nightwatchClient';
import { APP_IDS } from '@/lib/apps/AppLoader';
import { getAppManifest } from '@/lib/apps/appRegistry';
import { SURFACE_TIERS } from '@/lib/surface/surfaceRegistry';

const incidents = fetchNightwatchIncidents as jest.Mock;
const incidentHistory = fetchAllNightwatchIncidents as jest.Mock;
const monitors = fetchNightwatchMonitors as jest.Mock;

beforeEach(() => {
  openPane.mockClear();
  incidents.mockReset();
  incidentHistory.mockReset();
  incidentHistory.mockResolvedValue([]);
  monitors.mockReset();
});

describe('NightwatchApp', () => {
  it('renders open incidents from CORE', async () => {
    incidents.mockResolvedValue([
      { id: 'inc-1', title: 'api.saimor.world down', severity: 'critical', status: 'open', host: 'api.saimor.world', summary: '502 Bad Gateway' },
    ]);
    monitors.mockResolvedValue([{ id: 'm-1', name: 'API', host: 'api.saimor.world' }]);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);

    expect(await screen.findByText('api.saimor.world down')).toBeInTheDocument();
    expect(screen.getByText('502 Bad Gateway')).toBeInTheDocument();
  });

  it('shows a calm empty state when there are no open incidents', async () => {
    incidents.mockResolvedValue([]);
    monitors.mockResolvedValue([{ id: 'm-1', name: 'API', host: 'api.saimor.world' }]);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);

    expect(await screen.findByText(/Keine offenen Vorfälle/i)).toBeInTheDocument();
  });

  it('uses resolved incidents for the seven-day history', async () => {
    incidents.mockResolvedValue([]);
    incidentHistory.mockResolvedValue([
      { id: 'old-1', title: 'resolved', severity: 'warning', status: 'resolved', detected_at: new Date().toISOString() },
    ]);
    monitors.mockResolvedValue([]);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);

    expect(await screen.findByLabelText('1 Vorfälle im Verlauf')).toBeInTheDocument();
    expect(screen.getByText('1 erfasste Ereignisse')).toBeInTheDocument();
  });

  it('shows monitor status down even without a matching incident', async () => {
    incidents.mockResolvedValue([]);
    monitors.mockResolvedValue([{ id: 'm-1', name: 'Worker', host: 'worker', status: 'down' }]);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);

    expect(await screen.findAllByText('Down')).toHaveLength(2);
    expect(screen.getByText('nicht erreichbar')).toBeInTheDocument();
  });

  it('links the glance pane to the full Saimôr Desk nightwatch view', async () => {
    incidents.mockResolvedValue([]);
    monitors.mockResolvedValue([]);
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);
    (await screen.findByLabelText('Nightwatch-Dashboard öffnen')).click();

    expect(open).toHaveBeenCalledWith(
      'https://dash.saimor.world/nightwatch',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });

  it('degrades gracefully when the API fails', async () => {
    incidents.mockRejectedValue(new Error('network'));
    monitors.mockRejectedValue(new Error('network'));

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);

    // Still renders the panel, but never presents missing data as a healthy empty state.
    expect(await screen.findByTestId('nightwatch-app')).toBeInTheDocument();
    expect(await screen.findByText(/Keine belastbaren Betriebsdaten/i)).toBeInTheDocument();
    expect(screen.queryByText(/Keine offenen Vorfälle/i)).not.toBeInTheDocument();
  });

  it('opens an incident in a document pane (read-only navigation)', async () => {
    incidents.mockResolvedValue([
      { id: 'inc-9', title: 'DB langsam', severity: 'warning', status: 'open', host: 'db' },
    ]);
    monitors.mockResolvedValue([]);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);

    const btn = await screen.findByLabelText('Vorfall öffnen');
    btn.click();

    await waitFor(() => {
      expect(openPane).toHaveBeenCalledWith(expect.objectContaining({
        type: 'document',
        data: { nodeId: 'inc-9' },
      }));
    });
  });

  it('exposes NO write/repair actions', async () => {
    incidents.mockResolvedValue([
      { id: 'inc-1', title: 'api down', severity: 'critical', status: 'open', host: 'api' },
    ]);
    monitors.mockResolvedValue([{ id: 'm-1', name: 'API', host: 'api' }]);

    render(<NightwatchApp paneId="nw-1" initialData={{}} />);
    await screen.findByText('api down');

    expect(screen.queryByText(/reparieren/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/beheben/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/neustart/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bestätigen/i)).not.toBeInTheDocument();
  });

  it('is registered across the app platform', () => {
    expect(APP_IDS).toContain('nightwatch');
    expect(getAppManifest('nightwatch')).toBeDefined();
    expect(SURFACE_TIERS.nightwatch).toBe('app');
  });
});
