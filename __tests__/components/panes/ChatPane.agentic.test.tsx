import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockStreamSend = jest.fn();
const mockExecuteAgenticLoop = jest.fn();
const mockOpenPane = jest.fn();
const mockDispatchMoraPresence = jest.fn();

jest.mock('@/lib/hooks/useMoraStream', () => ({
  useMoraStream: () => ({
    sendMessage: (...args: any[]) => mockStreamSend(...args),
    streamingText: '',
    isStreaming: false,
    error: null,
    messages: [],
    clearHistory: jest.fn(),
  }),
}));

jest.mock('@/lib/api/cognitionClient', () => ({
  executeAgenticLoop: (...args: any[]) => mockExecuteAgenticLoop(...args),
}));

jest.mock('@/lib/api/coreClient', () => ({
  learnInsight: jest.fn(),
  searchMemory: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
  buildChatContext: jest.fn(() => ({})),
}));

jest.mock('@/lib/ai/cursorBridge', () => ({
  parseAIResponse: jest.fn(),
  executeCursorCommands: jest.fn(),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
  dispatchMoraPresence: (...args: any[]) => mockDispatchMoraPresence(...args),
}));

jest.mock('@/lib/mora/useMoraContext', () => ({
  useMoraContext: () => ({
    isOperational: true,
    scopeLabels: { company: 'Simple Coffee Group' },
    scopeLevel: 'company',
  }),
}));

jest.mock('@/components/mora/MoraContextChip', () => ({
  MoraContextChip: () => <div data-testid="mora-context-chip">scope</div>,
}));

