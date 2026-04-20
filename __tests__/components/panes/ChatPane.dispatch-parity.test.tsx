/**
 * ChatPane.dispatch-parity.test.tsx
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// ── capture mocks declared before any imports ──────────────────────────────
const mockExecuteAgenticLoop = jest.fn();
const mockFetchWorkSessionPlan = jest.fn();
const mockDispatchWorkSessionPlan = jest.fn();
const mockSetActiveSession = jest.fn();

const POST_DECISION_PLAN = {
    plan_id: 'plan-abc',
    session_id: 'sess-abc',
    state: 'running',
    title: 'Mein Arbeitsplan',
    summary: 'Zusammenfassung',
    mode: 'auto',
    scope: {},
    stats: { total_steps: 3, completed_steps: 1 },
    transparency_note: null,
    execution: {
        state: 'running',
        can_continue: true,
        current_step_title: 'Dokument lesen',
        last_transition_step_id: 'step-confirm-xyz',
        last_transition_type: 'confirmed',
        last_transition_message: 'Schritt bestaetigt. Mora kann den aktuellen Arbeitslauf direkt fortsetzen.',
        next_message: 'Naechster Schritt: Inhalt analysieren.',
    },
};

jest.mock('@/lib/api/cognitionClient', () => ({
    executeAgenticLoop: (...args: any[]) => mockExecuteAgenticLoop(...args),
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn().mockResolvedValue(null),
    learnInsight: jest.fn(),
    searchMemory: jest.fn().mockResolvedValue([]),
    fetchWorkSessionPlan: (...args: any[]) => mockFetchWorkSessionPlan(...args),
}));

jest.mock('@/lib/utils/moraExplanation', () => ({
    dispatchWorkSessionPlan: (...args: any[]) => mockDispatchWorkSessionPlan(...args),
    WORK_SESSION_PLAN_EVENT: 'saimor:work-session-plan',
    getSessionRunningSignal: jest.fn(() => ({ isPostDecision: false, primaryText: '', secondaryText: null })),
}));

jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: (selector?: any) => {
        const store = {
            activePlanId: null as string | null,
            activeSessionId: null,
            setActiveSession: mockSetActiveSession,
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
        scopeLabels: { company: 'Test Co' },
        scopeLevel: 'company',
    }),
}));

jest.mock('@/components/mora/MoraContextChip', () => ({
    MoraContextChip: () => <div data-testid="mora-context-chip" />,
}));

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const STABLE_PANE = { id: 'chat-main', type: 'chat', title: 'Chat', size: { width: 900, height: 700 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: jest.fn(), minimizePane: jest.fn(), focusPane: jest.fn(),
            getPane: () => STABLE_PANE,
            updatePanePosition: jest.fn(), updatePaneSize: jest.fn(), openPane: jest.fn(),
            panes: [STABLE_PANE], activePaneId: 'chat-main',
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import ChatApp from '@/apps/chat';

beforeEach(resetAllStores);

// ── helpers ────────────────────────────────────────────────────────────────

function setupCrypto() {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: jest.fn() });
    Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: { randomUUID: jest.fn(() => `uuid-${Math.random().toString(36).slice(2)}`) },
    });
}

function renderPane() {
    useNavStore.setState({
        isStandardMode: false,
        activeCompanyId: 'c1',
        activeDepartmentId: null,
        activeSpaceId: 's1',
        activeFolderId: null,
        viewLevel: 'space',
        viewMode: 'workspace',
        coreMode: 'home',
        nameConflict: null,
        navigateToDepartment: jest.fn(),
    } as any);
    (useNavStore as any).getState = () => useNavStore.getState();

    useOrbStore.setState({ orbState: 'idle' } as any);

    const qc = createTestQueryClient();
    qc.setQueryData(queryKeys.departments('c1'), []);
    return renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: qc });
}

async function sendMessageAndAwaitDispatch(text = 'erstelle eine notiz') {
    renderPane();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mockDispatchWorkSessionPlan).toHaveBeenCalled(), { timeout: 3000 });
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('ChatPane dispatch parity — post-decision transition fields', () => {
    beforeAll(setupCrypto);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Site 1 (fetchWorkSessionPlan success): dispatches last_transition_step_id when plan carries post-decision transition', async () => {
        mockExecuteAgenticLoop.mockResolvedValueOnce({
            final_message: 'Erledigt.',
            work_session_plan: { plan_id: 'plan-abc', state: 'running', session_id: 'sess-abc' },
        });
        mockFetchWorkSessionPlan.mockResolvedValueOnce(POST_DECISION_PLAN);

        await sendMessageAndAwaitDispatch();

        expect(mockDispatchWorkSessionPlan).toHaveBeenCalledWith(expect.objectContaining({
            planId: 'plan-abc',
            last_transition_step_id: 'step-confirm-xyz',
            last_transition_type: 'confirmed',
            last_transition_message: 'Schritt bestaetigt. Mora kann den aktuellen Arbeitslauf direkt fortsetzen.',
        }));
    });

    it('Site 1: does not dispatch last_transition_step_id when plan has no post-decision transition', async () => {
        mockExecuteAgenticLoop.mockResolvedValueOnce({
            final_message: 'Laeuft.',
            work_session_plan: { plan_id: 'plan-abc', state: 'running', session_id: 'sess-abc' },
        });
        mockFetchWorkSessionPlan.mockResolvedValueOnce({
            ...POST_DECISION_PLAN,
            execution: { state: 'running', can_continue: true, current_step_title: 'Lesen' },
        });

        await sendMessageAndAwaitDispatch();

        const call = mockDispatchWorkSessionPlan.mock.calls[0]?.[0];
        expect(call?.last_transition_step_id).toBeUndefined();
    });

    it('Site 2 (fetchWorkSessionPlan returns null): dispatches last_transition fields from agentResponse.work_session_plan.execution', async () => {
        mockExecuteAgenticLoop.mockResolvedValueOnce({
            final_message: 'Erledigt.',
            work_session_plan: {
                plan_id: 'plan-abc',
                state: 'running',
                session_id: 'sess-abc',
                title: 'Mein Plan',
                execution: {
                    last_transition_step_id: 'step-from-agent',
                    last_transition_type: 'skipped',
                    last_transition_message: 'Schritt uebersprungen.',
                    next_message: 'Naechster Schritt wartet.',
                },
            },
        });
        mockFetchWorkSessionPlan.mockResolvedValueOnce(null);

        await sendMessageAndAwaitDispatch();

        expect(mockDispatchWorkSessionPlan).toHaveBeenCalledWith(expect.objectContaining({
            planId: 'plan-abc',
            last_transition_step_id: 'step-from-agent',
            last_transition_type: 'skipped',
            last_transition_message: 'Schritt uebersprungen.',
        }));
    });

    it('Site 3 (fetchWorkSessionPlan throws): dispatches last_transition fields from agentResponse.work_session_plan.execution', async () => {
        mockExecuteAgenticLoop.mockResolvedValueOnce({
            final_message: 'Erledigt.',
            work_session_plan: {
                plan_id: 'plan-abc',
                state: 'running',
                session_id: 'sess-abc',
                title: 'Mein Plan',
                execution: {
                    last_transition_step_id: 'step-catch-path',
                    last_transition_type: 'confirmed',
                    last_transition_message: 'Catch-Pfad bestaetigt.',
                    next_message: 'Weiter.',
                },
            },
        });
        mockFetchWorkSessionPlan.mockRejectedValueOnce(new Error('Network failure'));

        await sendMessageAndAwaitDispatch();

        expect(mockDispatchWorkSessionPlan).toHaveBeenCalledWith(expect.objectContaining({
            planId: 'plan-abc',
            last_transition_step_id: 'step-catch-path',
            last_transition_type: 'confirmed',
            last_transition_message: 'Catch-Pfad bestaetigt.',
        }));
    });
});
