import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DepartmentVisibilityEditor } from '@/components/admin/DepartmentVisibilityEditor';
import { updateDepartmentVisibility } from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// I/O boundary — fine to mock
jest.mock('@/lib/api/coreClient', () => ({
    updateDepartmentVisibility: jest.fn(),
}));

const mockUpdate = updateDepartmentVisibility as jest.MockedFunction<typeof updateDepartmentVisibility>;

// Stable references — declared outside factory to prevent infinite loops
const mockDepartments = [
    { id: 'd-eng', name: 'Engineering', visibility: 'private' as const, order: 0, slug: 'engineering', tenant_id: 't-1' },
    { id: 'd-all', name: 'Allgemein', visibility: 'public' as const, order: 1, slug: 'allgemein', tenant_id: 't-1' },
    { id: 'd-fin', name: 'Finance', visibility: 'visible' as const, order: 2, slug: 'finance', tenant_id: 't-1' },
];

beforeEach(resetAllStores);

describe('DepartmentVisibilityEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function renderEditor() {
        // Set Zustand state BEFORE render (synchronous)
        useNavStore.setState({ activeCompanyId: 'company-1' } as any);
        // Pre-populate query cache BEFORE render to avoid loading flicker
        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.departments('company-1'), mockDepartments);
        return renderWithProviders(<DepartmentVisibilityEditor />, { queryClient: qc });
    }

    it('lists all departments', () => {
        renderEditor();
        expect(screen.getByText(/Engineering/i)).toBeInTheDocument();
        expect(screen.getByText(/Allgemein/i)).toBeInTheDocument();
        expect(screen.getByText(/Finance/i)).toBeInTheDocument();
    });

    it('shows current visibility for each department', () => {
        renderEditor();
        const selects = screen.getAllByRole('combobox');
        expect(selects[0]).toHaveValue('private');
    });

    it('calls updateDepartmentVisibility when visibility changes', async () => {
        mockUpdate.mockResolvedValue({ success: true });
        renderEditor();
        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'public' } });
        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('d-eng', 'public');
        });
    });

    it('shows an error indicator when update fails', async () => {
        mockUpdate.mockResolvedValue(null);
        renderEditor();
        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[0], { target: { value: 'public' } });
        await waitFor(() => {
            expect(screen.getByText(/fehlgeschlagen/i)).toBeInTheDocument();
        });
    });
});
