import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDossierView } from '@/lib/queries/useDossierView';

jest.mock('@/lib/api/http', () => ({ coreGet: jest.fn() }));
import { coreGet } from '@/lib/api/http';

beforeEach(() => jest.clearAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

it('fetches dossier view for a given audit id', async () => {
    (coreGet as jest.Mock).mockResolvedValue({
        company: { id: 'c1', name: 'Müller GmbH', is_visitor: false },
        audit: { id: 'audit-1', title: 'Dossier', score: 52, level: 'Mittel', domain: 'mueller.de', created_at: '2026-05-31T10:00:00Z' },
    });
    const { result } = renderHook(() => useDossierView('audit-1'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.company.name).toBe('Müller GmbH');
    expect(result.current.data!.audit?.score).toBe(52);
    expect(coreGet).toHaveBeenCalledWith('/v3/views/dossier/audit-1');
});

it('does not fire when auditId is null', () => {
    (coreGet as jest.Mock).mockResolvedValue(null);
    renderHook(() => useDossierView(null), { wrapper });
    expect(coreGet).not.toHaveBeenCalled();
});
