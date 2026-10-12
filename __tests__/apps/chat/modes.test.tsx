import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { getUserColorHex } from '@/lib/utils/userColors';
import ChatApp from '@/apps/chat';

const mockCorePost = jest.fn();
// Mocks similar to ChatPane.pill.test.tsx
jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: (selector?: any) => {
        const store = {
            activePlanId: null,
            activeSessionId: null,
            setActiveSession: jest.fn(),
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

jest.mock('@/lib/api/cognitionClient', () => ({
    executeAgenticLoop: jest.fn(),
}));

jest.mock('@/lib/api/coreClient', () => ({
    corePost: (...a: any[]) => mockCorePost(...a),
    coreGet: jest.fn().mockResolvedValue(null),
    learnInsight: jest.fn(),
    searchMemory: jest.fn().mockResolvedValue([]),
    fetchWorkSessionPlan: jest.fn(),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    buildChatContext: jest.fn(() => ({})),
}));

jest.mock('@/lib/mora/presenceEvents', () => ({
    dispatchMoraPresence: jest.fn(),
}));

jest.mock('@/lib/mora/useMoraContext', () => ({
    useMoraContext: () => ({
        isOperational: true,
        scopeLabels: { company: 'Test Company' },
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

const mockOpenPane = jest.fn();
const STABLE_PANE = { id: 'chat-main', type: 'chat', title: 'Chat', size: { width: 900, height: 700 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector?: any) => {
        const store = {
            removePane: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            getPane: () => STABLE_PANE,
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            openPane: (...args: any[]) => mockOpenPane(...args),
            panes: [STABLE_PANE],
            activePaneId: 'chat-main',
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));


describe('ChatApp — MÔRA-Modi im Hauptchat', () => {
    beforeAll(() => {
        Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: jest.fn() });
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => `u-${Math.random().toString(36).slice(2)}`) } });
    });
    beforeEach(() => {
        resetAllStores();
        mockCorePost.mockReset();
        useNavStore.setState({ isStandardMode: false, activeCompanyId: 'company-1', activeSpaceId: 'space-1', viewLevel: 'space', viewMode: 'workspace' } as any);
        useSessionStore.setState({ user: { id: 'u1', email: 'a@b.c', name: 'A', role: 'owner' } } as any);
    });

    it('zeigt den Modus-Schalter mit Denken aktiv', () => {
        renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: createTestQueryClient() });
        const group = screen.getByTestId('main-chat-mode-switch');
        expect(group).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Denken' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('radio', { name: 'Bauen' })).toHaveAttribute('aria-checked', 'false');
    });

    it('Bauen schickt an /v3/chat/mode und zeigt Vorschlag ohne aktive Freigabe', async () => {
        mockCorePost.mockResolvedValue({ mode: 'bauen', text: 'Vorschlag bereit', proposals: [{ id: 'p1', label: 'Datei anlegen', status: 'awaiting_approval' }], sources: [], citations: [], flags: [] });
        const { container } = renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: createTestQueryClient() });
        fireEvent.click(screen.getByRole('radio', { name: 'Bauen' }));
        fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/), { target: { value: 'Bau mir was' } });
        await act(async () => { fireEvent.click(container.querySelector('button.bg-violet-600')!); });
        await waitFor(() => expect(screen.getByText('Datei anlegen')).toBeInTheDocument());
        expect(mockCorePost).toHaveBeenCalledWith('/v3/chat/mode', expect.objectContaining({ mode: 'bauen', message: 'Bau mir was' }));
        const approve = screen.getByRole('button', { name: /Freigeben/ });
        expect(approve).toBeDisabled();
    });

    it('Recherche zeigt Hinweis bei fehlenden Belegen', async () => {
        mockCorePost.mockResolvedValue({ mode: 'recherche', text: 'Unklar', proposals: [], sources: [], citations: [], flags: ['no_sources'] });
        const { container } = renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: createTestQueryClient() });
        fireEvent.click(screen.getByRole('radio', { name: 'Recherche' }));
        fireEvent.change(screen.getByPlaceholderText(/Schreib Mora/), { target: { value: 'Was weißt du?' } });
        await act(async () => { fireEvent.click(container.querySelector('button.bg-violet-600')!); });
        await waitFor(() => expect(screen.getByText(/Keine Belege gefunden/)).toBeInTheDocument());
    });
});
