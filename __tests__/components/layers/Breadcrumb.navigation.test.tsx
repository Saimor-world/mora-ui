import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { SpaceLayer } from '@/components/layers/SpaceLayer';

// ── shared nav store setup ──────────────────────────────────────────────────

const navigateToExplore = jest.fn();
const navigateToCore = jest.fn();
const navigateToDepartment = jest.fn();
const navigateToSpace = jest.fn();
const navigateToFolder = jest.fn();
const setActiveSpace = jest.fn();

let mockNavState: any = {};

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: (sel?: (s: any) => unknown) => {
        return sel ? sel(mockNavState) : mockNavState;
    },
}));

jest.mock('@/lib/store/orbStore', () => ({
    useOrbStore: (sel?: (s: any) => unknown) => {
        const s = { orbState: 'idle' };
        return sel ? sel(s) : s;
    },
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: () => ({ openPane: jest.fn() }),
}));

jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: () => ({ data: [{ id: 'dept-1', name: 'Operations', color: '#10b981' }], isLoading: false }),
}));

jest.mock('@/lib/queries/useSpaces', () => ({
    useSpaces: () => ({ data: [{ id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false }], isLoading: false }),
}));

jest.mock('@/lib/queries/useFolders', () => ({
    useFolders: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/lib/queries/useNodes', () => ({
    useNodes: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/lib/queries/useTree', () => ({
    useTree: () => ({ data: [], isLoading: false }),
}));

jest.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: jest.fn() }),
    useMutation: (_opts: any) => ({
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
    }),
    useQuery: () => ({ data: undefined, isLoading: false }),
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

jest.mock('@/components/layers/LayerInsightRail', () => ({
    LayerInsightRail: ({ children }: { children?: React.ReactNode }) => <div data-testid="layer-insight-rail">{children}</div>,
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

describe('Breadcrumb root navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes Department root click to Explore instead of Home', () => {
        mockNavState = {
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            activeSpaceId: null,
            activeFolderId: null,
            viewLevel: 'department',
            navigateToCore,
            navigateToSpace,
            navigateToFolder,
            setActiveSpace,
            navigateToExplore,
        };

        render(<DepartmentLayer />);
        fireEvent.click(screen.getByTestId('nav-back-to-universe'));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
        expect(navigateToCore).not.toHaveBeenCalled();
    });

    it('routes Space root breadcrumb click to Explore', () => {
        mockNavState = {
            activeSpaceId: 'space-1',
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            activeFolderId: null,
            viewLevel: 'space',
            navigateToDepartment,
            navigateToFolder,
            navigateToExplore,
        };

        render(<SpaceLayer />);
        fireEvent.click(screen.getByTestId('nav-root-to-universe'));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
        expect(navigateToDepartment).not.toHaveBeenCalled();
    });

    it('keeps Space back button navigating to Department', () => {
        mockNavState = {
            activeSpaceId: 'space-1',
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            activeFolderId: null,
            viewLevel: 'space',
            navigateToDepartment,
            navigateToFolder,
            navigateToExplore,
        };

        render(<SpaceLayer />);
        fireEvent.click(screen.getByTestId('nav-back-to-department'));

        expect(navigateToDepartment).toHaveBeenCalledWith('dept-1');
        expect(navigateToExplore).not.toHaveBeenCalled();
    });
});
