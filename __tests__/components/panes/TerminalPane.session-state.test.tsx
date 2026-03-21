/**
 * TerminalPane.session-state.test.tsx
 *
 * Tests for explicit session lifecycle field surfacing:
 *   1. session_state / expires_at / history_count / history_limit visible in 'status'
 *   2. Expired session (session_state='expired') distinguished from generic disconnect
 *   3. Closed session shows close_reason (distinct from expired)
 *   4. history_count/history_limit surfaces server-owned transcript limits
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TerminalPane } from '@/components/panes/TerminalPane';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import {
    createTerminalSession,
    executeSessionInput,
} from '@/lib/api/coreClient';
import type { TerminalSession } from '@/lib/api/coreClient';

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/api/coreClient', () => ({
    coreGet: jest.fn(),
    corePost: jest.fn(),
    createTerminalSession: jest.fn(),
    executeSessionInput: jest.fn(),
    closeTerminalSession: jest.fn(),
    getTerminalSession: jest.fn(),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    buildChatContext: jest.fn(() => ({})),
}));

const mockedCreate = createTerminalSession as jest.MockedFunction<typeof createTerminalSession>;
const mockedExecute = executeSessionInput as jest.MockedFunction<typeof executeSessionInput>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseSession: TerminalSession = {
    session_id: 'sess-life',
    terminal_type: 'remote_core',
    execution_model: 'session_request_response',
    host_label: 'core-prod-01',
    platform: 'linux',
    cwd: '/app',
    role: 'admin',
    mode: 'stateless',
    tenant_id: 'tenant-1',
    user_id: 'u-1',
    supports_sessions: true,
    supports_cwd: true,
    supports_streaming: false,
    active: true,
    started_at: '2026-03-21T10:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
    session_state: 'active',
    expires_at: '2026-03-21T11:00:00Z',
    history_count: 3,
    history_limit: 500,
    history: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function openTerminal() {
    usePaneStore.getState().openPane({
        id: 'terminal-main',
        type: 'terminal',
        title: 'Terminal',
        size: { width: 800, height: 500 },
    });
}

function setAuthenticated() {
    useMoraStore.setState({
        user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'admin' },
        activeCompanyId: 'company-1',
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TerminalPane session-lifecycle fields', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        usePaneStore.getState().reset();
        useMoraStore.setState({ user: null, activeCompanyId: null });
        openTerminal();
    });

    /**
     * 1. Session lifecycle fields in 'status' command
     *    The status output must show the server's real session_state, expires_at,
     *    and the history_count / history_limit pair so the user knows how full
     *    the server-owned transcript is.
     */
    it('surfaces session_state, expires_at, and history_count/history_limit in status output', async () => {
        setAuthenticated();
        mockedCreate.mockResolvedValue(baseSession);

        render(<TerminalPane id="terminal-main" />);
        await screen.findAllByText(/core-prod-01/i);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'status' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' });

        // session_state
        await waitFor(() => {
            expect(screen.getByText(/active/i)).toBeInTheDocument();
        });

        // history_count / history_limit as a ratio
        expect(screen.getByText(/3\/500/i)).toBeInTheDocument();

        // expires_at surfaced somewhere in status
        expect(screen.getByText(/2026-03-21T11:00:00Z/i)).toBeInTheDocument();
    });

    /**
     * 2. Expired session → named, not treated as generic disconnect
     *    When the server tells us session_state='expired' in an input result,
     *    the terminal must say "Session abgelaufen" — not "Session getrennt" (which
     *    implies a network fault, not a lifecycle event).
     */
    it('shows "Session abgelaufen" — not "Session getrennt" — when input result carries session_state=expired', async () => {
        setAuthenticated();
        mockedCreate.mockResolvedValue(baseSession);
        mockedExecute.mockResolvedValue({
            success: false,
            command: 'ls',
            session: { session_state: 'expired' },
        });

        render(<TerminalPane id="terminal-main" />);
        await screen.findAllByText(/core-prod-01/i);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ls' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText(/Session abgelaufen/i)).toBeInTheDocument();
        });
        // Must not use the generic disconnect phrasing for a lifecycle event
        expect(screen.queryByText(/Session getrennt/i)).not.toBeInTheDocument();
    });

    /**
     * 3. Closed session shows close_reason (distinct from expired)
     *    session_state='closed' means the session was explicitly closed, possibly
     *    with a reason. The reason must be visible so the user understands why.
     */
    it('shows "Session geschlossen" with close_reason when session_state=closed', async () => {
        setAuthenticated();
        mockedCreate.mockResolvedValue(baseSession);
        mockedExecute.mockResolvedValue({
            success: false,
            command: 'ps',
            session: {
                session_state: 'closed',
                close_reason: 'Inaktivitäts-Timeout nach 30 Minuten',
            },
        });

        render(<TerminalPane id="terminal-main" />);
        await screen.findAllByText(/core-prod-01/i);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ps' } });
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText(/Session geschlossen/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/Inaktivitäts-Timeout/i)).toBeInTheDocument();
        // Expired wording must NOT appear for a closed (not expired) session
        expect(screen.queryByText(/Session abgelaufen/i)).not.toBeInTheDocument();
    });
});
