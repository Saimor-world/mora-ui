import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MembershipEditor } from '@/components/admin/MembershipEditor';
import { updateUserMemberships } from '@/lib/api/coreClient';

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

const mockDepartments = [
    { id: 'd-eng', name: 'Engineering', visibility: 'private' as const, order: 0, slug: 'engineering', tenant_id: 't-1' },
    { id: 'd-design', name: 'Design', visibility: 'visible' as const, order: 1, slug: 'design', tenant_id: 't-1' },
    { id: 'd-all', name: 'Allgemein', visibility: 'public' as const, order: 2, slug: 'allgemein', tenant_id: 't-1' },
];

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: (sel?: (s: any) => unknown) => {
        const s = { activeCompanyId: 'company-1' };
        return sel ? sel(s) : s;
    }
}));

jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: () => ({ data: mockDepartments, isLoading: false })
}));

jest.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

describe('MembershipEditor', () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows the user name', () => {
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        expect(screen.getByText(/Max Mustermann/i)).toBeInTheDocument();
    });

    it('lists all available departments as checkboxes', () => {
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        expect(screen.getByLabelText(/Engineering/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Design/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Allgemein/i)).toBeInTheDocument();
    });

    it("pre-checks the user's current memberships", () => {
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        expect(screen.getByLabelText(/Engineering/i)).toBeChecked();
        expect(screen.getByLabelText(/Design/i)).not.toBeChecked();
    });

    it('calls updateUserMemberships with selected IDs on save', async () => {
        mockUpdate.mockResolvedValue({ success: true });
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        fireEvent.click(screen.getByLabelText(/Design/i));
        fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('u-1', expect.arrayContaining(['d-eng', 'd-design']));
        });
    });

    it('calls onSaved with updated user after successful save', async () => {
        mockUpdate.mockResolvedValue({ success: true });
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        fireEvent.click(screen.getByLabelText(/Design/i));
        fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1' }));
        });
    });

    it('shows error state when updateUserMemberships returns null', async () => {
        mockUpdate.mockResolvedValue(null);
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        fireEvent.click(screen.getByRole('button', { name: /speichern/i }));
        await waitFor(() => {
            expect(screen.getByText(/fehlgeschlagen/i)).toBeInTheDocument();
        });
    });

    it('calls onClose when cancelled', () => {
        render(<MembershipEditor user={mockUser} onClose={onClose} onSaved={onSaved} />);
        fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
