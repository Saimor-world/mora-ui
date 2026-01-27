/**
 * Action Registry — Guided Agency Day 1
 * 
 * Whitelist-based action system for MÔRA.
 * All actions are logged, visible, and abortable.
 * 
 * ALLOWED ACTIONS:
 * - move_cursor: Move MÔRA cursor to target element
 * - highlight: Highlight element with overlay
 * - focus_pane: Focus/bring pane to front
 * 
 * NOT ALLOWED (Day 1):
 * - click_safe: Disabled
 */
import { setFocus, setThinking, setIdle } from '@/lib/mora/awarenessController';
import { getActionIntent, getProposalIntent, getStatusMessage } from './intentMicrocopy';

// ============================================
// Types
// ============================================

export type AgencyActionType =
    | 'move_cursor'
    | 'highlight'
    | 'focus_pane'
    | 'navigate_department'
    | 'navigate_space'
    | 'navigate_folder'
    | 'open_pane';

export interface AgencyAction {
    type: AgencyActionType;
    target_id: string;
    reason: string;
    duration_ms?: number;
    // Extended fields for open_pane action
    pane_type?: string;
    title?: string;
    data?: Record<string, unknown>;
}

export interface ActionProposal {
    proposal_id: string;
    created_at: string;
    mail_id?: string;
    summary: string;
    actions: AgencyAction[];
    status: 'proposed' | 'executing' | 'completed' | 'aborted';
}

export interface ActionLogEntry {
    timestamp: string;
    action: AgencyAction;
    status: 'started' | 'completed' | 'failed' | 'aborted';
    error?: string;
}

// ============================================
// State
// ============================================

let _isExecuting = false;
let _currentProposalId: string | null = null;
let _actionLog: ActionLogEntry[] = [];
let _abortController: AbortController | null = null;

// Subscribers for state changes
type StateListener = (state: { isExecuting: boolean; currentAction: AgencyAction | null }) => void;
const _listeners: Set<StateListener> = new Set();

// ============================================
// Helpers
// ============================================

function notifyListeners(currentAction: AgencyAction | null) {
    _listeners.forEach(listener => {
        listener({ isExecuting: _isExecuting, currentAction });
    });
}

function logAction(action: AgencyAction, status: ActionLogEntry['status'], error?: string) {
    const entry: ActionLogEntry = {
        timestamp: new Date().toISOString(),
        action,
        status,
        error
    };
    _actionLog.push(entry);
    console.log(`[Agency] ${status.toUpperCase()}: ${action.type} → ${action.target_id} | ${action.reason}`);
}

// ============================================
// Core Functions
// ============================================

/**
 * Execute a single action with visibility and logging.
 */
export async function executeAction(action: AgencyAction): Promise<boolean> {
    // Check if aborted
    if (_abortController?.signal.aborted) {
        logAction(action, 'aborted');
        return false;
    }

    logAction(action, 'started');
    notifyListeners(action);
    setFocus(); // UPGRADE: Orb reacts to action start

    // P3: Dispatch event with German intent for Timeline/ChatDock
    window.dispatchEvent(new CustomEvent('mora:agency-update', {
        detail: {
            type: 'action',
            status: 'start',
            intent: getActionIntent(action.type),
            actionId: `${action.type}-${Date.now()}`,
            data: action
        }
    }));

    try {
        switch (action.type) {
            case 'move_cursor':
                await moveCursor(action.target_id);
                break;
            case 'highlight':
                await highlightElement(action.target_id, action.duration_ms || 2000);
                break;
            case 'focus_pane':
                await focusPane(action.target_id);
                break;
            case 'navigate_department':
                await navigateDepartment(action.target_id);
                break;
            case 'navigate_space':
                await navigateSpace(action.target_id);
                break;
            case 'navigate_folder':
                await navigateFolder(action.target_id);
                break;
            case 'open_pane':
                await openPaneAction(action.target_id, action.pane_type || 'document', action.title, action.data);
                break;
            default:
                throw new Error(`Unknown action type: ${(action as any).type}`);
        }

        logAction(action, 'completed');

        // P1-B: Release speculative hold so Orb can return to idle/polling
        setIdle();

        // P3: Dispatch completion event
        window.dispatchEvent(new CustomEvent('mora:agency-update', {
            detail: {
                type: 'action',
                status: 'complete',
                intent: getStatusMessage('action', 'complete'),
                actionId: `${action.type}-${Date.now()}`,
                data: action
            }
        }));

        return true;
    } catch (error) {
        logAction(action, 'failed', String(error));
        setIdle();
        return false;
    }
}

/**
 * Execute a full proposal sequence.
 */
