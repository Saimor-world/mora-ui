/**
 * TerminalPane.lifecycle.test.tsx
 *
 * Tests for explicit, truthful session lifecycle states:
 *   1. Session creation fails → "remote core terminal unavailable" — no fake-shell fallback
 *   2. Mid-session disconnect (executeSessionInput null) → "Session getrennt" + reconnect hint
 *   3. 'reconnect' command creates a new session and restores ready state
 *   4. Prior server history[] shows a recovery-separator before the replayed transcript
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TerminalPane } from '@/components/panes/TerminalPane';
import { usePaneStore } from '@/lib/store/paneStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
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

const liveSession: TerminalSession = {
    session_id: 'sess-live',
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
    history: [],
};

const recoveredSession: TerminalSession = {
    ...liveSession,
    session_id: 'sess-recovered',
    history: [
        { command: 'pwd', stdout: '/app', exit_code: 0, type: 'command', executed_at: '2026-03-21T09:00:00Z' },
        { command: 'ls', stdout: 'README.md\nsrc\n', exit_code: 0, type: 'command', executed_at: '2026-03-21T09:00:05Z' },
    ],
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
    useSessionStore.setState({
        user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'admin' } as any,
    });
    useNavStore.setState({
        activeCompanyId: 'company-1',
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TerminalPane lifecycle-truth pass', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        usePaneStore.getState().reset();
        useSessionStore.setState({ user: null });
        useNavStore.setState({ activeCompanyId: null });
        openTerminal();
    });

    /**
     * 1. Session creation failure
     *    Requirement: show explicit "unavailable" state; do NOT claim local shell works.
     *    The phrase "Lokale Befehle" must not appear — it implies a local shell fallback.
     *    "Remote Core Terminal" must appear so the user knows what is unavailable.
     */
    it('shows explicit unavailable state and avoids local-shell language when session creation fails', async () => {
        setAuthenticated();
        mockedCreate.mockResolvedValue(null);

        render(<TerminalPane id="terminal-main" />);

        // Must tell the user exactly WHAT is unavailable
        await waitFor(() => {
            expect(screen.getByText(/Remote Core Terminal/i)).toBeInTheDocument();
        });

        // Must NOT say "Lokale Befehle" — that implies a local shell is running
        expect(screen.queryByText(/Lokale Befehle/i)).not.toBeInTheDocument();

        // Input must still be enabled (MORA meta-commands like help/status still work)
        expect(screen.getByRole('textbox')).not.toBeDisabled();
    });

    /**
     * 2. Mid-session disconnect
     *    After a successful session, if executeSessionInput returns null, the terminal
     *    must transition to a named "disconnected" state and offer exactly one recovery action.
     */
    it('shows disconnected state with reconnect instruction when executeSessionInput returns null', async () => {
        setAuthenticated();
        mockedCreate.mockResolvedValue(liveSession);
        mockedExecute.mockResolvedValue(null);  // Core unreachable during command

        render(<TerminalPane id="terminal-main" />);
        await screen.findAllByText(/core-prod-01/i);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'ls' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        // Must name the disconnect clearly
        await waitFor(() => {
            expect(screen.getByText(/Session getrennt/i)).toBeInTheDocument();
        });

        // Must offer exactly one clear recovery: 'reconnect'
        expect(screen.getByText(/reconnect/i)).toBeInTheDocument();
    });

    /**
     * 3. Reconnect command
     *    After disconnect, 'reconnect' must call createTerminalSession again and restore
     *    the ready state with the new session's identity on screen.
     */
    it("'reconnect' creates a new session and shows the new session identity", async () => {
        setAuthenticated();
        // First session succeeds, then its first command fails (disconnect)
        mockedCreate
            .mockResolvedValueOnce(liveSession)
            .mockResolvedValueOnce({ ...liveSession, session_id: 'sess-new', cwd: '/tmp' });
        mockedExecute.mockResolvedValue(null);  // triggers disconnect

        render(<TerminalPane id="terminal-main" />);
        await screen.findAllByText(/core-prod-01/i);

        // Trigger disconnect
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'ls' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        await screen.findByText(/Session getrennt/i);

        // Reconnect
        fireEvent.change(input, { target: { value: 'reconnect' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(mockedCreate).toHaveBeenCalledTimes(2);
        });
        // New session identity must appear
        await waitFor(() => {
            expect(screen.getAllByText(/sess-new/i).length).toBeGreaterThan(0);
        });
    });

    /**
     * 4. History recovery separator
     *    When a session already has server-owned history[], the transcript replay must
     *    be preceded by a visible separator so the user knows the transcript came from
     *    the server, not a fresh interaction.
     */
    it('shows a history-recovery separator before replayed server transcript', async () => {
        setAuthenticated();
        mockedCreate.mockResolvedValue(recoveredSession);

        render(<TerminalPane id="terminal-main" />);

        // The separator must name the source ("Server" or "wiederhergestellt")
        await waitFor(() => {
            expect(screen.getByText(/wiederhergestellt/i)).toBeInTheDocument();
        });

        // The history entries must follow the separator
        expect(screen.getByText(/\$ pwd/i)).toBeInTheDocument();
        expect(screen.getByText(/README\.md/i)).toBeInTheDocument();
    });
});
