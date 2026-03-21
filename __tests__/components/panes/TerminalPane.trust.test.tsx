/**
 * TerminalPane.trust.test.tsx
 *
 * Tests for the session-truth terminal model:
 *   - Bootstrap uses POST /v3/terminal/session (not /info, not providers)
 *   - Real session fields shown in welcome: host_label, session_id, cwd
 *   - Server history[] hydrated as authoritative transcript on session open
 *   - Shell commands route to POST /v3/terminal/session/{id}/input
 *   - stdout / stderr / denied_reason rendered correctly
 *   - Offline: local commands still work; remote shell blocked
 *   - Unauthenticated: terminal locked
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TerminalPane } from '@/components/panes/TerminalPane';
import { usePaneStore } from '@/lib/store/paneStore';
import { useMoraStore } from '@/lib/store/moraState';
import {
    createTerminalSession,
    executeSessionInput,
    closeTerminalSession,
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

const mockedCreateTerminalSession = createTerminalSession as jest.MockedFunction<typeof createTerminalSession>;
const mockedExecuteSessionInput = executeSessionInput as jest.MockedFunction<typeof executeSessionInput>;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockSession: TerminalSession = {
    session_id: 'sess-001',
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

const mockSessionWithHistory: TerminalSession = {
    ...mockSession,
    session_id: 'sess-002',
    history: [
        { command: 'pwd', stdout: '/app', exit_code: 0, type: 'command', executed_at: '2026-03-21T10:01:00Z' },
        { command: 'ls', stdout: 'README.md\nsrc\ndist\n', exit_code: 0, type: 'command', executed_at: '2026-03-21T10:01:05Z' },
    ],
};

// ── Setup helpers ─────────────────────────────────────────────────────────────

function openTerminal() {
    usePaneStore.getState().openPane({
        id: 'terminal-main',
        type: 'terminal',
        title: 'Terminal',
        size: { width: 800, height: 500 },
    });
}

function setAuthenticatedState() {
    useMoraStore.setState({
        user: {
            id: 'u-1',
            name: 'Max',
            email: 'max@firma.de',
            role: 'admin',
        },
        activeCompanyId: 'company-1',
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TerminalPane session-truth pass', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        usePaneStore.getState().reset();
        useMoraStore.setState({ user: null, activeCompanyId: null });
        openTerminal();
    });

    it('locks the terminal when unauthenticated', async () => {
        // createTerminalSession must never be called — auth check bails first
        render(<TerminalPane id="terminal-main" />);

        expect(await screen.findByText(/Terminal gesperrt/i)).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeDisabled();
        expect(mockedCreateTerminalSession).not.toHaveBeenCalled();
    });

    it('shows real session_id, host_label, and cwd in welcome when session created', async () => {
        setAuthenticatedState();
        mockedCreateTerminalSession.mockResolvedValue(mockSession);

        render(<TerminalPane id="terminal-main" />);

        // host_label appears in both title bar and terminal body — both are correct
        await waitFor(() => {
            expect(screen.getAllByText(/core-prod-01/i).length).toBeGreaterThan(0);
        });
        expect(screen.getAllByText(/sess-001/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\/app/i).length).toBeGreaterThan(0);
    });

    it('routes shell commands to executeSessionInput with the correct session_id', async () => {
        setAuthenticatedState();
        mockedCreateTerminalSession.mockResolvedValue(mockSession);
        mockedExecuteSessionInput.mockResolvedValue({
            success: true,
            command: 'ls',
            stdout: 'Documents\nDownloads\nProjects\n',
            exit_code: 0,
        });

        render(<TerminalPane id="terminal-main" />);
        // host_label appears in title bar + terminal body — use findAll
        await screen.findAllByText(/core-prod-01/i);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'ls' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText(/Documents/i)).toBeInTheDocument();
        });
        // Must pass the session_id from mockSession, not hardcoded
        expect(mockedExecuteSessionInput).toHaveBeenCalledWith('sess-001', 'ls');
    });

    it('shows denied_reason when session rejects a command', async () => {
        setAuthenticatedState();
        mockedCreateTerminalSession.mockResolvedValue(mockSession);
        mockedExecuteSessionInput.mockResolvedValue({
            success: false,
            command: 'rm -rf /',
            denied_reason: 'Destruktive Befehle sind nicht erlaubt.',
            exit_code: 1,
        });

        render(<TerminalPane id="terminal-main" />);
        await screen.findAllByText(/core-prod-01/i);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'rm -rf /' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText(/Verweigert.*Destruktive/i)).toBeInTheDocument();
        });
    });

    it('hydrates transcript from server history[] when session has prior commands', async () => {
        setAuthenticatedState();
        mockedCreateTerminalSession.mockResolvedValue(mockSessionWithHistory);

        render(<TerminalPane id="terminal-main" />);

        // History entries should appear without any user interaction
        await waitFor(() => {
            expect(screen.getByText(/\$ pwd/i)).toBeInTheDocument();
        });
        // /app appears in banner ("Session: sess-002 | /app | ...") AND as pwd stdout — both correct
        expect(screen.getAllByText(/\/app/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/README\.md/i)).toBeInTheDocument();
        expect(screen.getAllByText(/sess-002/i).length).toBeGreaterThan(0);
    });

    it('keeps local commands available while offline, input stays enabled', async () => {
        setAuthenticatedState();
        mockedCreateTerminalSession.mockResolvedValue(null);

        render(<TerminalPane id="terminal-main" />);
        await screen.findByText(/Core gerade nicht erreichbar/i);

        const input = screen.getByRole('textbox');
        expect(input).not.toBeDisabled();

        fireEvent.change(input, { target: { value: 'status' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(screen.getByText(/Verbindung: offline/i)).toBeInTheDocument();
        });
    });
});
