import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import UniverseView from '@/components/home/UniverseView';
import * as coreClient from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';

jest.mock('@/lib/api/coreClient', () => ({
    ...jest.requireActual('@/lib/api/coreClient'),
    fetchUserMemberships: jest.fn(),
    fetchDepartmentStats: jest.fn(),
}));

jest.mock('@/lib/api/nightwatchClient', () => ({
    fetchNightwatchIncidents: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/hooks/useCommunicationLiveData', () => ({
    useCommunicationLiveData: () => ({
        mailPreview: [],
        calendarPreview: [],
        feedPreview: [],
    }),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const pass = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, ...rest }: any, ref: any) =>
            React.createElement(tag, { ref, ...rest }, children)
        );
    return {
        motion: { div: pass('div'), span: pass('span') },
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

const mockFetchUserMemberships = coreClient.fetchUserMemberships as jest.MockedFunction<
    typeof coreClient.fetchUserMemberships
>;
const mockFetchDepartmentStats = coreClient.fetchDepartmentStats as jest.MockedFunction<
    typeof coreClient.fetchDepartmentStats
>;

const departments = [
    { id: 'dept-eng', name: 'Engineering', visibility: 'private' },
    { id: 'dept-all', name: 'Allgemein', visibility: 'public' },
    { id: 'dept-fin', name: 'Finance', visibility: 'visible', description: 'Finanzabteilung' },
    { id: 'dept-hr', name: 'HR', visibility: 'private' },
];

const memberships = [
    { department_id: 'dept-eng', department_name: 'Engineering' },
];

beforeEach(resetAllStores);

describe('UniverseView membership-scoped territories', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchDepartmentStats.mockResolvedValue([]);

        useNavStore.setState({
            activeCompanyId: 'company-1',
            activeDepartmentId: null,
            activeSpaceId: null,
            activeFolderId: null,
            viewLevel: 'core',
            coreMode: 'explore',
            viewMode: 'workspace',
            universeScope: 'org',
            universeScopeDeptId: null,
            setCoreMode: jest.fn(),
            navigateToDepartment: jest.fn(),
        } as any);

        useSessionStore.setState({
            user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'member' },
        } as any);
    });

    function renderView() {
        const queryClient = createTestQueryClient();
        queryClient.setQueryData(queryKeys.departments('company-1'), departments);
        queryClient.setQueryData(queryKeys.tree('company-1'), []);
        queryClient.setQueryData(queryKeys.companies(), [{ id: 'company-1', name: 'Test Corp' }]);
        return renderWithProviders(<UniverseView />, { queryClient });
    }

    it('shows member and public departments as open territories', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        renderView();

        await waitFor(() => {
            expect(screen.getByTestId('territory-dept-eng')).toBeInTheDocument();
            expect(screen.getByTestId('territory-dept-all')).toBeInTheDocument();
        });
    });

    it('hides private departments for non-members', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        renderView();

        await waitFor(() => {
            expect(screen.queryByTestId('territory-dept-hr')).not.toBeInTheDocument();
            expect(screen.queryByTestId('locked-territory-dept-hr')).not.toBeInTheDocument();
        });
    });

    it('renders visible departments as locked and non-enterable', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        renderView();

        const lockedTerritory = await screen.findByTestId('locked-territory-dept-fin');
        fireEvent.click(lockedTerritory);

        expect(screen.getByRole('button', { name: /Mitgliedschaft erforderlich/i })).toBeDisabled();
    });

    it('fails closed to public and visible departments when memberships are unavailable', async () => {
        mockFetchUserMemberships.mockResolvedValue(null);
        renderView();

        await waitFor(() => {
            expect(screen.getByTestId('territory-dept-all')).toBeInTheDocument();
            expect(screen.getByTestId('locked-territory-dept-fin')).toBeInTheDocument();
            expect(screen.queryByTestId('territory-dept-eng')).not.toBeInTheDocument();
            expect(screen.queryByTestId('territory-dept-hr')).not.toBeInTheDocument();
        });
    });

    it('also fails closed when the membership request rejects', async () => {
        mockFetchUserMemberships.mockRejectedValue(new Error('membership failed'));
        renderView();

        await waitFor(() => {
            expect(screen.getByTestId('territory-dept-all')).toBeInTheDocument();
            expect(screen.getByTestId('locked-territory-dept-fin')).toBeInTheDocument();
            expect(screen.queryByTestId('territory-dept-eng')).not.toBeInTheDocument();
        });
    });

    it('waits for membership truth before rendering any territory', async () => {
        let resolveMemberships!: (value: any) => void;
        mockFetchUserMemberships.mockImplementation(() => new Promise((resolve) => {
            resolveMemberships = resolve;
        }));
        renderView();

        expect(screen.queryByTestId('territory-dept-all')).not.toBeInTheDocument();

        resolveMemberships({
            department_memberships: memberships,
            personal_space_id: null,
            has_department_assignments: true,
        });

        expect(await screen.findByTestId('territory-dept-all')).toBeInTheDocument();
    });
});