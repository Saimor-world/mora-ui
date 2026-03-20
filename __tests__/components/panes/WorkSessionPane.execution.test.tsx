/**
 * WorkSessionPane.execution.test.tsx
 *
 * Delta 2 — Execution Continuity pass
 * Tests:
 *   1. Active segment border accent via execution.current_segment_index
 *   2. Fallback to summary.latest when execution is absent
 *   3. No accent on done plans
 *   4. dispatchWorkSessionPlan called with running_step_title when running;
 *      running_step_title is undefined when waiting_confirmation
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockDispatchWorkSessionPlan = jest.fn();
const mockSetActiveSession = jest.fn();
const mockCoreGet = jest.fn();

jest.mock('@/lib/utils/moraExplanation', () => ({
    dispatchWorkSessionPlan: (...args: unknown[]) => mockDispatchWorkSessionPlan(...args),
    WORK_SESSION_PLAN_EVENT: 'saimor:work-session-plan',
}));

jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: (selector?: (s: any) => unknown) => {
        const store = { setActiveSession: mockSetActiveSession };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: (...args: unknown[]) => mockCoreGet(...args),
    corePost: jest.fn(),
}));

jest.mock('@/lib/utils/searchOpen', () => ({
    surfaceNavigationOutcome: jest.fn(),
}));

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="glass-panel">{children}</div>
    ),
}));

const mockPaneStore = {
    activePaneId: 'ws-test',
    removePane: jest.fn(),
    minimizePane: jest.fn(),
    focusPane: jest.fn(),
    updatePanePosition: jest.fn(),
    updatePaneSize: jest.fn(),
    openPane: jest.fn(),
    getPane: jest.fn(),
};

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: (s: any) => unknown) =>
        selector ? selector(mockPaneStore) : mockPaneStore,
}));

// ── Import AFTER mocks ─────────────────────────────────────────────────────────
import { WorkSessionPane } from '@/components/panes/WorkSessionPane';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeStep(id: string, segmentIndex: number, status: string = 'done') {
    return {
        step_id: id,
        kind: 'navigate',
        title: `Step ${id}`,
        status,
        segment_index: segmentIndex,
    };
}

function makePlan(overrides: Record<string, unknown> = {}) {
    return {
        plan_id: 'plan-1',
        session_id: 'sess-1',
        state: 'running',
        title: 'Test Plan',
        summary: 'A test plan',
        scope: {},
        stats: { total_steps: 4, completed_steps: 2 },
        steps: [
            makeStep('s0a', 0),
            makeStep('s0b', 0),
            makeStep('s1a', 1),
            makeStep('s1b', 1),
        ],
        segment_summaries: [
            { segment_index: 0, origin: 'planning', state: 'done' },
            { segment_index: 1, origin: 'continuation', state: 'running', latest: false },
        ],
        ...overrides,
    };
}

function setupPane(plan: Record<string, unknown>) {
    mockPaneStore.getPane.mockReturnValue({
        id: 'ws-test',
        type: 'work-session',
        title: 'Test',
        size: { width: 800, height: 600 },
        position: { x: 100, y: 100 },
        zIndex: 10,
        minimized: false,
        data: { plan },
    });
    mockCoreGet.mockResolvedValue(null);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WorkSessionPane — execution continuity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('accents segment 1 (not segment 0) when execution.current_segment_index === 1 and state is running', async () => {
        const plan = makePlan({
            state: 'running',
            execution: {
                state: 'running',
                can_continue: true,
                current_segment_index: 1,
                current_step_title: 'Running step title',
            },
        });
        setupPane(plan);

        await act(async () => {
            render(<WorkSessionPane id="ws-test" />);
        });

        // There should be a div with border-l-2 in the document
        const accented = document.querySelector('.border-l-2');
        expect(accented).not.toBeNull();

        // The accented group must contain a step from segment 1 (s1a or s1b)
        // and must NOT contain steps from segment 0 (s0a, s0b)
        const accentedText = accented!.textContent ?? '';
        expect(accentedText).toMatch(/Step s1/);
        expect(accentedText).not.toMatch(/Step s0/);
    });

    it('accents the group where summary.latest === true when execution is absent', async () => {
        const plan = makePlan({
            state: 'running',
            execution: undefined,
            segment_summaries: [
                { segment_index: 0, origin: 'planning', state: 'done', latest: false },
                { segment_index: 1, origin: 'continuation', state: 'running', latest: true },
            ],
        });
        setupPane(plan);

        await act(async () => {
            render(<WorkSessionPane id="ws-test" />);
        });

        const accented = document.querySelector('.border-l-2');
        expect(accented).not.toBeNull();
        expect(accented!.textContent).toMatch(/Step s1/);
        expect(accented!.textContent).not.toMatch(/Step s0/);
    });

    it('does not accent any group when plan.state === done', async () => {
        const plan = makePlan({
            state: 'done',
            execution: {
                state: 'done',
                can_continue: false,
                current_segment_index: 1,
            },
        });
        setupPane(plan);

        await act(async () => {
            render(<WorkSessionPane id="ws-test" />);
        });

        const accented = document.querySelector('.border-l-2');
        expect(accented).toBeNull();
    });

    it('dispatches running_step_title when state is running; undefined when waiting_confirmation', async () => {
        // ── running ──
        const runningPlan = makePlan({
            state: 'running',
            execution: {
                state: 'running',
                can_continue: true,
                current_segment_index: 0,
                current_step_title: 'Active step title',
            },
        });
        setupPane(runningPlan);

        await act(async () => {
            render(<WorkSessionPane id="ws-test" />);
        });

        expect(mockDispatchWorkSessionPlan).toHaveBeenCalledWith(
            expect.objectContaining({ running_step_title: 'Active step title' })
        );

        jest.clearAllMocks();

        // ── waiting_confirmation ──
        const waitingPlan = makePlan({
            state: 'waiting_confirmation',
            steps: [
                makeStep('s0a', 0),
                makeStep('s1a', 1, 'pending_confirmation'),
            ],
            execution: {
                state: 'waiting_confirmation',
                can_continue: false,
                pending_confirmation_title: 'Confirm this step',
            },
        });
        setupPane(waitingPlan);

        await act(async () => {
            render(<WorkSessionPane id="ws-test" />);
        });

        expect(mockDispatchWorkSessionPlan).toHaveBeenCalledWith(
            expect.objectContaining({ running_step_title: undefined })
        );
    });
});
