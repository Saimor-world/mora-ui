/**
 * ShellBreadcrumb.test.tsx
 *
 * NEW PATTERN: No jest.mock on stores or query hooks.
 * - Zustand state via useNavStore.setState()
 * - Query data via queryClient.setQueryData()
 * - Only external I/O (framer-motion, API clients) gets mocked
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores, testFixtures } from '../../../test-utils';
import { ShellBreadcrumb } from '@/components/os/shell/ShellBreadcrumb';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// Only mock what is NOT business logic
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
        button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const { company, department: baseDept, space: baseSpace } = testFixtures;

interface RenderState {
    viewLevel: string;
    activeDepartmentId?: string | null;
    activeSpaceId?: string | null;
    departments?: typeof baseDept[];
    spaces?: typeof baseSpace[];
    navigateToExplore?: jest.Mock;
    navigateToDepartment?: jest.Mock;
    navigateToSpace?: jest.Mock;
}

function renderWith(state: RenderState) {
    // Pre-populate query cache before render
    const qc = renderWithProviders(<span />).queryClient; // get a fresh client

    qc.setQueryData(queryKeys.departments(company.id), state.departments ?? []);
    qc.setQueryData(
        queryKeys.spaces(state.activeDepartmentId ?? ''),
        state.spaces ?? []
    );

    // Set Zustand nav state synchronously before render
    useNavStore.setState({
        viewLevel: state.viewLevel as any,
        activeCompanyId: company.id,
        activeDepartmentId: state.activeDepartmentId ?? null,
        activeSpaceId: state.activeSpaceId ?? null,
        navigateToExplore: state.navigateToExplore ?? jest.fn(),
        navigateToDepartment: state.navigateToDepartment ?? jest.fn(),
        navigateToSpace: state.navigateToSpace ?? jest.fn(),
    } as any);

    return renderWithProviders(<ShellBreadcrumb />, { queryClient: qc });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(resetAllStores);

describe('ShellBreadcrumb — visibility', () => {
    it('renders nothing at viewLevel core', () => {
        const { container } = renderWith({ viewLevel: 'core' });
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing at viewLevel company', () => {
        const { container } = renderWith({ viewLevel: 'company' });
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing at viewLevel department (breadcrumb is folder-only)', () => {
        const { container } = renderWith({
            viewLevel: 'department',
            activeDepartmentId: baseDept.id,
            departments: [baseDept],
        });
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing at viewLevel space (breadcrumb is folder-only)', () => {
        const { container } = renderWith({
            viewLevel: 'space',
            activeDepartmentId: baseDept.id,
            activeSpaceId: baseSpace.id,
            departments: [baseDept],
            spaces: [baseSpace],
        });
        expect(container.firstChild).toBeNull();
    });

    it('renders at viewLevel folder', () => {
        renderWith({
            viewLevel: 'folder',
            activeDepartmentId: baseDept.id,
            activeSpaceId: baseSpace.id,
            departments: [baseDept],
            spaces: [baseSpace],
        });
        expect(screen.getByTestId('shell-breadcrumb')).toBeInTheDocument();
    });
});

describe('ShellBreadcrumb — segments', () => {
    it('shows department name at folder level', () => {
        renderWith({
            viewLevel: 'folder',
            activeDepartmentId: baseDept.id,
            activeSpaceId: baseSpace.id,
            departments: [baseDept],
            spaces: [baseSpace],
        });
        expect(screen.getByTestId('breadcrumb-dept')).toHaveTextContent(baseDept.name);
    });

    it('shows space name at folder level', () => {
        renderWith({
            viewLevel: 'folder',
            activeDepartmentId: baseDept.id,
            activeSpaceId: baseSpace.id,
            departments: [baseDept],
            spaces: [baseSpace],
        });
        expect(screen.getByTestId('breadcrumb-space')).toHaveTextContent(baseSpace.name);
    });

    it('does not show space segment when no space is active', () => {
        renderWith({
            viewLevel: 'folder',
            activeDepartmentId: baseDept.id,
            activeSpaceId: null,
            departments: [baseDept],
        });
        expect(screen.queryByTestId('breadcrumb-space')).not.toBeInTheDocument();
    });
});

describe('ShellBreadcrumb — navigation', () => {
    it('root click calls navigateToExplore', () => {
        const navigateToExplore = jest.fn();
        renderWith({
            viewLevel: 'folder',
            activeDepartmentId: baseDept.id,
            activeSpaceId: baseSpace.id,
            departments: [baseDept],
            spaces: [baseSpace],
            navigateToExplore,
        });
        fireEvent.click(screen.getByTestId('breadcrumb-root'));
        expect(navigateToExplore).toHaveBeenCalledTimes(1);
    });

    it('dept click at folder level calls navigateToDepartment', () => {
        const navigateToDepartment = jest.fn();
        const navigateToExplore = jest.fn();
        renderWith({
            viewLevel: 'folder',
            activeDepartmentId: baseDept.id,
            activeSpaceId: baseSpace.id,
            departments: [baseDept],
            spaces: [baseSpace],
            navigateToDepartment,
            navigateToExplore,
        });
        fireEvent.click(screen.getByTestId('breadcrumb-dept'));
        expect(navigateToDepartment).toHaveBeenCalledWith(baseDept.id);
        expect(navigateToExplore).not.toHaveBeenCalled();
    });
});
