import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DepartmentLayer } from '@/components/layers/DepartmentLayer';

const mockNavigateToSpace = jest.fn();
const mockSetActiveSpace = jest.fn();
const mockOpenPane = jest.fn();
const mockInvalidateQueries = jest.fn();

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

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => <button {...props}>{children}</button>,
    },
    useReducedMotion: () => false,
}));

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
        expect(mockOpenPane).not.toHaveBeenCalled();
    });
});