export async function executeProposal(proposal: ActionProposal): Promise<void> {
    if (_isExecuting) {
        console.warn('[Agency] Already executing a proposal');
        return;
    }

    _isExecuting = true;
    _currentProposalId = proposal.proposal_id;
    _abortController = new AbortController();

    setThinking(); // UPGRADE: Orb reflects cognitive load of proposal execution

    // P3: Dispatch proposal start with German intent
    window.dispatchEvent(new CustomEvent('mora:agency-update', {
        detail: {
            type: 'proposal',
            status: 'start',
            intent: getProposalIntent(proposal.summary || ''),
            proposalId: proposal.proposal_id,
            data: proposal
        }
    }));

    console.log(`[Agency] Starting proposal ${proposal.proposal_id} with ${proposal.actions.length} actions`);

    for (const action of proposal.actions) {
        if (_abortController.signal.aborted) {
            console.log('[Agency] Execution aborted');
            break;
        }

        await executeAction(action);

        // Small delay between actions for visibility
        await sleep(500);
    }

    _isExecuting = false;
    _currentProposalId = null;
    _abortController = null;
    notifyListeners(null);

    // P1-B Polish: Sequence complete, now we rest.
    setIdle();

    // P3: Dispatch proposal complete with German intent
    window.dispatchEvent(new CustomEvent('mora:agency-update', {
        detail: {
            type: 'proposal',
            status: 'complete',
            intent: getStatusMessage('proposal', 'complete'),
            proposalId: proposal.proposal_id,
            data: proposal
        }
    }));

    console.log(`[Agency] Proposal ${proposal.proposal_id} complete`);
}

/**
 * Abort current execution immediately.
 */
export function abortExecution(): void {
    if (_abortController) {
        _abortController.abort();
        console.log('[Agency] Abort signal sent');
    }
    _isExecuting = false;
    notifyListeners(null);
}

/**
 * Get the action log.
 */
export function getActionLog(): ActionLogEntry[] {
    return [..._actionLog];
}

/**
 * Check if currently executing.
 */
export function isExecuting(): boolean {
    return _isExecuting;
}

/**
 * Subscribe to state changes.
 */
export function subscribe(listener: StateListener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
}

// ============================================
// Action Implementations
// ============================================

async function moveCursor(targetId: string): Promise<void> {
    // ATTENTIONAL HANDSHAKE: Dispatch event immediately (non-blocking).
    // Animation timing is handled by AgencyCursor component's spring physics.
    // This decouples ATTENTION (cursor) from EXECUTION (navigation).
    const event = new CustomEvent('agency:move_cursor', {
        detail: { targetId }
    });
    window.dispatchEvent(event);
    // No blocking sleep. Cursor movement is declarative, not blocking.
}

async function highlightElement(targetId: string, durationMs: number): Promise<void> {
    // Find element
    const element = document.getElementById(targetId) || document.querySelector(`[data-agency-id="${targetId}"]`);

    if (element) {
        // Add highlight class
        element.classList.add('agency-highlight');

        // Dispatch event for overlay component
        const event = new CustomEvent('agency:highlight', {
            detail: { targetId, durationMs }
        });
        window.dispatchEvent(event);

        // Wait for duration
        await sleep(durationMs);

        // Remove highlight
        element.classList.remove('agency-highlight');
    } else {
        console.warn(`[Agency] Target not found: ${targetId}`);
    }
}

async function focusPane(paneId: string): Promise<void> {
    // Dispatch custom event for MoraShell AgencyEventBus
    const event = new CustomEvent('agency:focus_pane', {
        detail: { paneId }
    });
    window.dispatchEvent(event);

    await sleep(300);
}

async function navigateDepartment(departmentId: string): Promise<void> {
    // Dispatch custom event for MoraShell AgencyEventBus
    const event = new CustomEvent('agency:navigate_department', {
        detail: { departmentId }
    });
    window.dispatchEvent(event);

    await sleep(500); // Navigation takes longer
}

async function navigateSpace(spaceId: string): Promise<void> {
    const event = new CustomEvent('agency:navigate_space', {
        detail: { spaceId }
    });
    window.dispatchEvent(event);

    await sleep(500);
}

async function navigateFolder(folderId: string): Promise<void> {
    const event = new CustomEvent('agency:navigate_folder', {
        detail: { folderId }
    });
    window.dispatchEvent(event);

    await sleep(500);
}

async function openPaneAction(
    paneId: string,
    paneType: string,
    title?: string,
    data?: Record<string, unknown>
): Promise<void> {
    const event = new CustomEvent('agency:open_pane', {
        detail: { paneId, paneType, title: title || paneType, data }
    });
    window.dispatchEvent(event);

    await sleep(300);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
