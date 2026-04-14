/**
 * ShellBreadcrumb.test.tsx
 *
 * TDD RED → GREEN for P3: Shell-level location breadcrumb.
 *
 * Contract:
 *   - Hidden at viewLevel 'core' and 'company' (core surfaces handle their own chrome)
 *   - Visible at 'department', 'space', 'folder'
 *   - Segments: [Root] / [DeptName] / [SpaceName]
 *   - Root click -> navigateToExplore()
 *   - Dept click (from space level) → navigateToDepartment(activeDepartmentId)
 *   - Each segment has data-testid for reliable query
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShellBreadcrumb } from '@/components/os/shell/ShellBreadcrumb';
import { useNavStore } from '@/lib/store/navStore';
import { useMoraStore } from '@/lib/store/moraState';

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: jest.fn(),
}));

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

const mockUseNavStore = useNavStore as jest.MockedFunction<typeof useNavStore>;
const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;

function renderWith(state: Record<string, unknown>) {
    // Nav fields go to navStore, collection data stays in moraState
    const navState = {
        viewLevel: state.viewLevel,
        activeDepartmentId: state.activeDepartmentId,
        activeSpaceId: state.activeSpaceId,
        navigateToExplore: state.navigateToExplore,
        navigateToDepartment: state.navigateToDepartment,
        navigateToSpace: state.navigateToSpace,
    };
    const moraState = {
        departments: state.departments,
        spacesByDepartment: state.spacesByDepartment,
    };
    mockUseNavStore.mockImplementation((selector?: any) =>
        selector ? selector(navState) : navState
    );
    mockUseMoraStore.mockImplementation((selector?: any) =>
        selector ? selector(moraState) : moraState
    );
    return render(<ShellBreadcrumb />);
}

const baseDept = { id: 'dept-1', name: 'Operations', color: '#10b981' };
const baseSpace = { id: 'space-1', name: 'Ops Workspace', department_id: 'dept-1', order: 0, is_default: false };

describe('ShellBreadcrumb — visibility', () => {
    it('renders nothing at viewLevel core', () => {
        const { container } = renderWith({ viewLevel: 'core', activeDepartmentId: null, activeSpaceId: null, departments: [], spacesByDepartment: {} });
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing at viewLevel company', () => {
        const { container } = renderWith({ viewLevel: 'company', activeDepartmentId: null, activeSpaceId: null, departments: [], spacesByDepartment: {} });
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing at viewLevel department (breadcrumb is folder-only)', () => {
        const { container } = renderWith({ viewLevel: 'department', activeDepartmentId: 'dept-1', activeSpaceId: null, departments: [baseDept], spacesByDepartment: {} });
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing at viewLevel space (breadcrumb is folder-only)', () => {
        const { container } = renderWith({ viewLevel: 'space', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(container.firstChild).toBeNull();
    });

    it('renders at viewLevel folder', () => {
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(screen.getByTestId('shell-breadcrumb')).toBeInTheDocument();
    });
});

describe('ShellBreadcrumb — segments', () => {
    it('shows department name at folder level', () => {
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(screen.getByTestId('breadcrumb-dept')).toHaveTextContent('Operations');
    });

    it('shows space name at folder level', () => {
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(screen.getByTestId('breadcrumb-space')).toHaveTextContent('Ops Workspace');
    });

    it('does not show space segment when no space is active', () => {
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: null, departments: [baseDept], spacesByDepartment: {} });
        expect(screen.queryByTestId('breadcrumb-space')).not.toBeInTheDocument();
    });
});

describe('ShellBreadcrumb — navigation', () => {
    it('root click calls navigateToExplore', () => {
        const navigateToExplore = jest.fn();
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] }, navigateToExplore });
        fireEvent.click(screen.getByTestId('breadcrumb-root'));
        expect(navigateToExplore).toHaveBeenCalledTimes(1);
    });

    it('dept click at folder level calls navigateToDepartment', () => {
        const navigateToDepartment = jest.fn();
        const navigateToExplore = jest.fn();
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] }, navigateToDepartment, navigateToExplore });
        fireEvent.click(screen.getByTestId('breadcrumb-dept'));
        expect(navigateToDepartment).toHaveBeenCalledWith('dept-1');
        expect(navigateToExplore).not.toHaveBeenCalled();
    });
});

