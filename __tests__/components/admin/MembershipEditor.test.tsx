import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MembershipEditor } from '@/components/admin/MembershipEditor';
import { updateUserMemberships } from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// I/O boundary — fine to mock
jest.mock('@/lib/api/coreClient', () => ({
    updateUserMemberships: jest.fn(),
}));

const mockUpdate = updateUserMemberships as jest.MockedFunction<typeof updateUserMemberships>;

const mockUser = {
    id: 'u-1',
    name: 'Max Mustermann',
    email: 'max@firma.de',
    role: 'member' as const,
    status: 'active' as const,
    department_memberships: [{ id: 'd-eng', name: 'Engineering' }],
};

// Stable references outside factory
const mockDepartments = [
    { id: 'd-eng', name: 'Engineering', visibility: 'private' as const, order: 0, slug: 'engineering', tenant_id: 't-1' },
    { id: 'd-design', name: 'Design', visibility: 'visible' as const, order: 1, slug: 'design', tenant_id: 't-1' },
    { id: 'd-all', name: 'Allgemein', visibility: 'public' as const, order: 2, slug: 'allgemein', tenant_id: 't-1' },
];

beforeEach(resetAllStores);

describe('MembershipEditor', () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function renderEditor() {
        useNavStore.setState({ activeCompanyId: 'company-1' } as any);
        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.departments('company-1'), mockDepartments);
        return renderWithProviders(
            <MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />,
            { queryClient: qc }
        );
    }

    it('shows the user name', () => {
        renderEditor();
        expect(screen.getByText(/Max Mustermann/i)).toBeInTheDocument();
    });

    it('exposes an accessible modal dialog and close action', () => {
        renderEditor();

        expect(screen.getByRole('dialog', { name: /Mitgliedschaften für Max Mustermann/i }))
            .toHaveAttribute('aria-modal', 'true');

        fireEvent.click(screen.getByRole('button', { name: /Mitgliedschaftsdialog schließen/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes once when Escape is pressed inside the dialog', () => {
        renderEditor();

        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('moves initial focus into the dialog and restores the previous focus on unmount', () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();

        const { unmount } = renderEditor();

        expect(screen.getByRole('button', { name: /Mitgliedschaftsdialog schließen/i }))
            .toHaveFocus();

        unmount();
        expect(trigger).toHaveFocus();
        trigger.remove();
    });

    it('keeps keyboard focus inside the modal', () => {
        renderEditor();
        const close = screen.getByRole('button', { name: /schlie/i });
        const save = screen.getByRole('button', { name: /speichern/i });

        save.focus();
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
        expect(close).toHaveFocus();

        close.focus();
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
        expect(save).toHaveFocus();
    });

    it('lists all available departments as checkboxes', () => {
        renderEditor();
        expect(screen.getByLabelText(/Engineering/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Design/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Allgemein/i)).toBeInTheDocument();
    });

    it("pre-checks the user's current memberships", () => {
        renderEditor();
        expect(screen.getByLabelText(/Engineering/i)).toBeChecked();
        expect(screen.getByLabelText(/Design/i)).not.toBeChecked();
    });

    it('calls updateUserMemberships with selected IDs on save', async () => {
        mockUpdate.mockResolvedValue({ success: true });
        renderEditor();
        fireEvent.click(screen.getByLabelText(/Design/i));
        fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('u-1', expect.arrayContaining(['d-eng', 'd-design']));
        });
    });

    it('calls onSaved with updated user after successful save', async () => {
        mockUpdate.mockResolvedValue({ success: true });
        renderEditor();
        fireEvent.click(screen.getByLabelText(/Design/i));
        fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1' }));
        });
    });

    it('shows error state when updateUserMemberships returns null', async () => {
        mockUpdate.mockResolvedValue(null);
        renderEditor();
        fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
        await waitFor(() => {
            expect(screen.getByText(/fehlgeschlagen/i)).toBeInTheDocument();
        });
    });

    it('calls onClose when cancelled', () => {
        renderEditor();
        fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
