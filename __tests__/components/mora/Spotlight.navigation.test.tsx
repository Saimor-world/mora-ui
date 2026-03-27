import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spotlight } from '@/components/mora/Spotlight';
import { useMoraStore } from '@/lib/store/moraState';

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

const minimizePane = jest.fn();
const openPane = jest.fn();

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: () => ({
        openPane,
        panes: [
            { id: 'pane-1', minimized: false },
            { id: 'pane-2', minimized: true },
        ],
        minimizePane,
    }),
}));

jest.mock('@/lib/api/moraAgentClient', () => ({
    moraAgentClient: {
        chat: jest.fn(),
    },
}));

jest.mock('@/lib/ai/cursorBridge', () => ({
    parseAIResponse: jest.fn(),
    executeCursorCommands: jest.fn(),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, layoutId, whileHover, whileTap, ...props }: any, ref: React.Ref<any>) =>
            React.createElement(tag, { ref, ...props }, children)
        );

    return {
        motion: {
            div: passthrough('div'),
            button: passthrough('button'),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;

function renderWithState(state: Record<string, unknown>, onClose = jest.fn()) {
    mockUseMoraStore.mockImplementation((selector?: any) => (selector ? selector(state) : state));
    return {
        onClose,
        ...render(<Spotlight isOpen={true} onClose={onClose} />),
    };
}

describe('Spotlight core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home action resets to core home via navigateToCore', () => {
        const navigateToCore = jest.fn();
        const setActiveCompany = jest.fn();
        const onClose = jest.fn();

        renderWithState({
            departments: [],
            companies: [],
            spacesByDepartment: {},
            activeCompanyId: 'co-1',
            navigateToCore,
            setActiveCompany,
            setViewMode: jest.fn(),
            navigateToDepartment: jest.fn(),
            navigateToSpace: jest.fn(),
        }, onClose);

        fireEvent.change(screen.getByPlaceholderText('Resonanz erzeugen...'), { target: { value: 'home' } });
        const homeButton = screen.getAllByRole('button').find((button) => button.textContent?.includes('Home'));
        expect(homeButton).toBeDefined();
        fireEvent.click(homeButton!);

        expect(navigateToCore).toHaveBeenCalledTimes(1);
        expect(setActiveCompany).toHaveBeenCalledWith('co-1');
        expect(minimizePane).toHaveBeenCalledWith('pane-1');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
