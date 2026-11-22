import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFetchCompanies = jest.fn();
jest.mock('@/lib/api/orgClient', () => ({
    fetchCompanies: (...args: unknown[]) => mockFetchCompanies(...args),
}));

import { useActiveCompanyIsDemo } from '@/lib/hooks/useIsSaimorInternal';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { installSessionCacheReset } from '@/lib/queryClient';
import type { User } from '@/lib/types/mora';

const mira = { id: 'u-mira', tenant_id: 't-1', name: 'Mira Test', role: 'admin' } as unknown as User;
const ben = { id: 'u-ben', tenant_id: 't-1', name: 'Ben Test', role: 'admin' } as unknown as User;

function wrapperFor(client: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
}

function freshClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
    mockFetchCompanies.mockReset();
    useDemoStore.setState({ demoCompanyId: null });
    act(() => {
        useSessionStore.getState().resetStore();
        useSessionStore.getState().setUser(mira);
    });
});

describe('useActiveCompanyIsDemo fails closed', () => {
    it('treats the active company as demo while the company list is still loading', () => {
        mockFetchCompanies.mockReturnValue(new Promise(() => {}));
        useDemoStore.setState({ demoCompanyId: 'hq-1' });
        const { result } = renderHook(() => useActiveCompanyIsDemo(), { wrapper: wrapperFor(freshClient()) });
        expect(result.current).toBe(true);
    });

    it('treats the active company as demo when the company list fails', async () => {
        mockFetchCompanies.mockRejectedValue(new Error('core down'));
        useDemoStore.setState({ demoCompanyId: 'hq-1' });
        const client = freshClient();
        const { result } = renderHook(() => useActiveCompanyIsDemo(), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(client.getQueryCache().getAll()[0]?.state.status).toBe('error'));
        expect(result.current).toBe(true);
    });

    it('treats an unknown active company as demo', async () => {
        mockFetchCompanies.mockResolvedValue([{ id: 'other', name: 'Other', is_demo: false }]);
        useDemoStore.setState({ demoCompanyId: 'hq-1' });
        const client = freshClient();
        const { result } = renderHook(() => useActiveCompanyIsDemo(), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(mockFetchCompanies).toHaveBeenCalled());
        await waitFor(() => expect(client.getQueryCache().getAll()[0]?.state.status).toBe('success'));
        expect(result.current).toBe(true);
    });

    it('reports a confirmed real company as not demo', async () => {
        mockFetchCompanies.mockResolvedValue([{ id: 'hq-1', name: 'HQ', is_demo: false }]);
        useDemoStore.setState({ demoCompanyId: 'hq-1' });
        const { result } = renderHook(() => useActiveCompanyIsDemo(), { wrapper: wrapperFor(freshClient()) });
        await waitFor(() => expect(result.current).toBe(false));
    });

    it('keys the company list per person, so a user switch never reuses the old list', async () => {
        mockFetchCompanies.mockResolvedValue([{ id: 'hq-1', name: 'HQ', is_demo: false }]);
        useDemoStore.setState({ demoCompanyId: 'hq-1' });
        const client = freshClient();
        const { result } = renderHook(() => useActiveCompanyIsDemo(), { wrapper: wrapperFor(client) });
        await waitFor(() => expect(result.current).toBe(false));

        mockFetchCompanies.mockReturnValue(new Promise(() => {}));
        act(() => useSessionStore.getState().setUser(ben));
        expect(result.current).toBe(true);
    });
});

describe('installSessionCacheReset', () => {
    it('drops every cached read when the signed-in person changes or logs out', () => {
        const client = freshClient();
        const stop = installSessionCacheReset(client);
        client.setQueryData(['os', 'mail-summary'], { subjects: ['Mira private'] });

        act(() => useSessionStore.getState().setUser(ben));
        expect(client.getQueryData(['os', 'mail-summary'])).toBeUndefined();

        client.setQueryData(['os', 'briefing'], { text: 'Ben private' });
        act(() => useSessionStore.getState().resetStore());
        expect(client.getQueryData(['os', 'briefing'])).toBeUndefined();
        stop();
    });

    it('keeps the cache for the same person and on first sign-in', () => {
        act(() => useSessionStore.getState().resetStore());
        const client = freshClient();
        const stop = installSessionCacheReset(client);
        client.setQueryData(['public', 'health'], { ok: true });

        act(() => useSessionStore.getState().setUser(mira));
        expect(client.getQueryData(['public', 'health'])).toEqual({ ok: true });

        act(() => useSessionStore.getState().setUser({ ...mira, name: 'Mira T.' } as User));
        expect(client.getQueryData(['public', 'health'])).toEqual({ ok: true });
        stop();
    });
});