jest.mock('@/components/layers/GlassPanel', () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/store/paneStore', () => ({
  usePaneStore: (selector?: any) => {
    const store = {
      removePane: jest.fn(),
      minimizePane: jest.fn(),
      focusPane: jest.fn(),
      getPane: () => ({
        id: 'chat-main',
        size: { width: 900, height: 700 },
        position: { x: 0, y: 0 },
        zIndex: 1,
        data: {},
      }),
      updatePanePosition: jest.fn(),
      updatePaneSize: jest.fn(),
      openPane: (...args: any[]) => mockOpenPane(...args),
    };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@/lib/store/moraState', () => ({
  useMoraStore: (selector?: any) => {
    const store = {
      departments: [{ id: 'dept-1', name: 'Marketing' }],
      isStandardMode: false,
      activeCompanyId: 'company-1',
      activeDepartmentId: null,
      activeSpaceId: 'space-1',
      activeFolderId: null,
      viewLevel: 'space',
      orbState: 'idle',
      navigateToDepartment: jest.fn(),
    };
    return selector ? selector(store) : store;
  },
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import { ChatPane } from '@/components/panes/ChatPane';

describe('ChatPane agentic file ops', () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => `test-uuid-${Math.random().toString(36).slice(2)}`) },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('routes create-folder intent into pending confirmation instead of streaming', async () => {
    mockExecuteAgenticLoop.mockResolvedValue({
      final_state: 'S4_CONFIRM',
      final_message: 'Ich habe einen Aktionsplan vorbereitet.',
      pending_confirmations: [{
        tool_name: 'create_folder',
        tool_params: {
          summary: 'Ordner Q4 Marketing wird erstellt',
          operations: [{ type: 'create_folder', name: 'Q4 Marketing', space_id: 'space-1' }],
        },
        risk_level: 'write',
        confirmation_token: 'tok-1',
        action_id: 'act-1',
        what_will_change: 'Ordner wird erstellt',
      }],
    });

    render(<ChatPane id="chat-main" />);

    fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/i), {
      target: { value: 'Erstelle einen Ordner Q4 Marketing' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(/Schreib Mora/i), { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockExecuteAgenticLoop).toHaveBeenCalledWith('Erstelle einen Ordner Q4 Marketing', expect.objectContaining({
        level: 'space',
        entityId: 'space-1',
        entityType: 'space',
        companyId: 'company-1',
      }));
    });

    expect(mockStreamSend).not.toHaveBeenCalled();
        expect(screen.getByText('Ordner Q4 Marketing wird erstellt')).toBeInTheDocument();
  });

  test('routes rename intent into pending confirmation instead of streaming', async () => {
    mockExecuteAgenticLoop.mockResolvedValue({
      final_state: 'S4_CONFIRM',
      final_message: 'Ich habe einen Umbenennungsplan vorbereitet.',
      pending_confirmations: [{
        tool_name: 'rename_node',
        tool_params: {
          summary: 'Datei Budget 2026.pdf wird in Budget 2027.pdf umbenannt',
          operations: [{ type: 'rename_node', node_id: 'node-1', node_name: 'Budget 2026.pdf', new_name: 'Budget 2027.pdf' }],
        },
        risk_level: 'write',
        confirmation_token: 'tok-rename',
        action_id: 'act-rename',
      }],
    });

    render(<ChatPane id="chat-main" />);

    fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/i), {
      target: { value: 'Benenne diese Datei in Budget 2027.pdf um' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(/Schreib Mora/i), { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockExecuteAgenticLoop).toHaveBeenCalledWith('Benenne diese Datei in Budget 2027.pdf um', expect.objectContaining({
        level: 'space',
        entityId: 'space-1',
        entityType: 'space',
        companyId: 'company-1',
      }));
    });

    expect(mockStreamSend).not.toHaveBeenCalled();
    expect(await screen.findByText('Datei Budget 2026.pdf wird in Budget 2027.pdf umbenannt')).toBeInTheDocument();
  });

  test('routes non-file prompts through streaming chat', async () => {
    mockStreamSend.mockResolvedValue('Hier ist ein Statusupdate.');

    render(<ChatPane id="chat-main" />);

    fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/i), {
      target: { value: 'Was gibt es Neues?' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(/Schreib Mora/i), { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockStreamSend).toHaveBeenCalledWith('Was gibt es Neues?', expect.any(Object));
    });
    expect(mockExecuteAgenticLoop).not.toHaveBeenCalled();
    expect(await screen.findByText(/Hier ist ein Statusupdate./i)).toBeInTheDocument();
  });

  it('routes create_note intents through the agentic loop', async () => {
    mockExecuteAgenticLoop.mockResolvedValueOnce({
      final_state: 'S4_CONFIRM',
      pending_confirmations: [{
        tool_name: 'create_note',
        confirmation_token: 'tok-note',
        action_id: 'act-note',
        risk_level: 'write',
        what_will_change: "Notiz 'Launch Briefing' wird erstellt",
        tool_params: {
          summary: "Notiz 'Launch Briefing' wird erstellt",
          operations: [{ type: 'create_note', title: 'Launch Briefing', destination_label: 'Winter Marketing', content_preview: 'Erste Stichpunkte' }],
        },
      }],
    });

    render(<ChatPane id="chat-main" />);
    const textarea = screen.getByPlaceholderText(/Schreib Mora/i);
    fireEvent.change(textarea, { target: { value: 'Erstelle eine Notiz Launch Briefing' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, preventDefault: jest.fn() });

    await waitFor(() => expect(mockExecuteAgenticLoop).toHaveBeenCalled());
    expect(await screen.findByText("Notiz erstellen")).toBeInTheDocument();
    expect(screen.getByText('Launch Briefing', { selector: 'span' })).toBeInTheDocument();
  });

  it('routes create_draft intents through the agentic loop', async () => {
    mockExecuteAgenticLoop.mockResolvedValueOnce({
      final_state: 'S4_CONFIRM',
      pending_confirmations: [{
        tool_name: 'create_draft',
        confirmation_token: 'tok-draft',
        action_id: 'act-draft',
        risk_level: 'write',
        what_will_change: "Entwurf 'Q4 Launch' wird erstellt",
        tool_params: {
          summary: "Entwurf 'Q4 Launch' wird erstellt",
          operations: [{ type: 'create_draft', title: 'Q4 Launch', destination_label: 'Campaigns', content_preview: 'Erster Entwurf' }],
        },
      }],
    });

    render(<ChatPane id="chat-main" />);
    const textarea = screen.getByPlaceholderText(/Schreib Mora/i);
    fireEvent.change(textarea, { target: { value: 'Erstelle einen Entwurf Q4 Launch' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, preventDefault: jest.fn() });

    await waitFor(() => expect(mockExecuteAgenticLoop).toHaveBeenCalled());
    expect(await screen.findByText("Entwurf erstellen")).toBeInTheDocument();
    expect(screen.getByText('Q4 Launch', { selector: 'span' })).toBeInTheDocument();
  });


  it('routes update_note_content intents through the agentic loop', async () => {
    mockExecuteAgenticLoop.mockResolvedValueOnce({
      final_state: 'S4_CONFIRM',
      pending_confirmations: [{
        tool_name: 'update_note_content',
        confirmation_token: 'tok-update-note',
        action_id: 'act-update-note',
        risk_level: 'write',
        what_will_change: "Entwurf 'Q4 Launch Plan' wird aktualisiert",
        tool_params: {
          summary: "Entwurf 'Q4 Launch Plan' wird aktualisiert",
          operations: [{ type: 'update_note_content', node_id: 'node-1', node_name: 'Q4 Launch Plan', destination_label: 'Campaigns', previous_content_preview: 'Alt', content_preview: 'Neu' }],
        },
      }],
    });

    render(<ChatPane id="chat-main" />);
    const textarea = screen.getByPlaceholderText(/Schreib Mora/i);
    fireEvent.change(textarea, { target: { value: 'Aktualisiere diese Notiz mit Neuem Inhalt' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false, preventDefault: jest.fn() });

    await waitFor(() => expect(mockExecuteAgenticLoop).toHaveBeenCalled());
    expect(await screen.findByText('Inhalt aktualisieren')).toBeInTheDocument();
    expect(screen.getByText('Q4 Launch Plan', { selector: 'span' })).toBeInTheDocument();
  });

});
