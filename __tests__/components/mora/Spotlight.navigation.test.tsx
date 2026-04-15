import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spotlight } from '@/components/mora/Spotlight';

// Stable mock state references (prevent infinite render loops)
const STABLE_DEPARTMENTS: any[] = [];
const STABLE_SPACES_BY_DEPT: Record<string, any[]> = {};

const mockNavigateToCore = jest.fn();
const mockSetActiveCompany = jest.fn();
const mockSetViewMode = jest.fn();
const mockNavigateToDepartment = jest.fn();
const mockNavigateToSpace = jest.fn();

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: (selector?: (s: any) => unknown) => {
        const store = {
            departments: STABLE_DEPARTMENTS,
            spacesByDepartment: STABLE_SPACES_BY_DEPT,
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: (selector?: (s: any) => unknown) => {
        const store = {
            activeCompanyId: 'co-1',
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            viewLevel: 'core',
            navigateToCore: mockNavigateToCore,
            setActiveCompany: mockSetActiveCompany,
            setViewMode: mockSetViewMode,
            navigateToDepartment: mockNavigateToDepartment,
            navigateToSpace: mockNavigateToSpace,
        };
        return selector ? selector(store) : store;
    },
}));

jest.mock('@/lib/queries/useCompanies', () => ({
    useCompanies: () => ({ data: [] }),
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

jest.mock('@/lib/utils/openMoraCenter', () => ({
    openMoraCenter: jest.fn(),
}));

describe('Spotlight core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home action resets to core home via navigateToCore', () => {
        const onClose = jest.fn();

        render(<Spotlight isOpen={true} onClose={onClose} />);

        fireEvent.change(screen.getByPlaceholderText('Resonanz erzeugen...'), { target: { value: 'home' } });
        const homeButton = screen.getAllByRole('button').find((button) => button.textContent?.includes('Home'));
        expect(homeButton).toBeDefined();
        fireEvent.click(homeButton!);

        expect(mockNavigateToCore).toHaveBeenCalledTimes(1);
        expect(mockSetActiveCompany).toHaveBeenCalledWith('co-1');
        expect(minimizePane).toHaveBeenCalledWith('pane-1');
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
