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
    expect(await screen.findByText('Aktionsplan pruefen')).toBeInTheDocument();
    expect(screen.getByText('Ordner Q4 Marketing wird erstellt')).toBeInTheDocument();
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
});
