import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/os-prototype/useCoreHealth', () => ({
  useCoreHealth: () => ({ data: { state: 'offline', build: null, environment: null }, isLoading: false }),
}));
jest.mock('@/lib/api/moraAgentClient', () => ({ moraAgentClient: { chat: jest.fn() } }));
jest.mock('@/lib/api/searchClient', () => ({ searchGlobal: jest.fn() }));
jest.mock('@/components/os/shell/ShellStaticBackdrop', () => ({ ShellStaticBackdrop: () => require('react').createElement('div', { 'data-testid': 'legacy-static-backdrop' }) }));
jest.mock('@/components/mora/MoraLivingBackground', () => ({ MoraLivingBackground: () => require('react').createElement('div', { 'data-testid': 'legacy-living-background' }) }));
jest.mock('@/components/os/RitualSceneStyler', () => ({ RitualSceneStyler: ({ muted }: { muted?: boolean }) => require('react').createElement('div', { 'data-testid': 'legacy-ritual-styler', 'data-muted': String(Boolean(muted)) }) }));
jest.mock('@/components/home/UniverseView', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'legacy-universe-view' }) }));
jest.mock('@/features/today/index', () => ({
  __esModule: true,
  default: ({ navigate }: { navigate: (id: string) => void }) => require('react').createElement('button', { 'data-testid': 'today-universe-card', onClick: () => navigate('universe') }, 'Den Raum deines Unternehmens betreten'),
}));

import { OsShell } from '@/components/os-shell/OsShell';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

function renderShell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><OsShell preview /></QueryClientProvider>);
}

describe('OS V1.1 Universe & Atmosphäre', () => {
  beforeEach(() => {
    window.location.hash = '';
    useOsShellStore.setState({ activeFeatureId: 'today', moraOpen: false, paletteOpen: false });
    useSessionStore.setState({ user: { id: 'u1', name: 'Test Owner', role: 'owner', tenant_id: 't1' } as any });
  });

  it('renders the universe layer calm on Heute: legacy backdrop + dimmed plate, no living background, no stars', async () => {
    renderShell();
    await screen.findByTestId('today-universe-card');
    const layer = screen.getByTestId('os-universe-layer');
    expect(layer).toHaveAttribute('data-mode', 'calm');
    expect(layer).toHaveAttribute('data-motion', 'off');
    expect(within(layer).getByTestId('legacy-static-backdrop')).toBeInTheDocument();
    expect(within(layer).getByTestId('os-atmo-plate')).toBeInTheDocument();
    expect(within(layer).queryByTestId('legacy-living-background')).toBeNull();
    expect(within(layer).queryByTestId('os-atmo-motion')).toBeNull();
    expect(within(layer).queryByTestId('legacy-ritual-styler')).toBeNull();
  });

  it('Heute → Universe: opens the ORIGINAL Organisationsfeld (real UniverseView with session), OS-Bereiche lens shows the landscape, atmosphere switches to universe', async () => {
    renderShell();
    fireEvent.click(await screen.findByTestId('today-universe-card'));
    expect(await screen.findByTestId('legacy-universe-view')).toBeInTheDocument();
    expect(window.location.hash).toBe('#universe');
    fireEvent.click(screen.getByTestId('universe-lens-landscape'));
    expect(await screen.findByTestId('universe-landscape')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('universe-lens-organization'));
    const layer = screen.getByTestId('os-universe-layer');
    expect(layer).toHaveAttribute('data-mode', 'universe');
    expect(within(layer).getByTestId('legacy-living-background')).toBeInTheDocument();
    expect(within(layer).getByTestId('legacy-ritual-styler')).toHaveAttribute('data-muted', 'true');
    // jsdom: narrow default + no idle → stars/atmosphere stay off (lazy, capability-gated)
    expect(layer).toHaveAttribute('data-motion', 'off');
  });

  it('Universe is a second-level nav entry, the six main surfaces stay', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    expect(within(nav).getByRole('button', { name: 'Universe' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'MÔRA' }).querySelector('[data-testid="mora-stone"]')).not.toBeNull();
  });

  it('deep link #universe opens the place', async () => {
    window.location.hash = '#universe';
    renderShell();
    await waitFor(() => expect(screen.getByTestId('os-shell')).toHaveAttribute('data-atmosphere', 'universe'));
    expect(await screen.findByTestId('feature-universe')).toBeInTheDocument();
  });
});
