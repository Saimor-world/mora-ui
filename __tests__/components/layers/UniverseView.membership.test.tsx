import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import UniverseView from '@/components/home/UniverseView';
import * as coreClient from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// ─── HTTP boundary ────────────────────────────────────────────────────────────
// Only the API layer is mocked — it's a network call, not business logic.
jest.mock('@/lib/api/coreClient', () => ({
    ...jest.requireActual('@/lib/api/coreClient'),
    fetchUserMemberships: jest.fn(),
    fetchDepartmentStats: jest.fn(),
}));

// ─── Heavy UI sub-components not under test ───────────────────────────────────
// Planet: replaced with a minimal testid stub so membership tests can assert
// which departments are visible / locked without rendering the full 3D planet.
jest.mock('@/components/mora/Planet', () => ({
    Planet: ({ department }: any) => (
        <div data-testid={`planet-${department.id}`}>{department.name}</div>
    ),
}));

jest.mock('@/components/layers/LayerInsightRail', () => ({
    LayerInsightRail: () => null,
}));

jest.mock('@/components/ui/CompanyLogo', () => ({
    CompanyLogo: () => null,
}));

// framer-motion: animations don't run in jsdom; passthrough keeps DOM structure intact.
jest.mock('framer-motion', () => {
    const React = require('react');
    const pass = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, ...rest }: any, ref: any) =>
            React.createElement(tag, { ref, ...rest }, children)
        );
    return {
        motion: { div: pass('div'), circle: pass('circle'), path: pass('path'), line: pass('line') },
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

// ─── Typed API mock handles ───────────────────────────────────────────────────
const mockFetchUserMemberships = coreClient.fetchUserMemberships as jest.MockedFunction<
    typeof coreClient.fetchUserMemberships
>;
const mockFetchDepartmentStats = coreClient.fetchDepartmentStats as jest.MockedFunction<
    typeof coreClient.fetchDepartmentStats
>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const departments = [
    { id: 'dept-eng', name: 'Engineering', visibility: 'private' },
    { id: 'dept-all', name: 'Allgemein',   visibility: 'public'  },
    { id: 'dept-fin', name: 'Finance',     visibility: 'visible', description: 'Finanzabteilung' },
    { id: 'dept-hr',  name: 'HR',          visibility: 'private' },
];

const memberships = [
    { department_id: 'dept-eng', department_name: 'Engineering' },
];

// ─── Per-test setup ───────────────────────────────────────────────────────────
beforeEach(resetAllStores);

describe('UniverseView membership-scoped rendering', () => {
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
            isStandardMode: false,
            nameConflict: null,
            setCoreMode: jest.fn(),
            navigateToCore: jest.fn(),
            navigateToDepartment: jest.fn(),
            navigateToSpace: jest.fn(),
            navigateToFolder: jest.fn(),
            navigateToExplore: jest.fn(),
            navigateToAmbient: jest.fn(),
        } as any);

        useSessionStore.setState({
            user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'member' },
        } as any);

        useOrbStore.setState({
            orbState: 'idle',
            setOrbState: jest.fn(),
        } as any);
    });

    function renderView() {
        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.departments('company-1'), departments);
        qc.setQueryData(queryKeys.tree('company-1'), []);
        qc.setQueryData(queryKeys.companies(), [{ id: 'company-1', name: 'Test Corp' }]);
        return renderWithProviders(<UniverseView />, { queryClient: qc });
    }

    it('shows member and public departments normally', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        renderView();
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
        renderView();
        await waitFor(() => {
            // dept-hr is private and not in memberships → must not appear
            expect(screen.queryByTestId('planet-dept-hr')).not.toBeInTheDocument();
        });
    });

    it('renders Visible departments as locked for non-members', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        renderView();
        // Both checks inside waitFor: locked wrapper only appears after membershipsLoaded=true
        await waitFor(() => {
            expect(screen.getByTestId('planet-dept-fin')).toBeInTheDocument();
            expect(screen.getByTestId('locked-planet-dept-fin')).toBeInTheDocument();
        });
    });

    it('shows LockedPlanetTooltip when clicking a Visible locked planet', async () => {
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: memberships,
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });
        renderView();
        await waitFor(() => {
            const lockedPlanet = screen.getByTestId('locked-planet-dept-fin');
            fireEvent.click(lockedPlanet);
            expect(screen.getByText(/Mitgliedschaft/i)).toBeInTheDocument();
        });
    });

    it('restricts to public/visible departments only when membership API returns null', async () => {
        mockFetchUserMemberships.mockResolvedValue(null);
        renderView();
        await waitFor(() => {
            expect(screen.getByTestId('planet-dept-all')).toBeInTheDocument();  // public → always shows
            expect(screen.getByTestId('planet-dept-fin')).toBeInTheDocument();  // visible → shows locked
            expect(screen.queryByTestId('planet-dept-eng')).not.toBeInTheDocument(); // private → hidden
            expect(screen.queryByTestId('planet-dept-hr')).not.toBeInTheDocument();  // private → hidden
        });
    });

    it('restricts to public/visible departments when membership request rejects', async () => {
        mockFetchUserMemberships.mockRejectedValue(new Error('membership failed'));
        renderView();
        await waitFor(() => {
            expect(screen.getByTestId('planet-dept-all')).toBeInTheDocument();
            expect(screen.getByTestId('planet-dept-fin')).toBeInTheDocument();
            expect(screen.queryByTestId('planet-dept-eng')).not.toBeInTheDocument();
            expect(screen.queryByTestId('planet-dept-hr')).not.toBeInTheDocument();
        });
    });

    it('does not loop when query data is still unavailable', async () => {
        mockFetchUserMemberships.mockResolvedValue(null);
        const qc = createTestQueryClient();

        expect(() => {
            renderWithProviders(<UniverseView />, { queryClient: qc });
        }).not.toThrow();

        await waitFor(() => {
            expect(mockFetchUserMemberships).toHaveBeenCalled();
        });
    });
});
