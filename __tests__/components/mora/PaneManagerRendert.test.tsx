import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useNavStore } from '@/lib/store/navStore';

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
  AppLoader: ({ appId, paneId, initialData }: { appId: string; paneId: string; initialData?: any }) => {
    const [draft, setDraft] = React.useState('');
    return <div data-testid="app" hidden={panes.find(pane => pane.id === paneId)?.minimized}>{appId}
      {appId === 'chat' && <input aria-label="Conversation draft" value={draft} onChange={event => setDraft(event.target.value)} />}
      {appId === 'chat' && <output data-testid="launch-text">{initialData?.initialMessage}</output>}
    </div>;
  },
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

describe('Conversation lifetime', () => {
  it('keeps a conversation while minimized, but discards it on close or company switch', () => {
    useNavStore.setState({ activeCompanyId: 'company-a' });
    const view = zeige('chat');
    fireEvent.change(screen.getByRole('textbox', { name: 'Conversation draft' }), { target: { value: 'Still writing' } });
    panes[0] = { ...panes[0], minimized: true };
    view.rerender(<PaneManager />);
    expect(screen.getByTestId('app')).not.toBeVisible();
    panes[0] = { ...panes[0], minimized: false };
    view.rerender(<PaneManager />);
    expect(screen.getByRole('textbox', { name: 'Conversation draft' })).toHaveValue('Still writing');

    act(() => useNavStore.setState({ activeCompanyId: 'company-b' }));
    expect(screen.getByRole('textbox', { name: 'Conversation draft' })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: 'Conversation draft' }), { target: { value: 'Company B draft' } });
    const closed = panes.pop();
    view.rerender(<PaneManager />);
    panes.push(closed);
    view.rerender(<PaneManager />);
    expect(screen.getByRole('textbox', { name: 'Conversation draft' })).toHaveValue('');
  });

  it('does not load a persisted minimized conversation before the user opens it', () => {
    panes.length = 0;
    panes.push({ id: 'chat-main', type: 'chat', minimized: true });
    render(<PaneManager />);
    expect(screen.queryByTestId('app')).not.toBeInTheDocument();
  });

  it('does not replay launch text after switching companies, including on return', () => {
    useNavStore.setState({ activeCompanyId: 'company-a' });
    const view = zeige('chat');
    panes[0] = { ...panes[0], data: { initialMessage: 'Company A question' } };
    view.rerender(<PaneManager />);
    expect(screen.getByTestId('launch-text')).toHaveTextContent('Company A question');
    act(() => useNavStore.setState({ activeCompanyId: 'company-b' }));
    expect(screen.getByTestId('launch-text')).toBeEmptyDOMElement();
    act(() => useNavStore.setState({ activeCompanyId: 'company-a' }));
    expect(screen.getByTestId('launch-text')).toBeEmptyDOMElement();
    panes[0] = { ...panes[0], data: { initialMessage: 'New explicit question' } };
    view.rerender(<PaneManager />);
    expect(screen.getByTestId('launch-text')).toHaveTextContent('New explicit question');
  });
});
