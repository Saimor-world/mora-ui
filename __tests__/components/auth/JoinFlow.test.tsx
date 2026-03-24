import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JoinFlow } from '@/components/auth/JoinFlow';
import { fetchInvite, acceptInvite } from '@/lib/api/inviteClient';

jest.mock('@/lib/api/inviteClient', () => ({
    fetchInvite: jest.fn(),
    acceptInvite: jest.fn(),
}));

const mockFetchInvite = fetchInvite as jest.MockedFunction<typeof fetchInvite>;
const mockAcceptInvite = acceptInvite as jest.MockedFunction<typeof acceptInvite>;

const mockInvite = {
    token: 'tok-001',
    company_name: 'ACME GmbH',
    company_id: 'company-1',
    assigned_role: 'member',
    assigned_departments: [
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'Design' },
    ],
    inviter_name: 'Anna Admin',
};

describe('JoinFlow', () => {
    const onComplete = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows the company name from invite data', async () => {
        mockFetchInvite.mockResolvedValue(mockInvite);
        render(<JoinFlow token="tok-001" onComplete={onComplete} />);
        await waitFor(() => {
            expect(screen.getByText(/ACME GmbH/i)).toBeInTheDocument();
        });
    });

    it('shows assigned departments', async () => {
        mockFetchInvite.mockResolvedValue(mockInvite);
        render(<JoinFlow token="tok-001" onComplete={onComplete} />);
        await waitFor(() => {
            expect(screen.getByText(/Engineering/i)).toBeInTheDocument();
            expect(screen.getByText(/Design/i)).toBeInTheDocument();
        });
    });

    it('shows an error when the token is invalid', async () => {
        mockFetchInvite.mockResolvedValue(null);
        render(<JoinFlow token="bad-tok" onComplete={onComplete} />);
        await waitFor(() => {
            expect(screen.getByText(/ungültig/i)).toBeInTheDocument();
        });
    });

    it('calls acceptInvite with credentials on form submit', async () => {
        mockFetchInvite.mockResolvedValue(mockInvite);
        mockAcceptInvite.mockResolvedValue({ user_id: 'u-new' });
        render(<JoinFlow token="tok-001" onComplete={onComplete} />);
        await screen.findByText(/ACME GmbH/i);

        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Max Neu' } });
        fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'sicher123' } });
        fireEvent.click(screen.getByRole('button', { name: /beitreten/i }));

        await waitFor(() => {
            expect(mockAcceptInvite).toHaveBeenCalledWith('tok-001', {
                display_name: 'Max Neu',
                password: 'sicher123',
            });
        });
    });

    it('calls onComplete after successful join', async () => {
        mockFetchInvite.mockResolvedValue(mockInvite);
        mockAcceptInvite.mockResolvedValue({ user_id: 'u-new' });
        render(<JoinFlow token="tok-001" onComplete={onComplete} />);
        await screen.findByText(/ACME GmbH/i);

        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Max Neu' } });
        fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: 'sicher123' } });
        fireEvent.click(screen.getByRole('button', { name: /beitreten/i }));

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledTimes(1);
        });
    });
});
