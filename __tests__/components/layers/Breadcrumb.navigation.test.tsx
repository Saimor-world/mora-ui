import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { SpaceLayer } from '@/components/layers/SpaceLayer';
import { useMoraStore } from '@/lib/store/moraState';

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: () => ({ openPane: jest.fn() }),
}));

jest.mock('@/components/ui/LoadingState', () => ({
    LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

jest.mock('@/components/ui/CreateModal', () => ({
    CreateModal: () => null,
}));

jest.mock('@/components/mora/Star', () => ({
    Star: () => <div data-testid="star" />,
}));

jest.mock('@/components/mora/Folder', () => ({
    Folder: () => <div data-testid="folder" />,
}));

jest.mock('@/lib/utils/deptStyle', () => ({
    getDeptStyle: () => ({ glow: '#10b981' }),
    ORBIT_PALETTE: ['#10b981', '#06b6d4', '#8b5cf6'],
}));

jest.mock('@/lib/api/coreClient', () => ({
    fetchSingleDepartmentStats: jest.fn().mockResolvedValue(null),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, whileFocus, layoutId, ...props }: any, ref: React.Ref<any>) =>
            React.createElement(tag, { ref, ...props }, children)
        );

    return {
        motion: {
            div: passthrough('div'),
            button: passthrough('button'),
        },
        useReducedMotion: () => true,
    };
});

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;

type MockStore = Record<string, unknown>;

function renderWithStore(ui: React.ReactElement, state: MockStore) {
    mockUseMoraStore.mockImplementation((selector?: any) => (selector ? selector(state) : state));
    return render(ui);
}

describe('Breadcrumb root navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes Department root click to Explore instead of Home', () => {
        const navigateToExplore = jest.fn();
        const navigateToCore = jest.fn();

        renderWithStore(<DepartmentLayer />, {
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            departments: [{ id: 'dept-1', name: 'Operations', color: '#10b981' }],
            spacesByDepartment: { 'dept-1': [] },
            foldersBySpace: {},
            isLoadingSpaces: false,
            treeData: [],
            loadSpacesForDepartment: jest.fn(),
            loadFoldersForSpace: jest.fn(),
            navigateToCore,
            navigateToSpace: jest.fn(),
            addSpace: jest.fn(),
            setActiveSpace: jest.fn(),
            navigateToExplore,
        });

        fireEvent.click(screen.getByTestId('nav-back-to-universe'));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
        expect(navigateToCore).not.toHaveBeenCalled();
    });

    it('routes Space root breadcrumb click to Explore', () => {
        const navigateToExplore = jest.fn();
        const navigateToDepartment = jest.fn();

        renderWithStore(<SpaceLayer />, {
            activeSpaceId: 'space-1',
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            departments: [{ id: 'dept-1', name: 'Operations', color: '#10b981' }],
            spacesByDepartment: {
                'dept-1': [{ id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false }],
            },
            foldersBySpace: { 'space-1': [] },
            nodesByFolder: {},
            orbState: 'idle',
            isLoadingFolders: false,
            viewLevel: 'space',
            navigateToDepartment,
            loadFoldersForSpace: jest.fn(),
            addFolder: jest.fn(),
            navigateToExplore,
        });

        fireEvent.click(screen.getByTestId('nav-root-to-universe'));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
        expect(navigateToDepartment).not.toHaveBeenCalled();
    });

    it('keeps Space back button navigating to Department', () => {
        const navigateToExplore = jest.fn();
        const navigateToDepartment = jest.fn();

        renderWithStore(<SpaceLayer />, {
            activeSpaceId: 'space-1',
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            departments: [{ id: 'dept-1', name: 'Operations', color: '#10b981' }],
            spacesByDepartment: {
                'dept-1': [{ id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false }],
            },
            foldersBySpace: { 'space-1': [] },
            nodesByFolder: {},
            orbState: 'idle',
            isLoadingFolders: false,
            viewLevel: 'space',
            navigateToDepartment,
            loadFoldersForSpace: jest.fn(),
            addFolder: jest.fn(),
            navigateToExplore,
        });

        fireEvent.click(screen.getByTestId('nav-back-to-department'));

        expect(navigateToDepartment).toHaveBeenCalledWith('dept-1');
        expect(navigateToExplore).not.toHaveBeenCalled();
    });
});
