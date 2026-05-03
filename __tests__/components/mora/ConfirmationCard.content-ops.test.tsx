/**
 * ConfirmationCard — content-ops trust pass
 *
 * Tests the Agency Step 2 polish requirements:
 *   1. create_note / create_draft should NOT show "Dateibaum-Änderung" subtitle
 *   2. filePlanSummary must count note and draft ops (not fall back to "Dateioperation prüfen")
 *   3. Confirm button must show "Ausführen" (with ü, not ASCII workaround)
 *   4. Footer disclaimer must be content-appropriate for pure content ops
 *
 * Backend truth (Core e2da98c): confirmed results carry result_summary + destination_summary.
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { ConfirmationCard } from '@/components/mora/ConfirmationCard';

jest.mock('@/lib/api/coreClient', () => ({
  corePost: jest.fn(),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
  dispatchMoraPresence: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const createNoteAction = {
  tool_name: 'create_note',
  risk_level: 'write',
  confirmation_token: 'tok-note',
  action_id: 'act-note',
  params: {
    summary: "Notiz 'Launch Briefing' wird erstellt",
    operations: [
      {
        type: 'create_note',
        title: 'Launch Briefing',
        destination_label: 'Winter Marketing',
        content_preview: 'Erste Stichpunkte zum Launch',
      },
    ],
    session_id: 'sess-note',
  },
} as any;

const createDraftAction = {
  tool_name: 'create_draft',
  risk_level: 'write',
  confirmation_token: 'tok-draft',
  action_id: 'act-draft',
  params: {
    summary: "Entwurf 'Q4 Launch' wird erstellt",
    operations: [
      {
        type: 'create_draft',
        title: 'Q4 Launch Plan',
        destination_label: 'Campaigns',
        content_preview: 'Erster strukturierter Entwurf',
      },
    ],
    session_id: 'sess-draft',
  },
} as any;

// No explicit summary — tests filePlanSummary auto-generation
const createNoteActionNoSummary = {
  tool_name: 'create_note',
  risk_level: 'write',
  confirmation_token: 'tok-note-ns',
  action_id: 'act-note-ns',
  params: {
    operations: [
      { type: 'create_note', title: 'Meeting Notes', destination_label: 'Inbox' },
    ],
    session_id: 'sess-note-ns',
  },
} as any;

const createDraftActionNoSummary = {
  tool_name: 'create_draft',
  risk_level: 'write',
  confirmation_token: 'tok-draft-ns',
  action_id: 'act-draft-ns',
  params: {
    operations: [
      { type: 'create_draft', title: 'Campaign Brief', destination_label: 'Marketing' },
      { type: 'create_draft', title: 'Press Release', destination_label: 'Marketing' },
    ],
    session_id: 'sess-draft-ns',
  },
} as any;

const mixedAction = {
  tool_name: 'move_node',
  risk_level: 'write',
  confirmation_token: 'tok-mixed',
  action_id: 'act-mixed',
  params: {
    operations: [
      { type: 'move_node', node_id: 'n1', node_name: 'Doc.pdf', target_folder_id: 'f1', target_folder_name: 'Archive' },
      { type: 'create_note', title: 'Archivierungsnotiz', destination_label: 'Archive' },
    ],
    session_id: 'sess-mixed',
  },
} as any;

const updateNoteContentAction = {
  tool_name: 'update_note_content',
  risk_level: 'write',
  confirmation_token: 'tok-update-note',
  action_id: 'act-update-note',
  params: {
    summary: "Entwurf 'Q4 Launch Plan' wird aktualisiert",
    operations: [
      {
        type: 'update_note_content',
        node_id: 'node-1',
        node_name: 'Q4 Launch Plan',
        destination_label: 'Campaigns',
        previous_content_preview: 'Alter Inhalt',
        content_preview: 'Neuer Inhalt fuer den Q4 Launch',
      },
    ],
    session_id: 'sess-update-note',
  },
} as any;

// ── Test suite ───────────────────────────────────────────────────────────────

describe('ConfirmationCard — content-ops trust pass', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ── Subtitle tests ──

  it('does NOT show "Dateibaum-Änderung" subtitle for create_note-only ops', () => {
    render(
      <ConfirmationCard action={createNoteAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    // Content creation ≠ filesystem change — this subtitle is factually wrong
    expect(screen.queryByText(/Dateibaum-Änderung/)).not.toBeInTheDocument();
  });

  it('shows "Inhalt erstellen" subtitle for create_note-only ops', () => {
    render(
      <ConfirmationCard action={createNoteAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    expect(screen.getByText(/Inhalt erstellen/i)).toBeInTheDocument();
  });

  it('does NOT show "Dateibaum-Änderung" subtitle for create_draft-only ops', () => {
    render(
      <ConfirmationCard action={createDraftAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    expect(screen.queryByText(/Dateibaum-Änderung/)).not.toBeInTheDocument();
  });

  it('shows "Inhalt erstellen" subtitle for create_draft-only ops', () => {
    render(
      <ConfirmationCard action={createDraftAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    expect(screen.getByText(/Inhalt erstellen/i)).toBeInTheDocument();
  });

  it('still shows "Dateibaum-Änderung" subtitle for mixed file+content ops', () => {
    render(
      <ConfirmationCard action={mixedAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    expect(screen.getByText(/Dateibaum-Änderung/)).toBeInTheDocument();
  });

  // ── Button label (umlaut) ──

  it('confirm button shows "Ausführen" with correct ü umlaut', () => {
    render(
      <ConfirmationCard action={createNoteAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    // Must be "Ausführen" — "Ausfuehren" is a typo / ASCII fallback
    expect(screen.getByRole('button', { name: 'Ausführen' })).toBeInTheDocument();
  });

  // ── filePlanSummary auto-generation ──

  it('auto-generates human-readable summary counting 1 note op when no explicit summary', () => {
    render(
      <ConfirmationCard action={createNoteActionNoSummary} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    // Must NOT fall back to generic "Dateioperation prüfen"
    expect(screen.queryByText('Dateioperation prüfen')).not.toBeInTheDocument();
    // Must include at least one element with "Notiz" (summary text + badge both expected)
    expect(screen.getAllByText(/Notiz/).length).toBeGreaterThan(0);
  });

  it('auto-generates human-readable summary counting 2 draft ops when no explicit summary', () => {
    render(
      <ConfirmationCard action={createDraftActionNoSummary} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    expect(screen.queryByText('Dateioperation prüfen')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Entwurf/).length).toBeGreaterThan(0);
  });

  // ── Footer disclaimer ──

  it('footer disclaimer uses "Inhalt" framing for create_note-only ops', () => {
    render(
      <ConfirmationCard action={createNoteAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    // "diese Änderung" is wrong for content creation — must use "diesen Inhalt" or similar
    expect(screen.queryByText(/diese Änderung/)).not.toBeInTheDocument();
  });

  it('footer disclaimer still uses "Änderung" framing for filesystem ops', () => {
    render(
      <ConfirmationCard action={mixedAction} onConfirmed={jest.fn()} onRejected={jest.fn()} />
    );
    expect(screen.getByText(/diese Änderung/)).toBeInTheDocument();
  });
});
