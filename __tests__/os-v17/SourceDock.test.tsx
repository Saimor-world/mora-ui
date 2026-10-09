import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const coreGet = jest.fn();
const corePost = jest.fn();
let local = true;
jest.mock('@/lib/api/http', () => ({ coreGet: (...a: unknown[]) => coreGet(...a), corePost: (...a: unknown[]) => corePost(...a), getCoreBaseUrl: () => 'http://localhost:8081' }));
jest.mock('@/lib/os-prototype/useSources', () => {
  const actual = jest.requireActual('@/lib/os-prototype/useSources');
  return { ...actual, isLocalCore: () => local };
});
jest.mock('@/lib/queries/useDepartments', () => ({ useDepartments: () => ({ data: [{ id: 'd1', name: 'Management' }, { id: 'd2', name: 'Wissen' }] }) }));

import { SourceDock } from '@/features/settings/ui/SourceDock';

const CONNECTIONS = {
  connections: [
    { id: 'nextcloud', label: 'Nextcloud', group: 'cloud', status: 'available', detail: '', action: { kind: 'credentials', provider: 'nextcloud', field_schema: [{ name: 'server_url', label: 'Server-URL', type: 'url', required: true }] } },
    { id: 'gdrive', label: 'Google Drive', group: 'cloud', status: 'setup_required', detail: '' },
    { id: 'notion', label: 'Notion', group: 'creator', status: 'available', detail: '', action: { kind: 'credentials', provider: 'notion', field_schema: [{ name: 'token', label: 'Token', type: 'password' }] } },
  ],
};

function renderDock(props: Partial<React.ComponentProps<typeof SourceDock>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><SourceDock live {...props} /></QueryClientProvider>);
}

beforeEach(() => {
  local = true;
  coreGet.mockReset(); corePost.mockReset();
  coreGet.mockImplementation(async (path: string) => (path === '/v3/briefing' ? { status: 'degraded' } : CONNECTIONS));
});

describe('V1.7 SourceDock', () => {
  it('shows a labelled example scene without a session and never calls CORE', () => {
    renderDock({ live: false });
    expect(screen.getByTestId('sources-panel')).toHaveAttribute('data-state', 'sample');
    expect(screen.getByText('Echt wird es mit deiner CORE-Sitzung.')).toBeInTheDocument();
    expect(screen.getByText('Beispiel')).toBeInTheDocument();
    expect(coreGet).not.toHaveBeenCalled();
  });

  it('one focused action → approval → credentials → docked with an honest first signal', async () => {
    renderDock({ navigate: jest.fn() });
    const primary = await screen.findByTestId('dock-primary');
    expect(primary).toHaveTextContent('Nextcloud andocken');
    expect(screen.queryByTestId('dock-station-gdrive')).toBeNull(); // Admin-Fall erst hinter „Weitere“
    fireEvent.click(primary);
    expect(screen.getByTestId('dock-consent')).toHaveTextContent('dockt an Wissen');
    fireEvent.click(screen.getByTestId('dock-approve'));
    const form = screen.getByTestId('dock-form-nextcloud');
    fireEvent.change(form.querySelector('input')!, { target: { value: 'http://localhost:8080' } });
    corePost.mockResolvedValueOnce({ status: 'connected' });
    fireEvent.click(screen.getByTestId('dock-submit'));
    await screen.findByTestId('dock-docked');
    expect(corePost).toHaveBeenCalledWith('/v3/connections/nextcloud/connect', { server_url: 'http://localhost:8080' });
    await waitFor(() => expect(screen.getByTestId('dock-first-signal')).toHaveTextContent('Kommt mit dem ersten Abgleich.'));
  });

  it('translates a raw CORE error and keeps the original as detail', async () => {
    renderDock();
    await screen.findByTestId('dock-primary');
    fireEvent.click(screen.getByTestId('dock-more'));
    fireEvent.click(screen.getByTestId('dock-station-notion'));
    fireEvent.click(screen.getByTestId('dock-approve'));
    corePost.mockRejectedValueOnce(new Error('Notion rejected the token'));
    fireEvent.click(screen.getByTestId('dock-submit'));
    expect(await screen.findByTestId('dock-error')).toHaveTextContent('Die Zugangsdaten wurden abgelehnt.');
    expect(screen.getByTestId('dock-error-raw')).toHaveTextContent('Notion rejected the token');
  });

  it('admin set-up is shown as contour without a connect button', async () => {
    renderDock();
    await screen.findByTestId('dock-primary');
    fireEvent.click(screen.getByTestId('dock-more'));
    fireEvent.click(screen.getByTestId('dock-station-gdrive'));
    expect(screen.getByTestId('dock-admin')).toHaveTextContent('richtet ein Admin');
    expect(screen.queryByTestId('dock-approve')).toBeNull();
  });

  it('never connects when CORE is not local', async () => {
    local = false;
    renderDock();
    const primary = await screen.findByTestId('dock-primary');
    expect(primary).toBeDisabled();
    expect(screen.getByTestId('dock-idle')).toHaveTextContent('nur lokal');
    expect(corePost).not.toHaveBeenCalled();
  });
});
