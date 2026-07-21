/**
 * useMoraContext — isOperational + scopeSource derivation tests
 */

// Mock the stores that useMoraContext reads from

// Stable references to avoid infinite render loops
const BASE_ORB_STORE: {
    orbState: 'idle';
    lastAnswerSource: string | null;
    lastAnswerSourceMode: string | null;
    lastAnswerScopeLabel: string | null;
} = {
    orbState: 'idle' as const,
    lastAnswerSource: null,
    lastAnswerSourceMode: null,
    lastAnswerScopeLabel: null,
};

const BASE_CHAT_STORE = {
    lastChatScope: null as null | Record<string, unknown>,
};

const BASE_NAV_STORE = {
    activeCompanyId: null as string | null,
    activeDepartmentId: null as string | null,
    activeSpaceId: null as string | null,
    activeFolderId: null as string | null,
};

const BASE_SESSION_STORE = {
    user: null as null | Record<string, unknown>,
};

// Mutable state objects for overrides
let orbOverrides: Partial<typeof BASE_ORB_STORE> = {};
let chatOverrides: Partial<typeof BASE_CHAT_STORE> = {};
let navOverrides: Partial<typeof BASE_NAV_STORE> = {};
let sessionOverrides: Partial<typeof BASE_SESSION_STORE> = {};

jest.mock('@/lib/store/orbStore', () => ({
    useOrbStore: (selector?: (s: any) => unknown) => {
        const store = { ...BASE_ORB_STORE, ...orbOverrides };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/chatStore', () => ({
    useChatStore: (selector?: (s: any) => unknown) => {
        const store = { ...BASE_CHAT_STORE, ...chatOverrides };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: (selector?: (s: any) => unknown) => {
        const store = { ...BASE_NAV_STORE, ...navOverrides };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/sessionStore', () => ({
    useSessionStore: (selector?: (s: any) => unknown) => {
        const store = { ...BASE_SESSION_STORE, ...sessionOverrides };
        return selector ? selector(store) : store;
    },
}));

// Mutable data for TanStack Query hook mocks — controlled via mockStores()
let mockCompaniesData: any[] = [];
let mockDepartmentsData: any[] = [];
let mockTreeData: any[] = [];

// Mock TanStack Query hooks — not under test here
jest.mock('@/lib/queries/useCompanies', () => ({
    useCompanies: () => ({ data: mockCompaniesData, isFetching: false }),
}));

jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: () => ({ data: mockDepartmentsData, isFetching: false }),
}));

jest.mock('@/lib/queries/useTree', () => ({
    useTree: () => ({ data: mockTreeData, isFetching: false }),
}));

// Mock sub-hooks that make API calls — not under test here
jest.mock('@/lib/hooks/useMemoryPendingCount', () => ({
    useMemoryPendingCount: () => 0,
}));
jest.mock('@/lib/hooks/useMemoryOverview', () => ({
    useMemoryOverview: () => ({ structuredFacts: 0, pendingReviews: 0 }),
}));

// Mock useMoraPerception — Real Mora P1 hook; flag is off in tests by default
// so bundle is not consumed, but hook must be callable without QueryClient.
let mockPerceptionData: any = undefined;
jest.mock('@/lib/queries/useMoraPerception', () => ({
    useMoraPerception: () => ({ data: mockPerceptionData, isSuccess: !!mockPerceptionData }),
}));

import { renderHook } from '@testing-library/react';
import { useMoraContext } from '@/lib/mora/useMoraContext';

function mockStores(overrides: {
    orbState?: string;
    lastChatScope?: null | Record<string, unknown>;
    activeCompanyId?: string | null;
    activeDepartmentId?: string | null;
    activeSpaceId?: string | null;
    activeFolderId?: string | null;
    user?: null | Record<string, unknown>;
    companies?: any[];
    lastAnswerSource?: string | null;
    lastAnswerSourceMode?: string | null;
    lastAnswerScopeLabel?: string | null;
}) {
    orbOverrides = {
        orbState: overrides.orbState as any ?? 'idle',
        lastAnswerSource: overrides.lastAnswerSource as any ?? null,
        lastAnswerSourceMode: overrides.lastAnswerSourceMode ?? null,
        lastAnswerScopeLabel: overrides.lastAnswerScopeLabel ?? null,
    };
    chatOverrides = { lastChatScope: overrides.lastChatScope ?? null };
    navOverrides = {
        activeCompanyId: overrides.activeCompanyId ?? null,
        activeDepartmentId: overrides.activeDepartmentId ?? null,
        activeSpaceId: overrides.activeSpaceId ?? null,
        activeFolderId: overrides.activeFolderId ?? null,
    };
    sessionOverrides = { user: overrides.user ?? null };
    // Sync TanStack Query mocks with store overrides
    mockCompaniesData = overrides.companies ?? [];
}

