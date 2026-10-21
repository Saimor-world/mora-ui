import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/os-prototype/useCoreHealth', () => ({
  useCoreHealth: () => ({ data: { state: 'offline', build: null, environment: null }, isLoading: false }),
}));
jest.mock('@/lib/api/moraAgentClient', () => ({ moraAgentClient: { chat: jest.fn() } }));
jest.mock('@/lib/api/searchClient', () => ({ searchGlobal: jest.fn() }));

jest.mock('@/features/today/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-today' }, 'today') }));
jest.mock('@/features/mora/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-mora' }, 'mora') }));
jest.mock('@/features/finance/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-finance' }, 'finance') }));
jest.mock('@/features/post/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-post' }, 'post') }));
jest.mock('@/features/knowledge/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-knowledge' }, 'knowledge') }));
jest.mock('@/features/settings/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-settings' }, 'settings') }));
jest.mock('@/features/labs/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-labs' }, 'labs') }));

import { OsShell } from '@/components/os-shell/OsShell';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

function renderShell(preview = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><OsShell preview={preview} /></QueryClientProvider>);
}

describe('OsShell navigation', () => {
  beforeEach(() => {
    window.location.hash = '';
    useOsShellStore.setState({ activeFeatureId: 'today', moraOpen: false, paletteOpen: false });
    useSessionStore.setState({ user: { id: 'u1', name: 'Test Owner', role: 'owner', tenant_id: 't1' } as any });
  });

  it('renders the six primary surfaces and Labs from manifests', async () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    for (const label of ['Heute', 'MÔRA', 'Finance', 'Post', 'Wissen', 'Einstellungen', 'Labs & System']) {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(await screen.findByTestId('feature-today')).toBeInTheDocument();
  });

  it('navigates via manifests and reflects it in the hash', async () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Finance' }));
    expect(await screen.findByTestId('feature-finance')).toBeInTheDocument();
    expect(window.location.hash).toBe('#finance');
    expect(within(nav).getByRole('button', { name: 'Finance' }).closest('[data-feature]')).toHaveAttribute('data-active', 'true');
  });

  it('opens MÔRA globally (toggle and ⌘J) with module context', async () => {
    renderShell();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Hauptnavigation' })).getByRole('button', { name: 'Post' }));
    await screen.findByTestId('feature-post');
    act(() => { fireEvent.keyDown(window, { key: 'j', metaKey: true }); });
    const panel = await screen.findByTestId('mora-console-panel');
    expect(panel).toHaveTextContent('Kontext: Post');
    expect(panel).toHaveTextContent('nur mit Bestätigung');
  });

  it('command palette (⌘K) lists features and legacy apps', async () => {
    renderShell();
    act(() => { fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); });
    const input = await screen.findByLabelText('Suchen oder Befehl');
    fireEvent.change(input, { target: { value: 'scanner' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Scanner/ })).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /MÔRA fragen/ })).toBeInTheDocument();
  });

  it('hides Finance for roles without permission', () => {
    useSessionStore.setState({ user: { id: 'u2', name: 'M', role: 'member', tenant_id: 't1' } as any });
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    expect(within(nav).queryByRole('button', { name: 'Finance' })).toBeNull();
  });

  it('labels the local preview clearly', () => {
    renderShell(true);
    expect(screen.getByTestId('os-preview-banner')).toHaveTextContent('keine echten Daten');
  });
});
