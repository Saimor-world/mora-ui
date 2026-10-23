import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';
import type { IncidentStatusPanel } from '@/lib/panel/types';

const mockNavigateToSpace = jest.fn();
const mockSetActiveSpace = jest.fn();
const mockOpenPane = jest.fn();
const mockInvalidateQueries = jest.fn();

const incidentPanel = (overrides: Partial<IncidentStatusPanel> = {}): IncidentStatusPanel => ({
    id: 'incident-status-incident-1',
    type: 'incident_status',
    state: 'verified',
    source: 'nightwatch',
    source_type: 'nightwatch.incident',
    timestamp: '2026-06-08T08:00:00Z',
    confidence: 'verified',
    reason: 'Open tenant-scoped Nightwatch incident node exists in CORE.',
    evidence: [
        {
            source: 'nightwatch',
            source_type: 'nightwatch.incident',
            status: 'verified',
            confidence: 'verified',
            reason: 'CORE returned this incident through the tenant-scoped Nightwatch incidents endpoint.',
            timestamp: '2026-06-08T08:00:00Z',
        },
    ],
    payload: {
        incident_id: 'incident-1',
        title: 'Operations incident',
        summary: 'HTTP 502',
        severity: 'critical',
        status: 'open',
        host: 'api.saimor.world',
    },
    ...overrides,
});

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: () => ({
        activeDepartmentId: 'dept-1',
        activeCompanyId: 'company-1',
        navigateToExplore: jest.fn(),
        navigateToSpace: mockNavigateToSpace,
        navigateToFolder: jest.fn(),
        setActiveSpace: mockSetActiveSpace,
    }),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: () => ({
        openPane: mockOpenPane,
    }),
}));

jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: () => ({
        data: [{ id: 'dept-1', name: 'HR & Culture', company_id: 'company-1', color: '#10b981' }],
    }),
}));

jest.mock('@/lib/queries/useSpaces', () => ({
    useSpaces: () => ({
        data: [
            {
                id: 'space-1',
                name: 'General',
                description: 'General area',
                folder_count: 1,
                color: '#22D3EE',
            },
        ],
        isLoading: false,
    }),
}));

jest.mock('@/lib/queries/useFolders', () => ({
    useFolders: () => ({ data: [] }),
}));

jest.mock('@/lib/queries/useTree', () => ({
    useTree: () => ({ data: [] }),
}));

jest.mock('@/lib/api/coreClient', () => ({
    fetchSingleDepartmentStats: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/api/orgClient', () => ({
    createSpace: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
    useMutation: () => ({ mutate: jest.fn() }),
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@/components/ui/LoadingState', () => ({
    LoadingState: () => <div data-testid="loading-state" />,
}));

jest.mock('@/components/layers/LayerInsightRail', () => ({
    LayerInsightRail: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/mora/Star', () => ({
    Star: ({ space }: any) => <div>{space?.name}</div>,
}));

jest.mock('@/components/mora/Folder', () => ({
    Folder: () => <div>Folder</div>,
}));

jest.mock('@/lib/utils/deptStyle', () => ({
    getDeptStyle: () => ({ glow: '#10b981' }),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any, ref: React.Ref<any>) =>
            React.createElement(tag, { ref, ...props }, children)
        );

    const motion = new Proxy({}, {
        get: (_target, prop) => {
            if (typeof prop === 'string') {
                return passthrough(prop);
            }
            return undefined;
        }
    });

    return {
        motion,
        useReducedMotion: () => false,
    };
});

describe('DepartmentLayer space-label navigation', () => {
    beforeEach(() => {
        mockNavigateToSpace.mockReset();
        mockSetActiveSpace.mockReset();
        mockOpenPane.mockReset();
        mockInvalidateQueries.mockReset();
    });

    it('opens the selected space when clicking the visible space label', () => {
        render(<DepartmentLayer />);

        const labelButton = screen.getByTestId('space-label-space-1');
        fireEvent.click(labelButton);

        expect(mockSetActiveSpace).toHaveBeenCalledWith('space-1');
        expect(mockNavigateToSpace).toHaveBeenCalledWith('space-1');
        // Space label click now also opens the finder pane for the selected space
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'finder-main', type: 'finder' })
        );
    });

    it('renders evidence-bound incident panels in the department context', () => {
        render(<DepartmentLayer incidentPanels={[incidentPanel()]} />);

        expect(screen.getByTestId('department-incident-context')).toBeTruthy();
        expect(screen.getByTestId('incident-status-panel')).toBeTruthy();
        expect(screen.getByText('Operations incident')).toBeTruthy();
    });

    it('does not render evidence-less incident panels as department truth', () => {
        render(<DepartmentLayer incidentPanels={[incidentPanel({ evidence: [] })]} />);

        expect(screen.queryByTestId('incident-status-panel')).toBeNull();
        expect(screen.getByText('Keine belegten Bereichssignale.')).toBeTruthy();
    });

    it('shows an honest unscoped incident note without opening Nightwatch', () => {
        render(<DepartmentLayer hasUnscopedIncidents />);

        expect(screen.queryByTestId('incident-status-panel')).toBeNull();
        expect(screen.getByText('Globale Systemsignale vorhanden, aber keinem Bereich belegbar zugeordnet.')).toBeTruthy();
        expect(mockOpenPane).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'nightwatch' }));
    });
});
