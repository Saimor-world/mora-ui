/**
 * ActionCenterPane — Mycelium explainability V3
 *
 * Tests that the intake batch view exposes:
 *   - "Gelernt" chip for learned_route events
 *   - route_reason as short subtext
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActionCenterPane } from '@/components/panes/ActionCenterPane';

const coreGet = jest.fn();
const corePost = jest.fn();
const confirmCreateNodeFromFile = jest.fn();
const rejectCreateNodeFromFile = jest.fn();

const paneState = {
    activePaneId: 'actions-main',
    getPane: () => ({
        id: 'actions-main',
        type: 'actions',
        title: 'Action Center',
        size: { width: 920, height: 680 },
        position: { x: 120, y: 80 },
        zIndex: 700,
        minimized: false,
    }),
    removePane: jest.fn(),
    minimizePane: jest.fn(),
    focusPane: jest.fn(),
    updatePanePosition: jest.fn(),
    updatePaneSize: jest.fn(),
};

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: (state: typeof paneState) => unknown) =>
        typeof selector === 'function' ? selector(paneState) : paneState,
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: (...args: unknown[]) => coreGet(...args),
    corePost: (...args: unknown[]) => corePost(...args),
}));

jest.mock('@/lib/api/filesClient', () => ({
    confirmCreateNodeFromFile: (...args: unknown[]) => confirmCreateNodeFromFile(...args),
    rejectCreateNodeFromFile: (...args: unknown[]) => rejectCreateNodeFromFile(...args),
}));

jest.mock('@/lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock('@/lib/api/realtimeClient', () => ({
    realtime: { on: jest.fn(), off: jest.fn(), connect: jest.fn() },
}));

// ── fixtures ──────────────────────────────────────────────────────────────────

const learnedIntakeEvent = {
    action_id: 'act-learn-1',
    status: 'done',
    intent: 'create_node_from_file',
    actor_role: 'system',
    session_id: 'sess-learn',
    message: 'Datei eingeordnet',
    error: null,
    timestamp: '2026-03-16T10:00:00.000Z',
    payload: {
        tool_name: 'create_node_from_file',
        filename: 'budget-q4.pdf',
        batch_id: 'batch-learn-1',
        intake_context: {
            target_department_name: 'Finance',
            target_space_name: 'Reports',
            target_folder_name: 'Q4',
            route_mode: 'learned_route',
            route_reason: 'Ähnliche Dokumente wurden hier eingeordnet.',
        },
        route_suggestion: {
            route_mode: 'learned_route',
            route_reason: 'Ähnliche Dokumente wurden hier eingeordnet.',
        },
    },
};

const defaultIntakeEvent = {
    action_id: 'act-default-1',
    status: 'done',
    intent: 'create_node_from_file',
    actor_role: 'system',
    session_id: 'sess-default',
    message: 'Datei eingeordnet',
    error: null,
    timestamp: '2026-03-16T10:01:00.000Z',
    payload: {
        tool_name: 'create_node_from_file',
        filename: 'invoice.pdf',
        batch_id: 'batch-default-1',
        intake_context: {
            target_department_name: 'Finance',
            target_folder_name: 'Rechnungen',
            route_mode: 'default_route',
            route_reason: 'Standard-Inbox für neue Dateien.',
        },
    },
};

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Renders ActionCenterPane, waits for events to load, switches to intake view
 * using the intent filter select (found via querySelector, not role),
 * then expands the first batch.
 */
async function renderExpandedIntakeBatch(events: unknown[]) {
    coreGet.mockResolvedValue({ events });
    const { container } = render(<ActionCenterPane id="actions-main" />);

    // Wait for the coreGet call to settle
    await waitFor(() => expect(coreGet).toHaveBeenCalled());

    // Find the intent filter <select> — the one that contains an option with value 'intake'
    const selects = container.querySelectorAll('select');
    const intentSelect = Array.from(selects).find((s) =>
        Array.from(s.options).some((o) => o.value === 'intake')
    );
    expect(intentSelect).toBeTruthy();

    // Switch to intake view
    fireEvent.change(intentSelect!, { target: { value: 'intake' } });

    // Wait for batch header to appear and expand it
    const expandBtn = await screen.findByRole('button', { name: /eingeordnet|Datei/i });
    fireEvent.click(expandBtn);

    return container;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ActionCenterPane — route explainability', () => {
    beforeEach(() => jest.clearAllMocks());

    it('shows "Gelernt" chip in expanded intake row for learned_route events', async () => {
        await renderExpandedIntakeBatch([learnedIntakeEvent]);

        await waitFor(() => expect(screen.getByText('budget-q4.pdf')).toBeInTheDocument());
        expect(screen.getByText('Gelernt')).toBeInTheDocument();
    });

    it('does not show "Gelernt" chip for default_route events', async () => {
        await renderExpandedIntakeBatch([defaultIntakeEvent]);

        await waitFor(() => expect(screen.getByText('invoice.pdf')).toBeInTheDocument());
        expect(screen.queryByText('Gelernt')).not.toBeInTheDocument();
    });

    it('shows route_reason as subtext for learned_route events', async () => {
        await renderExpandedIntakeBatch([learnedIntakeEvent]);

        await waitFor(() => expect(screen.getByText('budget-q4.pdf')).toBeInTheDocument());
        expect(screen.getByText(/[Ää]hnliche Dokumente wurden hier eingeordnet/i)).toBeInTheDocument();
    });

    it('truncates long route_reason in the per-file row', async () => {
        const longReasonEvent = {
            ...learnedIntakeEvent,
            action_id: 'act-long-1',
            payload: {
                ...learnedIntakeEvent.payload,
                filename: 'longfile.pdf',
                route_suggestion: {
                    route_mode: 'learned_route',
                    route_reason: 'A'.repeat(100), // very long reason
                },
                intake_context: {
                    ...learnedIntakeEvent.payload.intake_context,
                    route_reason: 'A'.repeat(100),
                },
            },
        };
        await renderExpandedIntakeBatch([longReasonEvent]);

        await waitFor(() => expect(screen.getByText('longfile.pdf')).toBeInTheDocument());
        // Should not render the full 100-char string verbatim in an untruncated element
        // The displayed text should be ≤ 72 chars + ellipsis
        const reasonEl = screen.queryByText(/^A{73,}/);
        expect(reasonEl).not.toBeInTheDocument();
    });
});
