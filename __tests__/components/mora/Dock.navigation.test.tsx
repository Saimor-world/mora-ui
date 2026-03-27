import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dock } from '@/components/mora/Dock';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';

jest.mock('@/lib/store/moraState', () => ({
    useMoraStore: jest.fn(),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: jest.fn(),
}));

jest.mock('@/lib/surface/surfaceRegistry', () => ({
    getCoreDockItems: () => [
        { action: 'home', label: 'Home', description: 'Go home', shortcutSuffix: 'H' },
        { action: 'chat', label: 'Chat', description: 'Open chat', shortcutSuffix: 'M' },
    ],
}));

jest.mock('@/lib/hooks/usePlatformModifier', () => ({
    usePlatformModifier: () => 'Ctrl',
}));

jest.mock('@/components/mora/SearchPopup', () => ({
    SearchPopup: () => null,
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
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

const mockUseMoraStore = useMoraStore as jest.MockedFunction<typeof useMoraStore>;
const mockUsePaneStore = usePaneStore as jest.MockedFunction<typeof usePaneStore>;

function renderWithState(state: Record<string, unknown>) {
    mockUseMoraStore.mockImplementation((selector?: any) => (selector ? selector(state) : state));
    const paneState = {
        openPane: jest.fn(),
        panes: [],
        restorePane: jest.fn(),
    };
    mockUsePaneStore.mockImplementation((selector?: any) => (selector ? selector(paneState) : paneState));
    return render(<Dock />);
}

describe('Dock core navigation contract', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Home icon uses navigateToCore instead of partial manual reset', () => {
        const navigateToCore = jest.fn();

        renderWithState({
            navigateToCore,
            orbState: 'idle',
            user: { role: 'member', name: 'User' },
            companies: [],
            activeCompanyId: 'co-1',
            setActiveCompany: jest.fn(),
            viewMode: 'workspace',
            isStandardMode: false,
            setIsSearchOpen: jest.fn(),
        });

        fireEvent.click(screen.getByRole('button', { name: 'Home' }));

        expect(navigateToCore).toHaveBeenCalledTimes(1);
    });
});
