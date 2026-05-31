import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHomeView } from '@/lib/queries/useHomeView';

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
