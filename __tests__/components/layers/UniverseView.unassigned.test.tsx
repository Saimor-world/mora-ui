import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import UniverseView from '@/components/home/UniverseView';
import * as coreClient from '@/lib/api/coreClient';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { queryKeys } from '@/lib/queries/queryKeys';
import { UNASSIGNED_DEPARTMENT_ID } from '@/lib/constants/tree';

jest.mock('@/lib/api/coreClient', () => ({
    ...jest.requireActual('@/lib/api/coreClient'),
    fetchUserMemberships: jest.fn(),
    fetchDepartmentStats: jest.fn(),
}));

jest.mock('@/lib/api/nightwatchClient', () => ({
    fetchNightwatchIncidents: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/hooks/useCommunicationLiveData', () => ({
    useCommunicationLiveData: () => ({ mailPreview: [], calendarPreview: [], feedPreview: [] }),
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const pass = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, ...rest }: any, ref: any) =>
            React.createElement(tag, { ref, ...rest }, children));
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

const departments = [{ id: 'dept-product', name: 'Product', visibility: 'public' }];

/**
 * Am 21.08.2026 verwarf get_company_tree Spaces ohne department_id
 * stillschweigend - bei der echten Saimoer-HQ-Firma 2 von 8 Spaces mit
 * 2 Ordnern und 7 echten Dokumenten aus dem Onboarding. CORE liefert sie
 * jetzt als eigenen Baumeintrag; dieser Test haelt fest, dass Universe daraus
 * tatsaechlich einen sichtbaren Bereich macht - nicht nur, dass die
 * Zuordnungsfunktion es tut.
 */
describe('UniverseView: Bereiche ohne Abteilung', () => {
    beforeEach(() => {
        resetAllStores();
        jest.clearAllMocks();
        mockFetchDepartmentStats.mockResolvedValue([]);
        mockFetchUserMemberships.mockResolvedValue({
            department_memberships: [],
            personal_space_id: 'space-test',
            has_department_assignments: true,
        });

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
            user: { id: 'u-1', name: 'Max', email: 'max@firma.de', role: 'owner' },
        } as any);
    });

    function renderView(tree: any[]) {
        const queryClient = createTestQueryClient();
        queryClient.setQueryData(queryKeys.departments('company-1'), departments);
        queryClient.setQueryData(queryKeys.tree('company-1'), tree);
        queryClient.setQueryData(queryKeys.companies(), [{ id: 'company-1', name: 'Saimôr HQ' }]);
        return renderWithProviders(<UniverseView />, { queryClient });
    }

    it('zeigt einen Sammel-Bereich, wenn der Baum nicht zugeordnete Spaces meldet', async () => {
        renderView([
            { id: 'dept-product', type: 'department', name: 'Product', children: [] },
            {
                id: UNASSIGNED_DEPARTMENT_ID,
                type: 'department',
                name: 'Nicht zugeordnet',
                children: [
                    { id: 'space-my', type: 'space', name: 'My Space', children: [
                        { id: 'folder-notes', type: 'folder', name: 'Notes', children: [
                            { id: 'node-1', type: 'node', nodeType: 'document', name: 'Onboarding Checklist.pdf', children: [] },
                        ] },
                    ] },
                ],
            },
        ]);

        await waitFor(() => {
            expect(screen.getByTestId(`territory-${UNASSIGNED_DEPARTMENT_ID}`)).toBeInTheDocument();
        });
        expect(screen.getAllByText('Nicht zugeordnet').length).toBeGreaterThan(0);
    });

    it('zeigt keinen Sammel-Bereich, wenn alles zugeordnet ist', async () => {
        renderView([
            { id: 'dept-product', type: 'department', name: 'Product', children: [] },
        ]);

        await waitFor(() => {
            expect(screen.getByTestId('territory-dept-product')).toBeInTheDocument();
        });
        expect(screen.queryByTestId(`territory-${UNASSIGNED_DEPARTMENT_ID}`)).not.toBeInTheDocument();
    });
});
