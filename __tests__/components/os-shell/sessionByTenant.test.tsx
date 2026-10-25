import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/os-prototype/useCoreHealth', () => ({ useCoreHealth: () => ({ data: { state: 'online' }, isLoading: false }) }));
jest.mock('@/lib/api/moraAgentClient', () => ({ moraAgentClient: { chat: jest.fn() } }));
jest.mock('@/lib/api/searchClient', () => ({ searchGlobal: jest.fn() }));
jest.mock('@/features/today/index', () => ({ __esModule: true, default: () => require('react').createElement('div', { 'data-testid': 'feature-today' }) }));
// Nur die Weitergabe interessiert: Ist die Sitzung für das Onboarding „live“?
jest.mock('@/components/os-shell/OsOnboarding', () => ({ OsOnboarding: ({ live }: { live: boolean }) => require('react').createElement('div', { 'data-testid': 'onboarding-probe', 'data-live': String(live) }) }));

import { OsShell } from '@/components/os-shell/OsShell';
import { useSessionStore } from '@/lib/store/sessionStore';

function renderShell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><OsShell preview={false} /></QueryClientProvider>);
}

describe('Sitzung über tenant_id, nicht über den Namen', () => {
  it('ohne hinterlegten Namen ist die Sitzung trotzdem echt (Onboarding zeigt die echte Andockstation)', () => {
    useSessionStore.setState({ user: { id: 'u-beispiel', name: '', role: 'owner', tenant_id: 'tenant-beispiel-lea' } as any });
    renderShell();
    expect(screen.getByTestId('onboarding-probe')).toHaveAttribute('data-live', 'true');
  });

  it('ohne Sitzung ist nichts live', () => {
    useSessionStore.setState({ user: null });
    renderShell();
    expect(screen.getByTestId('onboarding-probe')).toHaveAttribute('data-live', 'false');
  });
});
