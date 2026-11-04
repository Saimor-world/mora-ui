import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwlCard } from '@/features/today/ui/OwlCard';
import { AgentFeed } from '@/features/mora/ui/AgentFeed';
import { MoraBriefing } from '@/features/today/ui/MoraBriefing';
import { useDemoStore } from '@/lib/demo/demoStore';

const coreGet = jest.fn();
jest.mock('@/lib/api/http', () => ({ coreGet: (...args: unknown[]) => coreGet(...args) }));

beforeEach(() => {
  useDemoStore.getState().setDemoCompany(null);
  coreGet.mockReset().mockImplementation(async (path: string) => path === '/v3/connections' ? {
    connections: [{ id: 'test-cloud', group: 'cloud', status: 'connected' }],
  } : path === '/v3/briefing' ? { status: 'ok', text: 'Private Briefing der Firma' } : path.includes('/owl') ? {
    level: 'warning', open_incidents: [], fly_in_delay_seconds: 86400,
    mail: { highlights: [{ id: 'private-invoice', subject: 'Private invoice', kind: 'bill' }] },
  } : { thoughts: [{ thought: 'Private Aktivität der Firma', type: 'signal' }] });
});
afterEach(() => { cleanup(); useDemoStore.getState().setDemoCompany(null); });

describe.each([
  ['owl', <OwlCard key="owl" live />, 'Private invoice'],
  ['agency', <AgentFeed key="agency" live demo={false} />, 'Private Aktivität der Firma'],
  ['briefing', <MoraBriefing key="briefing" live />, 'Private Briefing der Firma'],
])('%s card boundary', (_name, component, marker) => {
  it('does not load personal cards even if the parent passes live=true in demo', () => {
    useDemoStore.getState().setDemoCompany('demo-morgenrot');
    const client = new QueryClient();
    const { container } = render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
    expect(container).toBeEmptyDOMElement();
    expect(coreGet).not.toHaveBeenCalled();
  });

  it('removes cached personal content and prevents refetch on demo entry', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
    await screen.findByText(marker as string);
    const oldQueries = client.getQueryCache().getAll();
    coreGet.mockClear();
    act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
    expect(screen.queryByText(marker as string)).not.toBeInTheDocument();
    await act(async () => { for (const query of oldQueries) await query.fetch(); });
    expect(coreGet).not.toHaveBeenCalled();
  });
});
