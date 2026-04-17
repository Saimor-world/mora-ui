import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spotlight } from '@/components/mora/Spotlight';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';

jest.mock('@/lib/queries/useTree', () => {
    const stableEmptyTree: never[] = [];
    return {
        useTree: jest.fn(() => ({ data: stableEmptyTree, isFetching: false })),
    };
});

const mockNavigateToCore = jest.fn();
const mockSetActiveCompany = jest.fn();
const mockSetViewMode = jest.fn();
const mockNavigateToDepartment = jest.fn();
const mockNavigateToSpace = jest.fn();

const minimizePane = jest.fn();
const openPane = jest.fn();

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (sel?: (s: any) => unknown) => {
        const s = {
            openPane,
            panes: [
                { id: 'pane-1', minimized: false },
                { id: 'pane-2', minimized: true },
            ],
            minimizePane,
            activePaneId: 'pane-test',
            removePane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            focusPane: jest.fn(),
            getPane: () => STABLE_PANE,
        };
        return sel ? sel(s) : s;
    },
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

beforeEach(resetAllStores);

describe('Spotlight core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home action resets to core home via navigateToCore', () => {
        useNavStore.setState({
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
        } as any);

        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.companies(), []);
        qc.setQueryData(queryKeys.departments('co-1'), []);

        const onClose = jest.fn();
        renderWithProviders(<Spotlight isOpen={true} onClose={onClose} />, { queryClient: qc });

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