beforeEach(() => {
    orbOverrides = {};
    chatOverrides = {};
    navOverrides = {};
    sessionOverrides = {};
    mockCompaniesData = [];
    mockDepartmentsData = [];
    mockTreeData = [];
});

describe('isOperational — backend truth', () => {
    it('is true when session operational_state is "operational"', () => {
        mockStores({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational' } });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });

    it('is false when session operational_state is "setup_required"', () => {
        mockStores({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'setup_required' } });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });
});

describe('isOperational — heuristic fallback (no session operational_state)', () => {
    it('is true when activeCompanyId is set and no operational_state', () => {
        mockStores({ user: { id: 'u1', name: 'Test', role: 'member' }, activeCompanyId: 'co-1' });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(true);
    });

    it('is false when no operational_state and no activeCompanyId', () => {
        mockStores({ user: { id: 'u1', name: 'Test', role: 'member' } });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });

    it('is true when resolved_scope.company_id is set and no operational_state', () => {
        mockStores({
            user: { id: 'u1', name: 'Test', role: 'member' },
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
        mockStores({
            user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational', active_company_name: 'Acme GmbH' },
        });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeLabels.company).toBe('Acme GmbH');
    });
});

describe('bundle-driven branch (Real Mora P1)', () => {
    const originalEnv = process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1;
    afterEach(() => {
        if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1;
        else process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = originalEnv;
        mockPerceptionData = undefined;
    });

    it('derives scopeLevel from bundle.scope when flag is on', () => {
        process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = 'true';
        mockPerceptionData = {
            version: 'v1',
            issued_at: '2026-04-25T12:00:00Z',
            identity: { user_id: 'u', name: 'a', role: 'owner', tenant_id: 't', active_company: { id: 'c', name: 'C' } },
            scope: {
                company: { id: 'c', name: 'Acme' },
                department: { id: 'd', name: 'Marketing' },
                space: null,
                folder: null,
            },
            active_object: null,
            recent_activity: { navigations: [], edits: [], open_panes: [], drafts: [] },
            relevant_memory: [],
            recent_tool_runs: [],
            capabilities: { tools_available: [], tools_degraded: [], providers_active: [], memory_writable: true },
        };
        mockStores({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational' } });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeLevel).toBe('department');
        expect(result.current.scopeLabels.department).toBe('Marketing');
        expect(result.current.scopeLabels.company).toBe('Acme');
    });

    it('falls back to legacy when flag is on but bundle not loaded', () => {
        process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = 'true';
        mockPerceptionData = undefined;
        mockStores({
            user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational', active_company_name: 'Acme GmbH' },
        });
        const { result } = renderHook(() => useMoraContext());
        // Falls back to legacy: company name from session
        expect(result.current.scopeLabels.company).toBe('Acme GmbH');
    });

    it('respects setup_required even when bundle is loaded', () => {
        process.env.NEXT_PUBLIC_MORA_PERCEIVE_V1 = 'true';
        mockPerceptionData = {
            version: 'v1',
            issued_at: '2026-04-25T12:00:00Z',
            identity: { user_id: 'u', name: 'a', role: 'owner', tenant_id: 't', active_company: { id: 'c', name: 'C' } },
            scope: { company: null, department: null, space: null, folder: null },
            active_object: null,
            recent_activity: { navigations: [], edits: [], open_panes: [], drafts: [] },
            relevant_memory: [],
            recent_tool_runs: [],
            capabilities: { tools_available: [], tools_degraded: [], providers_active: [], memory_writable: true },
        };
        mockStores({ user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'setup_required' } });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBe(false);
    });
});

describe('scopeLabels.company priority', () => {
    it('prefers resolved scope company over session active_company_name', () => {
        mockStores({
            user: { id: 'u1', name: 'Test', role: 'member', operational_state: 'operational', active_company_name: 'Session Corp' },
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

describe('isOperational — loading state', () => {
    it('is null when user is null and no company context (bootstrap window)', () => {
        mockStores({ user: null, activeCompanyId: null, lastChatScope: null });
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.isOperational).toBeNull();
    });
});

describe('scopeSource', () => {
    it('returns scope_source from resolved_scope when present', () => {
        mockStores({
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
        mockStores({});
        const { result } = renderHook(() => useMoraContext());
        expect(result.current.scopeSource).toBeNull();
    });
});
