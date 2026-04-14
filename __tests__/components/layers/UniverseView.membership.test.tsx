import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UniverseView from '@/components/home/UniverseView';
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

// LockedPlanetTooltip — use real implementation so "Mitgliedschaft" text renders

// Suppress heavy sub-components not under test
jest.mock('@/components/layers/LayerInsightRail', () => ({
    LayerInsightRail: () => null,
}));
jest.mock('@/components/ui/CompanyLogo', () => ({
    CompanyLogo: () => null,
}));

jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
        div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
        circle: (p: any) => <circle {...p} />,
        path: (p: any) => <path {...p} />,
        line: (p: any) => <line {...p} />,
    },
    useReducedMotion: () => false,
}));

// Query hook mocks
jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: jest.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
}));
jest.mock('@/lib/queries/useTree', () => ({
    useTree: jest.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
}));
jest.mock('@/lib/queries/useCompanies', () => ({
    useCompanies: jest.fn().mockReturnValue({ data: [{ id: 'company-1', name: 'Test Corp' }], isLoading: false }),
}));

// Store mocks
jest.mock('@/lib/store/navStore', () => ({
    useNavStore: jest.fn((selector) => {
        const state = {
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
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/store/sessionStore', () => ({
    useSessionStore: jest.fn((selector) => {
        const state = {
            user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'member' },
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn((selector) => {
        const state = {
            orbState: 'idle',
            setOrbState: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/store/contextStore', () => ({
    useContextStore: jest.fn((selector) => {
        const state = { setPersonalSpaceId: jest.fn() };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

jest.mock('@/lib/hooks/useSurfaceProfile', () => ({
    useSurfaceProfile: jest.fn().mockReturnValue({ isPublicDemoSurface: false }),
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

        // Set departments via query hook mock
        const { useDepartments } = require('@/lib/queries/useDepartments');
        (useDepartments as jest.Mock).mockReturnValue({ data: departments, isLoading: false, error: null });
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
        // Click the locked planet once it's stable in the DOM, then verify tooltip renders
        await waitFor(() => {
            const lockedPlanet = screen.getByTestId('locked-planet-dept-fin');
            fireEvent.click(lockedPlanet);
            expect(screen.getByText(/Mitgliedschaft/i)).toBeInTheDocument();
        });
    });

    it('restricts to public/visible departments only when membership API returns null', async () => {
        mockFetchUserMemberships.mockResolvedValue(null);
        render(<UniverseView />);
        await waitFor(() => {
            // public department always renders
            expect(screen.getByTestId('planet-dept-all')).toBeInTheDocument();
            // visible department renders (locked)
            expect(screen.getByTestId('planet-dept-fin')).toBeInTheDocument();
            // private departments do NOT render
            expect(screen.queryByTestId('planet-dept-eng')).not.toBeInTheDocument();
            expect(screen.queryByTestId('planet-dept-hr')).not.toBeInTheDocument();
        });
    });

    it('restricts to public/visible departments when membership request rejects', async () => {
        mockFetchUserMemberships.mockRejectedValue(new Error('membership failed'));
        render(<UniverseView />);
        await waitFor(() => {
            expect(screen.getByTestId('planet-dept-all')).toBeInTheDocument();
            expect(screen.getByTestId('planet-dept-fin')).toBeInTheDocument();
            expect(screen.queryByTestId('planet-dept-eng')).not.toBeInTheDocument();
            expect(screen.queryByTestId('planet-dept-hr')).not.toBeInTheDocument();
        });
    });
});
