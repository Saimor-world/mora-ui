/**
 * useMoraContext — isOperational + scopeSource derivation tests
 */

// Mock the entire store — useMoraContext calls useMoraStore(selector)
jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

// Mock sub-hooks that make API calls — not under test here
jest.mock('@/lib/hooks/useMemoryPendingCount', () => ({
    useMemoryPendingCount: () => 0,
}));
jest.mock('@/lib/hooks/useMemoryOverview', () => ({
    useMemoryOverview: () => ({ structuredFacts: 0, pendingReviews: 0 }),
}));

import { renderHook } from '@testing-library/react';
import { useMoraStore } from '@/lib/store/moraState';
import { useMoraContext } from '@/lib/mora/useMoraContext';

// Minimal valid store state — extend as needed per test
const baseStore: Record<string, unknown> = {
    orbState: 'idle',
    coreError: null,
    lastChatScope: null,
    companies: [],
    activeCompanyId: null,
    activeDepartmentId: null,
    activeSpaceId: null,
    activeFolderId: null,
    departments: [],
    spacesByDepartment: {},
    foldersBySpace: {},
    lastAnswerSource: null,
    lastAnswerSourceMode: null,
    lastAnswerScopeLabel: null,
    memoryPendingCount: 0,
    memoryFactCount: 0,
    user: null,
};

function mockStore(overrides: Record<string, unknown>) {
    const state = { ...baseStore, ...overrides };
    (useMoraStore as unknown as jest.Mock).mockImplementation((selector: (s: typeof state) => unknown) =>
        selector(state)
    );
}

beforeEach(() => jest.clearAllMocks());

describe('isOperational — backend truth', () => {
    it('is true when session operational_state is "operational"', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational' } as any });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });

    it('is false when session operational_state is "setup_required"', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'setup_required' } as any });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });
});

describe('isOperational — heuristic fallback (no session operational_state)', () => {
    it('is true when activeCompanyId is set and no operational_state', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member' } as any, activeCompanyId: 'co-1' });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });

    it('is false when no operational_state and no activeCompanyId', () => {
        mockStore({ user: { id: 'u1', name: 'Test', role: 'member' } as any });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });

    it('is true when resolved_scope.company_id is set and no operational_state', () => {
        mockStore({
            user: { id: 'u1', name: 'Test', role: 'member' } as any,
            lastChatScope: {
                resolved_scope: { company_id: 'co-resolved' },
                scope_policy: 'passthrough',
                scope_enforced: false,
            },
        });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });
});

describe('pre-chat company label from session', () => {
    it('uses active_company_name from session when no lastChatScope', () => {
        mockStore({
            user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational', active_company_name: 'Acme GmbH' } as any,
        });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeLabels.company).toBe('Acme GmbH');
    });
});

describe('scopeLabels.company priority', () => {
    it('prefers resolved scope company over session active_company_name', () => {
        mockStore({
            user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational', active_company_name: 'Session Corp' } as any,
            companies: [{ id: 'co-1', name: 'Resolved Corp' }],
            activeCompanyId: 'co-1',
            lastChatScope: {
                resolved_scope: { company_id: 'co-1' },
                scope_policy: 'passthrough',
                scope_enforced: false,
            },
        });
        const { result } = renderHook(() => useMoraContext());
        // Resolved company name ('Resolved Corp') must win over session bootstrap ('Session Corp')
        expect(result.current.scopeLabels.company).toBe('Resolved Corp');
        expect(result.current.scopeLabels.company).not.toBe('Session Corp');
    });
});

describe('scopeSource', () => {
    it('returns scope_source from resolved_scope when present', () => {
        mockStore({
            lastChatScope: {
                resolved_scope: { company_id: 'co-1', scope_source: 'tenant_default_company' },
                scope_policy: 'passthrough',
                scope_enforced: false,
            },
        });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeSource).toBe('tenant_default_company');
    });

    it('returns null when no lastChatScope', () => {
        mockStore({});
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeSource).toBeNull();
    });
});
