// lib/api/terminalClient.ts
// Remote Core terminal — stateless execute and session-based interaction.
// Extracted from remainingClient.ts.

import { coreGet, corePost } from './http';

// ── Terminal ──────────────────────────────────────────────────────────────────

/** Live identity of the remote Core terminal returned by GET /v3/terminal/info */
export interface TerminalInfo {
    terminal_type: string;         // always "remote_core"
    execution_model: string;       // always "request_response"
    host_label?: string;
    platform?: string;             // e.g. "linux"
    cwd?: string;
    role?: string;
    mode?: string;
    tenant_id?: string;
    user_id?: string;
    supports_sessions: boolean;    // always false for now
    supports_streaming: boolean;   // always false for now
    supports_cwd: boolean;         // always false for now
}

/** Structured result from POST /v3/terminal/execute */
export interface TerminalExecuteResult {
    success: boolean;
    command: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    denied_reason?: string;
    executed_at?: string;
    terminal?: Partial<TerminalInfo>;
}

/**
 * Fetch live server identity from GET /v3/terminal/info.
 * Returns null when Core is unreachable (used as both probe and identity source).
 */
export async function fetchTerminalInfo(): Promise<TerminalInfo | null> {
    return coreGet('/v3/terminal/info', { isOptional: true });
}

/**
 * Execute a command on the remote Core server via POST /v3/terminal/execute.
 * Returns null only when Core is completely unreachable.
 */
export async function executeRemoteCommand(command: string): Promise<TerminalExecuteResult | null> {
    return corePost('/v3/terminal/execute', { command }, { isOptional: true });
}

// ── Terminal Sessions (v3) ────────────────────────────────────────────────────

/**
 * One entry from the server-owned session history[].
 * The server is the authoritative source of the transcript.
 */
export interface TerminalHistoryEntry {
    command: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    denied_reason?: string;
    type?: string;           // "command" | "system" | "banner"
    executed_at?: string;
}

/** Explicit lifecycle state of a terminal session (Core fdac89e+). */
export type TerminalSessionState = 'stateless' | 'active' | 'closed' | 'expired';

/**
 * Full session object returned by POST /v3/terminal/session and
 * GET /v3/terminal/session/{id}.
 *
 * supports_sessions = true, supports_cwd = true, supports_streaming = false.
 * session_state / expires_at / close_reason / history_count / history_limit
 * are the new lifecycle-truth fields added in Core dca969f.
 */
export interface TerminalSession {
    session_id: string;
    terminal_type: string;       // "remote_core"
    execution_model: string;     // "session_request_response"
    host_label?: string;
    platform?: string;
    cwd?: string;
    role?: string;
    mode?: string;
    tenant_id?: string;
    user_id?: string;
    supports_sessions: boolean;
    supports_cwd: boolean;
    supports_streaming: boolean;
    active: boolean;
    started_at?: string;
    updated_at?: string;
    closed_at?: string;
    last_command?: string;
    last_exit_code?: number;
    history: TerminalHistoryEntry[];
    // ── Lifecycle-truth fields (Core dca969f) ────────────────────────────────
    session_state?: TerminalSessionState;  // stateless | active | closed | expired
    expires_at?: string;                   // ISO-8601 expiry timestamp
    close_reason?: string;                 // why the session was closed
    history_count?: number;               // current server-owned transcript entries
    history_limit?: number;               // server-imposed transcript cap
}

/** Structured result from POST /v3/terminal/session/{id}/input */
export interface TerminalInputResult {
    success: boolean;
    command: string;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    denied_reason?: string;
    executed_at?: string;
    cwd?: string;                // updated cwd after command (if supports_cwd)
    session?: Partial<TerminalSession>;
}

/** Create a new terminal session. Returns null when Core is unreachable. */
export async function createTerminalSession(): Promise<TerminalSession | null> {
    return corePost('/v3/terminal/session', {}, { isOptional: true });
}

/**
 * Recover an existing session and its server-owned history[].
 * Returns null when Core is unreachable or session expired.
 */
export async function getTerminalSession(sessionId: string): Promise<TerminalSession | null> {
    return coreGet(`/v3/terminal/session/${sessionId}`, { isOptional: true });
}

/** Send a command to a live session. Returns null only on Core unreachability. */
export async function executeSessionInput(
    sessionId: string,
    command: string
): Promise<TerminalInputResult | null> {
    return corePost(`/v3/terminal/session/${sessionId}/input`, { command }, { isOptional: true });
}

/** Close a session. Fire-and-forget — returns void. */
export async function closeTerminalSession(sessionId: string): Promise<void> {
    await corePost(`/v3/terminal/session/${sessionId}/close`, {}, { isOptional: true });
}
