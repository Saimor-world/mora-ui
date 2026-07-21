// __tests__/components/mora/SessionChip.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { resetAllStores } from '../../test-utils';

// ─── Mock Dock's store / hook deps (module level, pre-import) ─────────────────
// SessionChip itself has no store reads (all props-driven), but importing Dock.tsx
// evaluates Dock's module, which imports store hooks. We stub those here following
// the ActionTray.test.tsx pattern to keep the import clean.

const mockOpenPane = jest.fn();

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector: (s: any) => unknown) =>
        selector({
            panes: [STABLE_PANE],
            openPane: mockOpenPane,
            restorePane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            removePane: jest.fn(),
            getPane: jest.fn(),
            activePaneId: 'pane-test',
        }),
}));

jest.mock('@/lib/store/workSessionStore', () => ({
    useWorkSessionStore: (selector: (s: any) => unknown) =>
        selector({ activePlanId: null }),
}));

jest.mock('@/lib/hooks/useMemoryPendingCount', () => ({
    useMemoryPendingCount: () => 0,
}));

jest.mock('@/lib/hooks/usePlatformModifier', () => ({
    usePlatformModifier: () => '⌘',
}));

jest.mock('@/components/os/FocusMode', () => ({
    FocusModeWidget: () => null,
    useFocusModeShortcut: () => {},
}));

jest.mock('@/components/os/ActionTray', () => ({
    ActionTray: () => null,
}));

jest.mock('@/components/os/NotificationCenter', () => ({
    NotificationCenter: () => null,
}));

jest.mock('@/components/mora/PlasmaOrb', () => ({
    PlasmaOrb: () => null,
}));

jest.mock('@/components/mora/SearchPopup', () => ({
    SearchPopup: () => null,
}));

// ─── Import the real SessionChip after mocks are registered ──────────────────
import { SessionChip } from '@/components/mora/Dock';

beforeEach(resetAllStores);

describe('SessionChip', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders "Plan aktiv" label and session-chip testid when given a planId', () => {
        render(
            <SessionChip
                planId="plan-abc"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        expect(screen.getByTestId('session-chip')).toBeInTheDocument();
        expect(screen.getByText('Plan aktiv')).toBeInTheDocument();
    });

    it('calls openPane with correct id, type, and plan_id on click', () => {
        render(
            <SessionChip
                planId="plan-xyz"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        fireEvent.click(screen.getByTestId('session-chip'));
        expect(mockOpenPane).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'work-session-plan-xyz',
                type: 'work-session',
                data: { plan_id: 'plan-xyz' },
            })
        );
    });

    it('passes correct openPane payload when planId changes', () => {
        const { rerender } = render(
            <SessionChip
                planId="plan-1"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        fireEvent.click(screen.getByTestId('session-chip'));
        expect(mockOpenPane).toHaveBeenLastCalledWith(
            expect.objectContaining({ id: 'work-session-plan-1', data: { plan_id: 'plan-1' } })
        );

        rerender(
            <SessionChip
                planId="plan-2"
                openPane={mockOpenPane}
                isStandardMode={false}
            />
        );
        fireEvent.click(screen.getByTestId('session-chip'));
        expect(mockOpenPane).toHaveBeenLastCalledWith(
            expect.objectContaining({ id: 'work-session-plan-2', data: { plan_id: 'plan-2' } })
        );
    });
});
