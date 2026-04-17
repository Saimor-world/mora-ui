/**
 * ActionTray — Mycelium explainability V3
 *
 * Verifies that formatActionMessage prefixes intake events
 * with "Gelernt: " when route_mode is learned_route.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActionTray } from '@/components/os/ActionTray';
import { renderWithProviders, resetAllStores } from '../../test-utils';

const openPane = jest.fn();

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector: (state: { openPane: typeof openPane }) => unknown) =>
        selector({ openPane }),
}));

jest.mock('@/lib/hooks/useActionEvents', () => ({
    useActionEvents: jest.fn(),
}));

const { useActionEvents } = jest.requireMock('@/lib/hooks/useActionEvents') as {
    useActionEvents: jest.Mock;
};

// ── fixtures ──────────────────────────────────────────────────────────────────

function makeIntakeEvent(routeMode: string, message = 'Finance > Reports') {
    return {
        action_id: 'act-tray-1',
        status: 'done' as const,
        intent: 'create_node_from_file',
        actor_id: 'system',
        actor_role: 'system',
        session_id: 'sess-tray-1',
        timestamp: '2026-03-16T10:00:00.000Z',
        message,
        error: null,
        payload: {
            tool_name: 'create_node_from_file',
            route_suggestion: { route_mode: routeMode },
        },
    };
}

function makeFolderEvent() {
    return {
        action_id: 'act-tray-2',
        status: 'done' as const,
        intent: 'create_folder',
        actor_id: 'user',
        actor_role: 'owner',
        session_id: 'sess-tray-2',
        timestamp: '2026-03-16T10:01:00.000Z',
        message: 'Ordner erstellt',
        error: null,
        payload: { tool_name: 'create_folder', route_suggestion: { route_mode: 'learned_route' } },
    };
}

beforeEach(resetAllStores);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ActionTray — Gelernt prefix', () => {
    beforeEach(() => jest.clearAllMocks());

    it('prefixes intake message with "Gelernt: " when route_mode is learned_route', () => {
        useActionEvents.mockReturnValue({
            events: [makeIntakeEvent('learned_route', 'Finance > Reports')],
            isLoading: false,
            error: null,
        });
        renderWithProviders(<ActionTray />);
        fireEvent.click(screen.getByTitle('Action tray'));
        expect(screen.getByText('Gelernt: Finance > Reports')).toBeInTheDocument();
    });

    it('does not prefix when route_mode is not learned_route', () => {
        useActionEvents.mockReturnValue({
            events: [makeIntakeEvent('default_route', 'Finance > Reports')],
            isLoading: false,
            error: null,
        });
        renderWithProviders(<ActionTray />);
        fireEvent.click(screen.getByTitle('Action tray'));
        expect(screen.queryByText(/^Gelernt:/)).not.toBeInTheDocument();
        expect(screen.getByText('Finance > Reports')).toBeInTheDocument();
    });

    it('does not prefix non-intake actions even if route_suggestion carries learned_route', () => {
        useActionEvents.mockReturnValue({
            events: [makeFolderEvent()],
            isLoading: false,
            error: null,
        });
        renderWithProviders(<ActionTray />);
        fireEvent.click(screen.getByTitle('Action tray'));
        expect(screen.queryByText(/^Gelernt:/)).not.toBeInTheDocument();
    });
});
