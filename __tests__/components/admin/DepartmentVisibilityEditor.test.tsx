import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DepartmentVisibilityEditor } from '@/components/admin/DepartmentVisibilityEditor';
import { updateDepartmentVisibility } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';

jest.mock('@/lib/api/coreClient', () => ({
    updateDepartmentVisibility: jest.fn(),
}));

const mockUpdate = updateDepartmentVisibility as jest.MockedFunction<typeof updateDepartmentVisibility>;

const mockDepartments = [
    { id: 'd-eng', name: 'Engineering', visibility: 'private' as const, order: 0, slug: 'engineering', tenant_id: 't-1' },
    { id: 'd-all', name: 'Allgemein', visibility: 'public' as const, order: 1, slug: 'allgemein', tenant_id: 't-1' },
    { id: 'd-fin', name: 'Finance', visibility: 'visible' as const, order: 2, slug: 'finance', tenant_id: 't-1' },
];

describe('DepartmentVisibilityEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useMoraStore.setState({ departments: mockDepartments });
    });

    it('lists all departments', () => {
        render(<DepartmentVisibilityEditor />);
        expect(screen.getByText(/Engineering/i)).toBeInTheDocument();
        expect(screen.getByText(/Allgemein/i)).toBeInTheDocument();
        expect(screen.getByText(/Finance/i)).toBeInTheDocument();
    });

    it('shows current visibility for each department', () => {
        render(<DepartmentVisibilityEditor />);
        const selects = screen.getAllByRole('combobox');
        expect(selects[0]).toHaveValue('private');
    });

    it('calls updateDepartmentVisibility when visibility changes', async () => {
        mockUpdate.mockResolvedValue({ success: true });
        render(<DepartmentVisibilityEditor />);
        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'public' } });
        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('d-eng', 'public');
        });
    });

    it('shows an error indicator when update fails', async () => {
        mockUpdate.mockResolvedValue(null);
        render(<DepartmentVisibilityEditor />);
        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'public' } });
        await waitFor(() => {
            expect(screen.getByText(/fehlgeschlagen/i)).toBeInTheDocument();
        });
    });
});
