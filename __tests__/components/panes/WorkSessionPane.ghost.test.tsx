/**
 * WorkSessionPane.ghost.test.tsx
 *
 * Tests for TransitionGhostCard rendering — the ghost badge that appears
 * after a step has been confirmed or skipped.
 *
 * showGhost = true  requires:
 *   - plan.execution.last_transition_step_id is set
 *   - the step with that ID exists in plan.steps
 *   - that step's status is 'done' OR 'skipped'
 *
 * The ghost text ("Bestaetigt" / "Uebersprungen") is passed as the `label`
 * prop to CommandReceipt inside TransitionGhostCard.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@/components/ui/CommandReceipt', () => ({
    CommandReceipt: ({ label, title, body, footer, ...props }: any) => (
        <div data-testid="command-receipt" {...props}>
            <span>{label}</span>
            <span>{typeof title === 'string' ? title : ''}</span>
            <span>{typeof body === 'string' ? body : ''}</span>
            {footer && <span>{footer}</span>}
        </div>
    ),
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
        stats: { total_steps: 2, completed_steps: 1 },
        segment_summaries: [],
        steps: [
            makeStep('step-confirmed', 0, 'done'),
            makeStep('step-other', 0, 'done'),
        ],
        execution: {
            state: 'running',
            can_continue: true,
            last_transition_step_id: 'step-confirmed',
            last_transition_type: 'confirmed',
        },
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

describe('WorkSessionPane — TransitionGhostCard visibility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders "Bestaetigt" ghost when last_transition_step_id is set and step status is done', async () => {
        const plan = makePlan({
            steps: [
                makeStep('step-confirmed', 0, 'done'),
                makeStep('step-other', 0, 'done'),
            ],
            execution: {
                state: 'running',
                can_continue: true,
                last_transition_step_id: 'step-confirmed',
                last_transition_type: 'confirmed',
            },
        });
        setupPane(plan);

        render(<WorkSessionPane id="ws-test" data={{ plan }} />);

        await waitFor(() => {
            expect(screen.getByText('Bestaetigt')).toBeInTheDocument();
        });
    });

    it('renders "Uebersprungen" ghost when last_transition_step_id is set and step status is skipped', async () => {
        const plan = makePlan({
            steps: [
                makeStep('step-skipped', 0, 'skipped'),
                makeStep('step-other', 0, 'done'),
            ],
            execution: {
                state: 'running',
                can_continue: true,
                last_transition_step_id: 'step-skipped',
                last_transition_type: 'skipped',
            },
        });
        setupPane(plan);

        render(<WorkSessionPane id="ws-test" data={{ plan }} />);

        // StepRow also renders stepStatusLabels['skipped'] = 'Uebersprungen' for each skipped
        // timeline step, so we confirm the ghost CommandReceipt label is present by checking
        // that at least one [data-testid="command-receipt"] element contains the label text.
        await waitFor(() => {
            const receipts = document.querySelectorAll('[data-testid="command-receipt"]');
            const ghostReceipt = Array.from(receipts).find((r) =>
                r.textContent?.includes('Uebersprungen')
            );
            expect(ghostReceipt).toBeDefined();
        });
    });

    it('does not render ghost when step status is pending_confirmation (not yet acted)', async () => {
        const plan = makePlan({
            steps: [
                makeStep('step-pending', 0, 'pending_confirmation'),
                makeStep('step-other', 0, 'done'),
            ],
            execution: {
                state: 'waiting_confirmation',
                can_continue: false,
                last_transition_step_id: 'step-pending',
                last_transition_type: 'confirmed',
            },
        });
        setupPane(plan);

        render(<WorkSessionPane id="ws-test" data={{ plan }} />);

        // Allow any async effects to flush
        await waitFor(() => {
            expect(screen.queryByText('Bestaetigt')).not.toBeInTheDocument();
            expect(screen.queryByText('Uebersprungen')).not.toBeInTheDocument();
        });
    });

    it('does not render ghost when step status is running (non-decision state)', async () => {
        const plan = makePlan({
            steps: [
                makeStep('step-running', 0, 'running'),
                makeStep('step-other', 0, 'done'),
            ],
            execution: {
                state: 'running',
                can_continue: true,
                last_transition_step_id: 'step-running',
                last_transition_type: 'confirmed',
            },
        });
        setupPane(plan);

        render(<WorkSessionPane id="ws-test" data={{ plan }} />);

        await waitFor(() => {
            expect(screen.queryByText('Bestaetigt')).not.toBeInTheDocument();
            expect(screen.queryByText('Uebersprungen')).not.toBeInTheDocument();
        });
    });

    it('does not render ghost when last_transition_step_id is an orphan (not in plan.steps)', async () => {
        const plan = makePlan({
            steps: [
                makeStep('step-a', 0, 'done'),
                makeStep('step-b', 0, 'done'),
            ],
            execution: {
                state: 'running',
                can_continue: true,
                last_transition_step_id: 'nonexistent-step',
                last_transition_type: 'confirmed',
            },
        });
        setupPane(plan);

        render(<WorkSessionPane id="ws-test" data={{ plan }} />);

        await waitFor(() => {
            expect(screen.queryByText('Bestaetigt')).not.toBeInTheDocument();
            expect(screen.queryByText('Uebersprungen')).not.toBeInTheDocument();
        });
    });

    it('does not render ghost when there is no last_transition_step_id', async () => {
        const plan = makePlan({
            steps: [
                makeStep('step-a', 0, 'done'),
                makeStep('step-b', 0, 'done'),
            ],
            execution: {
                state: 'running',
                can_continue: true,
                // no last_transition_step_id field
            },
        });
        setupPane(plan);

        render(<WorkSessionPane id="ws-test" data={{ plan }} />);

        await waitFor(() => {
            expect(screen.queryByText('Bestaetigt')).not.toBeInTheDocument();
            expect(screen.queryByText('Uebersprungen')).not.toBeInTheDocument();
        });
    });
});
