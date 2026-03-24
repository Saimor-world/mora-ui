import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UniverseView from '@/components/home/UniverseView';
import { useMoraStore } from '@/lib/store/moraState';
import * as coreClient from '@/lib/api/coreClient';

jest.mock('@/lib/api/coreClient', () => ({
    ...jest.requireActual('@/lib/api/coreClient'),
    fetchUserMemberships: jest.fn(),
    fetchDepartmentStats: jest.fn(),
}));

// Planet renders the department name
jest.mock('@/components/mora/Planet', () => ({
    Planet: ({ department }: any) => <div data-testid={`planet-${department.id}`}>{department.name}</div>,
}));

const mockFetchUserMemberships = coreClient.fetchUserMemberships as jest.MockedFunction<typeof coreClient.fetchUserMemberships>;
const mockFetchDepartmentStats = coreClient.fetchDepartmentStats as jest.MockedFunction<typeof coreClient.fetchDepartmentStats>;

const departments = [
    { id: 'dept-eng', name: 'Engineering', visibility: 'private' },
    { id: 'dept-all', name: 'Allgemein', visibility: 'public' },
    { id: 'dept-fin', name: 'Finance', visibility: 'visible', description: 'Finanzabteilung' },
    { id: 'dept-hr', name: 'HR', visibility: 'private' },
];

const memberships = [
    { department_id: 'dept-eng', department_name: 'Engineering' },
];

describe('UniverseView membership-scoped rendering', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchDepartmentStats.mockResolvedValue([]);
        useMoraStore.setState({
            departments,
            activeCompanyId: 'company-1',
            user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'member' },
            loadDepartments: jest.fn().mockResolvedValue(undefined),
        } as any);
    });

    it('shows member and public departments normally', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        render(<UniverseView />);
        await waitFor(() => {
            expect(screen.getByTestId('planet-dept-eng')).toBeInTheDocument(); // member
            expect(screen.getByTestId('planet-dept-all')).toBeInTheDocument(); // public
        });
    });

    it('does not render private departments for non-members', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        render(<UniverseView />);
        await waitFor(() => {
            expect(screen.queryByTestId('planet-dept-hr')).not.toBeInTheDocument();
        });
    });

    it('renders Visible departments as locked for non-members', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        render(<UniverseView />);
        await waitFor(() => {
            expect(screen.getByTestId('planet-dept-fin')).toBeInTheDocument();
        });
        expect(screen.getByTestId('locked-planet-dept-fin')).toBeInTheDocument();
    });

    it('shows LockedPlanetTooltip when clicking a Visible locked planet', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        render(<UniverseView />);
        await waitFor(() => {
            expect(screen.getByTestId('locked-planet-dept-fin')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByTestId('locked-planet-dept-fin'));
        expect(screen.getByText(/Mitgliedschaft/i)).toBeInTheDocument();
    });

    it('falls back to showing all departments when membership API returns null', async () => {
        mockFetchUserMemberships.mockResolvedValue(null);
        render(<UniverseView />);
        await waitFor(() => {
            departments.forEach((d) => {
                expect(screen.getByTestId(`planet-${d.id}`)).toBeInTheDocument();
            });
        });
    });
});
