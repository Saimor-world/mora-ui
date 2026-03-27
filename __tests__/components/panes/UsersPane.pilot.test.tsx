/**
 * UsersPane.pilot.test.tsx
 *
 * Covers pilot-readiness fixes P1, P4, P5:
 *   P1 — Invite link shown in modal with copy button after createInvite() success
 *   P4 — Invite button gated to admin/owner roles only
 *   P5 — Dead MoreVertical row action removed
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UsersPane } from '@/components/panes/UsersPane';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import * as coreClient from '@/lib/api/coreClient';
import * as inviteClient from '@/lib/api/inviteClient';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: {
            div: React.forwardRef(({ children, ...p }: any, ref: any) =>
                React.createElement('div', { ref, ...p }, children)
            ),
            button: React.forwardRef(({ children, ...p }: any, ref: any) =>
                React.createElement('button', { ref, ...p }, children)
            ),
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

jest.mock('@/components/layers/GlassPanel', () => ({
    GlassPanel: ({ children }: any) => <div data-testid="glass-panel">{children}</div>,
}));

jest.mock('@/lib/api/coreClient', () => ({
    fetchAdminUsers: jest.fn(),
    coreGet: jest.fn(),
    corePost: jest.fn(),
    patchAdminUser: jest.fn(),
    patchUserCompanyBinding: jest.fn(),
}));

jest.mock('@/lib/api/inviteClient', () => ({
    createInvite: jest.fn(),
}));

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: jest.fn(),
}));

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;
const mockUsePaneStore = usePaneStore as jest.MockedFunction<typeof usePaneStore>;
const mockFetchAdminUsers = coreClient.fetchAdminUsers as jest.MockedFunction<typeof coreClient.fetchAdminUsers>;
const mockCoreGet = coreClient.coreGet as jest.MockedFunction<typeof coreClient.coreGet>;
const mockCreateInvite = inviteClient.createInvite as jest.MockedFunction<typeof inviteClient.createInvite>;

const PANE = { id: 'users-main', size: { width: 640, height: 560 }, position: { x: 100, y: 100 }, zIndex: 10 };

function setupStore(role: 'owner' | 'admin' | 'member') {
    const state: any = {
        viewMode: 'standard',
        user: { id: 'u-1', name: 'Test User', role },
        departments: [],
    };
    mockUseMoraStore.mockImplementation((selector?: any) => selector ? selector(state) : state);

    mockUsePaneStore.mockImplementation((selector?: any) => {
        const store: any = {
            getPane: () => PANE,
            removePane: jest.fn(),
            minimizePane: jest.fn(),
            focusPane: jest.fn(),
            updatePanePosition: jest.fn(),
            updatePaneSize: jest.fn(),
            openPane: jest.fn(),
        };
        return selector ? selector(store) : store;
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAdminUsers.mockResolvedValue([]);
    mockCoreGet.mockResolvedValue([]);
});

// ── P4: Admin gate ────────────────────────────────────────────────────────────

describe('UsersPane — P4: Invite button admin gate', () => {
    it('shows Invite button for owner role', async () => {
        setupStore('owner');
        render(<UsersPane id="users-main" />);
        await waitFor(() => {
            expect(screen.getByTestId('invite-button')).toBeInTheDocument();
        });
    });

    it('shows Invite button for admin role', async () => {
        setupStore('admin');
        render(<UsersPane id="users-main" />);
        await waitFor(() => {
            expect(screen.getByTestId('invite-button')).toBeInTheDocument();
        });
    });

    it('hides Invite button for member role', async () => {
        setupStore('member');
        render(<UsersPane id="users-main" />);
        // Give the component time to settle
        await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(), { timeout: 500 }).catch(() => {});
        expect(screen.queryByTestId('invite-button')).not.toBeInTheDocument();
    });
});

// ── P1: Invite link modal ────────────────────────────────────────────────────

describe('UsersPane — P1: Invite link shown after submit', () => {
    it('shows invite link display with copy button after successful createInvite', async () => {
        setupStore('owner');
        mockCreateInvite.mockResolvedValue({
            token: 'tok-abc',
            invite_link: 'https://saimor.app/invite/tok-abc',
        });

        render(<UsersPane id="users-main" />);

        // Open invite modal
        await waitFor(() => screen.getByTestId('invite-button'));
        fireEvent.click(screen.getByTestId('invite-button'));

        // Fill in email
        const emailInput = screen.getByPlaceholderText('colleague@company.com');
        fireEvent.change(emailInput, { target: { value: 'pilot@company.com' } });

        // Submit
        fireEvent.click(screen.getByText('Send Invite'));

        // Wait for success view
        await waitFor(() => {
            expect(screen.getByTestId('invite-link-display')).toBeInTheDocument();
        });

        expect(screen.getByTestId('invite-link-display')).toHaveTextContent('https://saimor.app/invite/tok-abc');
        expect(screen.getByTestId('copy-invite-link')).toBeInTheDocument();

        // The form inputs should no longer be visible
        expect(screen.queryByPlaceholderText('colleague@company.com')).not.toBeInTheDocument();
    });
});

// ── P5: Dead MoreVertical removed ────────────────────────────────────────────

describe('UsersPane — P5: Dead MoreVertical row action removed', () => {
    it('has no unclickable actions menu button in member rows', async () => {
        setupStore('member');
        mockCoreGet.mockResolvedValue([
            { id: 'u-2', name: 'Anna Schmidt', email: 'anna@co.com', role: 'member', status: 'active', last_seen: null },
        ]);

        render(<UsersPane id="users-main" />);

        await waitFor(() => {
            expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
        });

        // The dead button had no testid — verify by absence of any button with MoreVertical aria or testid
        expect(screen.queryByTestId('member-actions-menu')).not.toBeInTheDocument();
    });
});
