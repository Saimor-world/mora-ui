import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dock } from '@/components/mora/Dock';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOrbStore } from '@/lib/store/orbStore';
import { queryKeys } from '@/lib/queries/queryKeys';

// moraState is legacy/deprecated — keep its mock since it's being migrated
jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn((selector?: any) => {
        const state = { departments: [], spacesByDepartment: {}, foldersBySpace: {} };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

const STABLE_PANE = { id: 'pane-test', type: 'search', title: 'Test', size: { width: 960, height: 720 }, position: { x: 0, y: 0 }, zIndex: 1, data: {} };
jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (sel?: (s: any) => unknown) => {
        const s = { panes: [STABLE_PANE], activePaneId: 'pane-test', openPane: jest.fn(), removePane: jest.fn(), updatePanePosition: jest.fn(), updatePaneSize: jest.fn(), minimizePane: jest.fn(), focusPane: jest.fn(), getPane: () => STABLE_PANE, restorePane: jest.fn() };
        return sel ? sel(s) : s;
    }
}));

jest.mock('@/lib/surface/surfaceRegistry', () => ({
    getCoreDockItems: () => [
        { action: 'home', label: 'Home', description: 'Go home', shortcutSuffix: 'H' },
        { action: 'chat', label: 'Chat', description: 'Open chat', shortcutSuffix: 'M' },
        { action: 'map', label: 'Karte', description: 'Open map', shortcutSuffix: null },
    ],
}));

jest.mock('@/lib/hooks/usePlatformModifier', () => ({
    usePlatformModifier: () => 'Ctrl',
}));

jest.mock('@/components/mora/SearchPopup', () => ({
    SearchPopup: () => null,
}));

jest.mock('@/lib/audio/ambientAudio', () => ({
    AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT: 'saimor-ambient-audio-library-updated',
    listAmbientAudioTracks: jest.fn(() => new Promise(() => {})),
    persistAmbientAudioSettings: jest.fn(),
    resolveAmbientAudioSettings: () => ({
        enabled: false,
        volume: 0.14,
        trackId: null,
    }),
}));

jest.mock('@/lib/hooks/useAssistantRuntime', () => ({
    useAssistantRuntime: () => ({
        status: 'offline',
        source: 'unknown',
        provider: null,
        model: null,
        routingProfile: null,
        healthyProviderCount: 0,
        configuredProviderCount: 0,
        title: 'Kein AI-Pfad',
        subtitle: 'Keine gesunden Provider',
        badge: 'Offline',
    }),
}));

jest.mock('@/components/os/NotificationCenter', () => ({
    NotificationCenter: () => null,
}));

jest.mock('@/components/os/AdminModeSwitcher', () => ({
    AdminModeSwitcher: () => null,
}));

jest.mock('@/components/mora/PlasmaOrb', () => ({
    PlasmaOrb: () => null,
}));

jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, layoutId, ...props }: any, ref: React.Ref<any>) =>
            React.createElement(tag, { ref, ...props }, children)
        );

    return {
        motion: {
            div: passthrough('div'),
            button: passthrough('button'),
            span: passthrough('span'),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

beforeEach(resetAllStores);

describe('Dock core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home icon uses navigateToCore instead of partial manual reset', () => {
        const navigateToCore = jest.fn();

        useNavStore.setState({
            navigateToCore,
            activeCompanyId: 'co-1',
            setActiveCompany: jest.fn(),
            viewMode: 'workspace',
            isStandardMode: false,
            setIsSearchOpen: jest.fn(),
        } as any);

        useSessionStore.setState({
            user: { role: 'member', name: 'User' },
            permissions: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
            hasBooted: true,
            isLoggingOut: false,
            resetStore: jest.fn(),
            setIsLoggingOut: jest.fn(),
            updateUserSettings: jest.fn(),
        } as any);

        useOrbStore.setState({
            orbState: 'idle',
            setOrbState: jest.fn(),
        } as any);

        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.companies(), []);
        qc.setQueryData(queryKeys.departments('co-1'), []);

        renderWithProviders(<Dock />, { queryClient: qc });

        fireEvent.click(screen.getByRole('button', { name: 'Home' }));

        expect(navigateToCore).toHaveBeenCalledTimes(1);
    });

    it('Karte icon uses navigateToExplore instead of opening a competing pane', () => {
        const navigateToExplore = jest.fn();

        useNavStore.setState({
            navigateToExplore,
            activeCompanyId: 'co-1',
            setActiveCompany: jest.fn(),
            viewMode: 'workspace',
            isStandardMode: false,
            setIsSearchOpen: jest.fn(),
        } as any);

        useSessionStore.setState({
            user: { role: 'member', name: 'User' },
            permissions: { canCreate: false, canDelete: false, canAdmin: false, canEditSettings: false, canViewAnalytics: false },
            hasBooted: true,
            isLoggingOut: false,
            resetStore: jest.fn(),
            setIsLoggingOut: jest.fn(),
            updateUserSettings: jest.fn(),
        } as any);

        useOrbStore.setState({
            orbState: 'idle',
            setOrbState: jest.fn(),
        } as any);

        const qc = createTestQueryClient();
        qc.setQueryData(queryKeys.companies(), []);
        qc.setQueryData(queryKeys.departments('co-1'), []);

        renderWithProviders(<Dock />, { queryClient: qc });

        fireEvent.click(screen.getByRole('button', { name: 'Karte' }));

        expect(navigateToExplore).toHaveBeenCalledTimes(1);
    });
});
