import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHomeStatus, useHomeView } from '@/lib/queries/useHomeView';

jest.mock('@/lib/api/http', () => ({
    coreGet: jest.fn(),
}));
import { coreGet } from '@/lib/api/http';

function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('returns the home view data from the endpoint', async () => {
    (coreGet as jest.Mock).mockResolvedValue({
        company: { id: 'c1', name: 'Müller GmbH', is_visitor: false },
        greeting: '',
        changes: [{ id: 1, title: 'Neuer Scan', scope: null, occurred_at: 'x', severity: 0.3 }],
        attention: [],
        next_steps: [],
    });

    const { result } = renderHook(() => useHomeView(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.company.name).toBe('Müller GmbH');
    expect(result.current.data!.changes).toHaveLength(1);
    expect(coreGet).toHaveBeenCalledWith('/v3/views/home');
});

it('returns the home status probe data from the endpoint', async () => {
    (coreGet as jest.Mock).mockResolvedValue({
        tenant_id: 'tenant-demo',
        user_role: 'owner',
        company: { id: 'c1', name: 'Simple Coffee Group', is_visitor: false },
        home_truth: { changes: [], attention: [], next_steps: [] },
        runtime: { status: 'unknown', evidence: [] },
        home_cards: {
            verified: [{ id: 'changes', label: 'Was hat sich veraendert?', source: 'mindloop_events' }],
            placeholder: [{ label: 'Mail fuer OpenClaw vorbereiten', reason: 'No backend evidence contract found' }],
            unknown: [{ id: 'next_steps', label: 'Nächster echter Schritt', reason: 'No tenant-scoped task node is available' }],
        },
        placeholders_detected: [{ label: 'Mail fuer OpenClaw vorbereiten', reason: 'No backend evidence contract found' }],
        unknowns: [{ id: 'runtime_larry_openclaw', reason: 'No CORE evidence contract currently proves runtime state' }],
    });

    const { result } = renderHook(() => useHomeStatus(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.runtime.status).toBe('unknown');
    expect(result.current.data!.placeholders_detected[0].label).toBe('Mail fuer OpenClaw vorbereiten');
    expect(coreGet).toHaveBeenCalledWith('/v3/views/home/status', { isOptional: true });
});
