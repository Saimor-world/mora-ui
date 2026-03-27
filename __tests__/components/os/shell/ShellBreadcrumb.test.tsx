/**
 * ShellBreadcrumb.test.tsx
 *
 * TDD RED → GREEN for P3: Shell-level location breadcrumb.
 *
 * Contract:
 *   - Hidden at viewLevel 'core' and 'company' (core surfaces handle their own chrome)
 *   - Visible at 'department', 'space', 'folder'
 *   - Segments: [Root] / [DeptName] / [SpaceName]
 *   - Root click → setViewLevel('core') + setCoreMode('explore')
 *   - Dept click (from space level) → navigateToDepartment(activeDepartmentId)
 *   - Each segment has data-testid for reliable query
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShellBreadcrumb } from '@/components/os/shell/ShellBreadcrumb';
import { useMoraStore } from '@/lib/store/moraState';

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;

function renderWith(state: Record<string, unknown>) {
    mockUseMoraStore.mockImplementation((selector?: any) =>
        selector ? selector(state) : state
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

    it('renders at viewLevel department', () => {
        renderWith({ viewLevel: 'department', activeDepartmentId: 'dept-1', activeSpaceId: null, departments: [baseDept], spacesByDepartment: {} });
        expect(screen.getByTestId('shell-breadcrumb')).toBeInTheDocument();
    });

    it('renders at viewLevel space', () => {
        renderWith({ viewLevel: 'space', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(screen.getByTestId('shell-breadcrumb')).toBeInTheDocument();
    });

    it('renders at viewLevel folder', () => {
        renderWith({ viewLevel: 'folder', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(screen.getByTestId('shell-breadcrumb')).toBeInTheDocument();
    });
});

describe('ShellBreadcrumb — segments', () => {
    it('shows department name at department level', () => {
        renderWith({ viewLevel: 'department', activeDepartmentId: 'dept-1', activeSpaceId: null, departments: [baseDept], spacesByDepartment: {} });
        expect(screen.getByTestId('breadcrumb-dept')).toHaveTextContent('Operations');
    });

    it('shows space name at space level', () => {
        renderWith({ viewLevel: 'space', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] } });
        expect(screen.getByTestId('breadcrumb-space')).toHaveTextContent('Ops Workspace');
    });

    it('does not show space segment at department level', () => {
        renderWith({ viewLevel: 'department', activeDepartmentId: 'dept-1', activeSpaceId: null, departments: [baseDept], spacesByDepartment: {} });
        expect(screen.queryByTestId('breadcrumb-space')).not.toBeInTheDocument();
    });
});

describe('ShellBreadcrumb — navigation', () => {
    it('root click sets viewLevel core + coreMode explore', () => {
        const setViewLevel = jest.fn();
        const setCoreMode = jest.fn();
        renderWith({ viewLevel: 'department', activeDepartmentId: 'dept-1', activeSpaceId: null, departments: [baseDept], spacesByDepartment: {}, setViewLevel, setCoreMode });
        fireEvent.click(screen.getByTestId('breadcrumb-root'));
        expect(setViewLevel).toHaveBeenCalledWith('core');
        expect(setCoreMode).toHaveBeenCalledWith('explore');
    });

    it('dept click at space level calls navigateToDepartment', () => {
        const navigateToDepartment = jest.fn();
        const setViewLevel = jest.fn();
        const setCoreMode = jest.fn();
        renderWith({ viewLevel: 'space', activeDepartmentId: 'dept-1', activeSpaceId: 'space-1', departments: [baseDept], spacesByDepartment: { 'dept-1': [baseSpace] }, navigateToDepartment, setViewLevel, setCoreMode });
        fireEvent.click(screen.getByTestId('breadcrumb-dept'));
        expect(navigateToDepartment).toHaveBeenCalledWith('dept-1');
        expect(setViewLevel).not.toHaveBeenCalled();
    });
});
