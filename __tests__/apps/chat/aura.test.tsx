import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { getUserColorHex } from '@/lib/utils/userColors';
import ChatApp from '@/apps/chat';

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
    coreGet: jest.fn().mockResolvedValue(null),
    learnInsight: jest.fn(),
    searchMemory: jest.fn().mockResolvedValue([]),
    fetchWorkSessionPlan: jest.fn(),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    buildChatContext: jest.fn(() => ({})),
}));

jest.mock('@/lib/ai/cursorBridge', () => ({
    parseAIResponse: jest.fn(),
    executeCursorCommands: jest.fn(),
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

function assertAuraStyle(style: string, hexColor: string, isStandard: boolean = false) {
    const lowerStyle = style.toLowerCase();
    if (isStandard) {
        // E5F3FF => rgb(229, 243, 255)
        const hasHexBg = lowerStyle.includes('e5f3ff');
        const hasRgbBg = lowerStyle.includes('rgb(229, 243, 255)') || lowerStyle.includes('rgb(229,243,255)');
        expect(hasHexBg || hasRgbBg).toBe(true);

        // 0078D430 => rgba(0, 120, 212, 0.188) (0x30 / 255 = 48/255 = 0.188)
        const hasHexBorder = lowerStyle.includes('0078d430');
        const hasRgbaBorder = lowerStyle.includes('rgba(0, 120, 212, 0.18') || lowerStyle.includes('rgba(0,120,212,0.18');
        expect(hasHexBorder || hasRgbaBorder).toBe(true);
    } else {
        const color = hexColor.toLowerCase(); // e.g., #f472b6
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Background: opacity 1a (26/255 = 0.102)
        const hasHexBg = lowerStyle.includes(`${color}1a`);
        const hasRgbaBg = lowerStyle.includes(`rgba(${r}, ${g}, ${b}, 0.1`) || lowerStyle.includes(`rgba(${r},${g},${b},0.1`);
        expect(hasHexBg || hasRgbaBg).toBe(true);

        // Border: opacity 40 (64/255 = 0.25)
        const hasHexBorder = lowerStyle.includes(`${color}40`);
        const hasRgbaBorder = lowerStyle.includes(`rgba(${r}, ${g}, ${b}, 0.25`) || lowerStyle.includes(`rgba(${r},${g},${b},0.25`);
        expect(hasHexBorder || hasRgbaBorder).toBe(true);
    }
}

function assertIconStyle(style: string, hexColor: string) {
    const lowerStyle = style.toLowerCase();
    const color = hexColor.toLowerCase(); // e.g. #f472b6
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const hasHex = lowerStyle.includes(color);
    const hasRgb = lowerStyle.includes(`rgb(${r}, ${g}, ${b})`) || lowerStyle.includes(`rgb(${r},${g},${b})`);
    expect(hasHex || hasRgb).toBe(true);
}

describe('ChatApp — personal aura color in user bubbles', () => {
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
        resetAllStores();
        useNavStore.setState({
            isStandardMode: false,
            activeCompanyId: 'company-1',
            activeDepartmentId: null,
            activeSpaceId: 'space-1',
            activeFolderId: null,
            viewLevel: 'space',
            viewMode: 'workspace',
        } as any);
    });

    it('renders user bubble and icon using deterministic personal aura color for non-owner in non-standard mode', async () => {
        const email = 'alice@example.com';
        const auraColor = getUserColorHex(email); // hex color e.g., #34d399

        useSessionStore.setState({
            user: { id: 'user-alice', email, name: 'Alice', role: 'member' }
        });

        const qc = createTestQueryClient();
        const { container } = renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: qc });

        const input = screen.getByPlaceholderText(/Schreib Mora/);
        fireEvent.change(input, { target: { value: 'Hallo Mora' } });

        const sendButton = container.querySelector('button.bg-violet-600') || screen.getByRole('button', { name: /Senden/i });
        expect(sendButton).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(sendButton!);
        });

        const bubbleText = screen.getByText('Hallo Mora');
        const bubble = bubbleText.closest('.max-w-\\[80\\%\\]') as HTMLElement;
        expect(bubble).toBeInTheDocument();

        const style = bubble.getAttribute('style') || '';
        assertAuraStyle(style, auraColor);

        const userIcon = bubble.querySelector('svg');
        expect(userIcon).toBeInTheDocument();
        assertIconStyle(userIcon?.getAttribute('style') || '', auraColor);
    });

    it('renders user bubble with standard styling and user icon with default standard color in standard mode', async () => {
        useNavStore.setState({ isStandardMode: true });

        const email = 'alice@example.com';

        useSessionStore.setState({
            user: { id: 'user-alice', email, name: 'Alice', role: 'member' }
        });

        const qc = createTestQueryClient();
        const { container } = renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: qc });

        const input = screen.getByPlaceholderText(/Schreib Mora/);
        fireEvent.change(input, { target: { value: 'Hallo Mora Standard' } });

        const sendButton = container.querySelector('button.bg-violet-600') || screen.getByRole('button', { name: /Senden/i });
        expect(sendButton).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(sendButton!);
        });

        const bubbleText = screen.getByText('Hallo Mora Standard');
        const bubble = bubbleText.closest('.max-w-\\[80\\%\\]') as HTMLElement;
        expect(bubble).toBeInTheDocument();

        const style = bubble.getAttribute('style') || '';
        assertAuraStyle(style, '', true);

        const userIcon = bubble.querySelector('svg');
        expect(userIcon).toBeInTheDocument();
        assertIconStyle(userIcon?.getAttribute('style') || '', '#0078d4');
    });

    it('renders user bubble and icon using gold color for owner role', async () => {
        useSessionStore.setState({
            user: { id: 'user-boss', email: 'boss@example.com', name: 'Boss', role: 'owner' }
        });

        const qc = createTestQueryClient();
        const { container } = renderWithProviders(<ChatApp paneId="chat-main" initialData={{}} />, { queryClient: qc });

        const input = screen.getByPlaceholderText(/Schreib Mora/);
        fireEvent.change(input, { target: { value: 'Hallo Mora Owner' } });

        const sendButton = container.querySelector('button.bg-violet-600') || screen.getByRole('button', { name: /Senden/i });
        expect(sendButton).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(sendButton!);
        });

        const bubbleText = screen.getByText('Hallo Mora Owner');
        const bubble = bubbleText.closest('.max-w-\\[80\\%\\]') as HTMLElement;
        expect(bubble).toBeInTheDocument();

        const style = bubble.getAttribute('style') || '';
        assertAuraStyle(style, '#d4af37');

        const userIcon = bubble.querySelector('svg');
        expect(userIcon).toBeInTheDocument();
        assertIconStyle(userIcon?.getAttribute('style') || '', '#d4af37');
    });
});
