import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminRosterView } from '@/components/admin/AdminRosterView';
import { fetchUserRoster } from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({
    fetchUserRoster: jest.fn(),
}));

jest.mock('@/components/admin/MembershipEditor', () => ({
    MembershipEditor: () => null,
}));

const mockFetch = fetchUserRoster as jest.MockedFunction<typeof fetchUserRoster>;

const mockUsers = [
    {
        id: 'u-1',
        name: 'Anna Admin',
        email: 'anna@firma.de',
        role: 'admin' as const,
        status: 'active' as const,
        department_memberships: [{ id: 'd-1', name: 'Engineering' }],
    },
    {
        id: 'u-2',
        name: 'Max Mustermann',
        email: 'max@firma.de',
        role: 'member' as const,
        status: 'invited' as const,
        department_memberships: [],
    },
];

describe('AdminRosterView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows users after loading', async () => {
        mockFetch.mockResolvedValue(mockUsers);
        render(<AdminRosterView />);
        await waitFor(() => {
            expect(screen.getByText(/Anna Admin/i)).toBeInTheDocument();
            expect(screen.getByText(/Max Mustermann/i)).toBeInTheDocument();
        });
    });

    it('shows the user role', async () => {
        mockFetch.mockResolvedValue(mockUsers);
        render(<AdminRosterView />);
        await waitFor(() => {
            // Role cell shows "Admin" (German label for admin role)
            const roleElements = screen.getAllByText(/Admin/i);
            expect(roleElements.length).toBeGreaterThan(0);
        });
    });

    it('shows department memberships', async () => {
        mockFetch.mockResolvedValue(mockUsers);
        render(<AdminRosterView />);
        await waitFor(() => {
            expect(screen.getByText(/Engineering/i)).toBeInTheDocument();
        });
    });

    it('degrades gracefully when fetchUserRoster returns null', async () => {
        mockFetch.mockResolvedValue(null);
        render(<AdminRosterView />);
        await waitFor(() => {
            expect(screen.getByText(/nicht verfügbar/i)).toBeInTheDocument();
        });
    });

    it('shows loading state initially', () => {
        mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
        render(<AdminRosterView />);
        expect(screen.getByTestId('roster-loading')).toBeInTheDocument();
    });
});
