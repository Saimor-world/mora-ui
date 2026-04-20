/**
 * test-utils.tsx — Saimor unified test utilities
 *
 * PHILOSOPHY: No mocking of React hooks or Zustand stores.
 * Instead:
 *   - TanStack Query data → queryClient.setQueryData() (pre-populates real cache)
 *   - Zustand state → useNavStore.setState() / useSessionStore.setState()
 *   - External I/O → jest.mock('@/lib/api/coreClient') is fine (HTTP boundary)
 *   - Animation libraries → jest.mock('framer-motion') is fine (not business logic)
 *
 * Usage:
 *   const { queryClient } = renderWithProviders(<MyComponent />)
 *   queryClient.setQueryData(queryKeys.departments('c1'), [{ id: 'd1', name: 'Sales' }])
 *
 * Or pre-populate before render:
 *   const qc = createTestQueryClient()
 *   qc.setQueryData(queryKeys.tree('c1'), treeFixture)
 *   renderWithProviders(<MyComponent />, { queryClient: qc })
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { useChatStore } from '@/lib/store/chatStore';

// ─── QueryClient factory ──────────────────────────────────────────────────────

/** Fresh QueryClient for a single test. No retries, never goes stale. */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,   // data set via setQueryData never refetches
                gcTime: 0,             // clean up after unmount
            },
            mutations: { retry: false },
        },
        // Silence TanStack Query error logs in test output
        logger: {
            log: () => {},
            warn: () => {},
            error: () => {},
        } as any,
    } as any);
}

// ─── Store reset helpers ──────────────────────────────────────────────────────

/** Reset all Zustand stores to clean initial state. Call in beforeEach. */
export function resetAllStores(): void {
    useNavStore.setState({
        viewLevel: 'core',
        coreMode: 'work',
        viewMode: 'universe',
        activeCompanyId: null,
        activeDepartmentId: null,
        activeSpaceId: null,
        activeFolderId: null,
        isStandardMode: false,
        nameConflict: null,
    } as any, true);

    useSessionStore.setState({
        user: null,
        hasBooted: false,
        isLoggingOut: false,
    } as any, true);

    useOrbStore.setState({
        orbState: 'idle',
        speculativeState: null,
        speculativeUntil: null,
    } as any, true);

    useChatStore.setState({
        lastChatScope: null,
        lastAnswerSource: null,
        lastAnswerSourceMode: null,
        lastAnswerScopeLabel: null,
    } as any, true);
}

// ─── Render wrapper ───────────────────────────────────────────────────────────

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    /** Pass a pre-populated QueryClient to seed data before the component mounts */
    queryClient?: QueryClient;
}

interface RenderWithProvidersResult extends RenderResult {
    queryClient: QueryClient;
}

/**
 * Drop-in replacement for render() that always wraps in QueryClientProvider.
 * Returns queryClient so tests can call setQueryData() after render too.
 */
export function renderWithProviders(
    ui: React.ReactElement,
    options: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
    const { queryClient = createTestQueryClient(), ...renderOptions } = options;

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    const result = render(ui, { wrapper: Wrapper, ...renderOptions });
    return { ...result, queryClient };
}

// ─── Common test fixtures ─────────────────────────────────────────────────────

export const testFixtures = {
    company: { id: 'company-1', name: 'Acme GmbH' },
    department: { id: 'dept-1', name: 'Operations', company_id: 'company-1', color: '#10b981' },
    space: { id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false },
    user: { id: 'u1', name: 'Test User', email: 'test@example.com', role: 'admin' as const },
};
