import React from 'react';
import { render, screen } from '@testing-library/react';

/**
 * Der Nachweis, den die Textsuche nicht fuehren kann.
 *
 * Im Browser oeffnete sich das Fenster der Ortsansicht — und blieb leer.
 * Ursache: Der PaneManager hatte eine handgepflegte Zweigliste, `earth`
 * fehlte darin, und `default` gab wortlos `null` zurueck. Alle 1132 Tests
 * waren gruen.
 *
 * Diese Datei rendert den PaneManager wirklich und prueft fuer jede
 * registrierte App, dass etwas herauskommt.
 */

const panes: any[] = [];

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const store = {
      panes,
      openPane: jest.fn(), removePane: jest.fn(), minimizePane: jest.fn(),
      focusPane: jest.fn(), getPane: (id: string) => panes.find(p => p.id === id),
      updatePanePosition: jest.fn(), updatePaneSize: jest.fn(), activePaneId: null,
    };
    return selector ? selector(store) : store;
  },
}));

// Der AppLoader laedt per dynamic() — in Jest interessiert nur, DASS er
// aufgerufen wird und mit welcher Kennung.
jest.mock('@/lib/apps/AppLoader', () => ({
  ...jest.requireActual('@/lib/apps/AppLoader'),
  AppLoader: ({ appId }: { appId: string }) => <div data-testid="app">{appId}</div>,
}));

import { PaneManager } from '@/components/mora/PaneManager';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';

function zeige(type: string) {
  panes.length = 0;
  panes.push({
    id: `${type}-main`, type, title: type,
    position: { x: 0, y: 0 }, size: { width: 600, height: 400 },
    minimized: false, zIndex: 100,
  });
  return render(<PaneManager />);
}

/** Ohne eigenen Flaechentyp — nur ueber andere Wege erreichbar. */
const OHNE_FLAECHE = new Set(['action-center']);

describe('Jede registrierte App erscheint im Fenster', () => {
  const ids = APP_REGISTRY.map(a => a.id).filter(id => !OHNE_FLAECHE.has(id));

  it.each(ids)('%s rendert Inhalt statt null', id => {
    const { unmount } = zeige(id);
    expect(screen.getByTestId('app')).toHaveTextContent(id);
    unmount();
  });
});

describe('Die Namen aus frueheren Ausbaustufen zeigen weiterhin richtig', () => {
  it('space oeffnet den Finder', () => {
    const { unmount } = zeige('space');
    expect(screen.getByTestId('app')).toHaveTextContent('finder');
    unmount();
  });

  it('actions oeffnet das Action-Center', () => {
    const { unmount } = zeige('actions');
    expect(screen.getByTestId('app')).toHaveTextContent('action-center');
    unmount();
  });
});

describe('Unbekanntes bleibt leer', () => {
  it('ein Fenstertyp ohne App rendert nichts', () => {
    const { unmount } = zeige('gibt-es-nicht');
    expect(screen.queryByTestId('app')).toBeNull();
    unmount();
  });
});
