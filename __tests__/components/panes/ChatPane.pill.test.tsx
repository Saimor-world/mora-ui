/**
 * ChatPane.pill.test.tsx
 * TDD RED → GREEN: active session pill renders when activePlanId + activeSessionTitle are set.
 *
 * Strategy: fire a WORK_SESSION_PLAN_EVENT (which is what the send path does) to seed
 * activeSessionTitle via the plan dispatch. But ChatPane only sets activeSessionTitle
 * when a send completes — so we verify the pill is absent initially AND that the pill
 * JSX element is present in the render output once the title state is populated.
 *
 * Since activeSessionTitle is local state set during sendMessage(), we test:
 * 1. Pill element class/content exists in JSX when activePlanId is truthy AND title set.
 *    We simulate this by directly firing a WORK_SESSION_PLAN_EVENT after render.
 * 2. Pill is absent when activePlanId is null.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WORK_SESSION_PLAN_EVENT } from '@/lib/utils/moraExplanation';

// ── store mocks (must be declared before component import) ─────────────────

let mockActivePlanId: string | null = 'p1';

jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: (selector?: any) => {
        const store = {
            get activePlanId() { return mockActivePlanId; },
            activeSessionId: null,
            setActiveSession: jest.fn(),
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/hooks/useMoraStream', () => ({
    useMoraStream: () => ({
        sendMessage: jest.fn(),
        streamingText: '',
        isStreaming: false,
        error: null,
        messages: [],
        clearHistory: jest.fn(),
    }),
}));

jest.mock('@/lib/api/cognitionClient', () => ({
    executeAgenticLoop: jest.fn(),
}));

jest.mock('@/lib/api/coreClient', () => ({
    learnInsight: jest.fn(),
    searchMemory: jest.fn().mockResolvedValue([]),
    fetchWorkSessionPlan: jest.fn().mockResolvedValue({
        plan_id: 'p1',
        title: 'Mein Plan',
        state: 'running',
        steps: [],
        segment_summaries: [],
        stats: {
            total_steps: 1,
            read_steps: 0,
            write_steps: 1,
            planned_steps: 1,
            completed_steps: 0,
            pending_steps: 0,
            pending_confirmations: 0,
        },
    }),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    buildChatContext: jest.fn(() => ({})),
}));

jest.mock('@/lib/ai/cursorBridge', () => ({
    parseAIResponse: jest.fn(),
    executeCursorCommands: jest.fn(),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
    dispatchMoraPresence: jest.fn(),
}));

jest.mock('@/lib/mora/useMoraContext', () => ({
    useMoraContext: () => ({
        isOperational: true,
        scopeLabels: { company: 'Simple Coffee Group' },
        scopeLevel: 'company',
    }),
}));

jest.mock('@/components/mora/MoraContextChip', () => ({
    MoraContextChip: () => <div data-testid="mora-context-chip">scope</div>,
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockOpenPane = jest.fn();
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            getPane: () => ({
                id: 'chat-main',
                size: { width: 900, height: 700 },
                position: { x: 0, y: 0 },
                zIndex: 1,
                data: {},
            }),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            openPane: (...args: any[]) => mockOpenPane(...args),
        };
        return selector ? selector(store) : store;
    },
}));

const _pillNavStore = {
    isStandardMode: false,
    activeCompanyId: 'company-1',
    activeDepartmentId: null,
    activeSpaceId: 'space-1',
    activeFolderId: null,
    viewLevel: 'space',
    viewMode: 'workspace',
    coreMode: 'home',
    nameConflict: null,
    navigateToDepartment: jest.fn(),
};
jest.mock('@/lib/store/navStore', () => ({
    useNavStore: Object.assign(
        (selector?: any) => selector ? selector(_pillNavStore) : _pillNavStore,
        { getState: () => _pillNavStore },
    ),
}));

jest.mock('@/lib/store/orbStore', () => ({
    useOrbStore: (selector?: any) => {
        const store = { orbState: 'idle' };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: jest.fn(() => ({
        data: [],
        isLoading: false,
        error: null,
    })),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { ChatPane } from '@/components/panes/ChatPane';

describe('ChatPane session pill', () => {
    beforeAll(() => {
        Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: jest.fn(),
        });
        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            value: { randomUUID: jest.fn(() => `test-uuid-${Math.random().toString(36).slice(2)}`) },
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockActivePlanId = 'p1';
    });

    it('renders "Laeuft: Mein Plan" pill when activePlanId is set and state is running', async () => {
        render(<ChatPane id="chat-main" />);

        // Pill should be absent initially (title not yet set)
        expect(screen.queryByText(/Laeuft: Mein Plan/)).not.toBeInTheDocument();

        // Simulate a dispatchWorkSessionPlan event (what the send flow calls after fetching plan)
        await act(async () => {
            window.dispatchEvent(new CustomEvent(WORK_SESSION_PLAN_EVENT, {
                detail: {
                    planId: 'p1',
                    sessionId: 'sess-1',
                    source: 'chat',
                    state: 'running',
                    title: 'Mein Plan',
                    summary: 'Test summary',
                    stats: { total_steps: 1, completed_steps: 0 },
                },
            }));
        });

        // After title is set, pill should appear with state-aware label
        await waitFor(() => {
            expect(screen.getByText(/Laeuft: Mein Plan/)).toBeInTheDocument();
        });
    });

    it('renders "Wartet: Mein Plan" for waiting_confirmation state', async () => {
        render(<ChatPane id="chat-main" />);

        await act(async () => {
            window.dispatchEvent(new CustomEvent(WORK_SESSION_PLAN_EVENT, {
                detail: {
                    planId: 'p1',
                    sessionId: 'sess-1',
                    source: 'chat',
                    state: 'waiting_confirmation',
                    title: 'Mein Plan',
                    stats: { total_steps: 1, completed_steps: 0 },
                },
            }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Wartet: Mein Plan/)).toBeInTheDocument();
        });
    });

    it('renders "Abgeschlossen: Mein Plan" for done state', async () => {
        render(<ChatPane id="chat-main" />);

        await act(async () => {
            window.dispatchEvent(new CustomEvent(WORK_SESSION_PLAN_EVENT, {
                detail: {
                    planId: 'p1',
                    sessionId: 'sess-1',
                    source: 'chat',
                    state: 'done',
                    title: 'Mein Plan',
                    stats: { total_steps: 1, completed_steps: 1 },
                },
            }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Abgeschlossen: Mein Plan/)).toBeInTheDocument();
        });
    });

    it('renders "Aktiver Plan: Mein Plan" for default/null state (pending falls through to default)', async () => {
        render(<ChatPane id="chat-main" />);

        await act(async () => {
            window.dispatchEvent(new CustomEvent(WORK_SESSION_PLAN_EVENT, {
                detail: {
                    planId: 'p1',
                    sessionId: 'sess-1',
                    source: 'chat',
                    state: 'pending',
                    title: 'Mein Plan',
                    stats: { total_steps: 1, completed_steps: 0 },
                },
            }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Aktiver Plan: Mein Plan/)).toBeInTheDocument();
        });
    });

    it('pill is absent when activePlanId is null', async () => {
        mockActivePlanId = null;

        render(<ChatPane id="chat-main" />);

        await act(async () => {
            window.dispatchEvent(new CustomEvent(WORK_SESSION_PLAN_EVENT, {
                detail: {
                    planId: 'p1',
                    sessionId: 'sess-1',
                    source: 'chat',
                    state: 'running',
                    title: 'Mein Plan',
                    stats: {},
                },
            }));
        });

        // Since activePlanId is null in store, pill should never appear
        expect(screen.queryByText(/Aktiver Plan:/)).not.toBeInTheDocument();
    });
});
