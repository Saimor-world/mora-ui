import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import { SpaceLayer } from '@/components/layers/SpaceLayer';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// ── shared nav store setup ──────────────────────────────────────────────────

const navigateToExplore = jest.fn();
const navigateToCore = jest.fn();
const navigateToDepartment = jest.fn();
const navigateToSpace = jest.fn();
const navigateToFolder = jest.fn();
const setActiveSpace = jest.fn();

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (sel?: (s: any) => unknown) => {
        const s = { panes: [STABLE_PANE], activePaneId: 'pane-test', openPane: jest.fn(), removePane: jest.fn(), updatePanePosition: jest.fn(), updatePaneSize: jest.fn(), minimizePane: jest.fn(), focusPane: jest.fn(), getPane: () => STABLE_PANE };
        return sel ? sel(s) : s;
    }
}));

jest.mock('@/lib/store/orbStore', () => ({
    useOrbStore: (sel?: (s: any) => unknown) => {
        const s = { orbState: 'idle' };
        return sel ? sel(s) : s;
    },
}));

jest.mock('@/lib/api/coreClient', () => ({
    fetchSingleDepartmentStats: jest.fn().mockResolvedValue(null),
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

beforeEach(resetAllStores);

describe('Breadcrumb root navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes Department root click to Explore instead of Home', () => {
        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.departments('company-1'), [{ id: 'dept-1', name: 'Operations', color: '#10b981' }]);
        qc.setQueryData(queryKeys.spaces('dept-1'), []);
        qc.setQueryData(queryKeys.folders(undefined), []);
        qc.setQueryData(queryKeys.nodes(undefined), []);
        qc.setQueryData(queryKeys.tree('company-1'), []);

        useNavStore.setState({
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
        } as any);

        renderWithProviders(<DepartmentLayer />, { queryClient: qc });
        fireEvent.click(screen.getByTestId('nav-back-to-universe'));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
        expect(navigateToCore).not.toHaveBeenCalled();
    });

    it('routes Space root breadcrumb click to Explore', () => {
        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.departments('company-1'), [{ id: 'dept-1', name: 'Operations', color: '#10b981' }]);
        qc.setQueryData(queryKeys.spaces('dept-1'), [{ id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false }]);
        qc.setQueryData(queryKeys.folders('space-1'), []);
        qc.setQueryData(queryKeys.nodes(undefined), []);
        qc.setQueryData(queryKeys.tree('company-1'), []);

        useNavStore.setState({
            activeSpaceId: 'space-1',
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            activeFolderId: null,
            viewLevel: 'space',
            navigateToDepartment,
            navigateToFolder,
            navigateToExplore,
        } as any);

        renderWithProviders(<SpaceLayer />, { queryClient: qc });
        fireEvent.click(screen.getByTestId('nav-root-to-universe'));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
        expect(navigateToDepartment).not.toHaveBeenCalled();
    });

    it('keeps Space back button navigating to Department', () => {
        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.departments('company-1'), [{ id: 'dept-1', name: 'Operations', color: '#10b981' }]);
        qc.setQueryData(queryKeys.spaces('dept-1'), [{ id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false }]);
        qc.setQueryData(queryKeys.folders('space-1'), []);
        qc.setQueryData(queryKeys.nodes(undefined), []);
        qc.setQueryData(queryKeys.tree('company-1'), []);

        useNavStore.setState({
            activeSpaceId: 'space-1',
            activeDepartmentId: 'dept-1',
            activeCompanyId: 'company-1',
            activeFolderId: null,
            viewLevel: 'space',
            navigateToDepartment,
            navigateToFolder,
            navigateToExplore,
        } as any);

        renderWithProviders(<SpaceLayer />, { queryClient: qc });
        fireEvent.click(screen.getByTestId('nav-back-to-department'));

        expect(navigateToDepartment).toHaveBeenCalledWith('dept-1');
        expect(navigateToExplore).not.toHaveBeenCalled();
    });
});
