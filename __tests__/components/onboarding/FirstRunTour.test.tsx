import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/onboarding/productTourStore', () => ({
    isProductTourDismissed: jest.fn(() => false),
    markProductTourDismissed: jest.fn(),
    migrateProductTourDismissToServer: jest.fn(),
    PRODUCT_TOUR_RESTART_EVENT: 'saimor:product-tour-restart',
    PRODUCT_TOUR_STATE_EVENT: 'saimor:product-tour-state-changed',
}));

jest.mock('@/lib/store/navStore', () => {
    const actual = jest.requireActual('@/lib/store/navStore');
    return {
        ...actual,
        useNavStore: (selector: (s: unknown) => unknown) => selector({
            activeMode: 'real_hq',
            coreMode: 'home',
        }),
    };
});

jest.mock('@/lib/store/sessionStore', () => ({
    useSessionStore: (selector: (s: unknown) => unknown) => selector({ user: { settings: {} } }),
}));

const loadWebsiteEntryContext = jest.fn(() => null);
const isWebsiteEntryPreviewSession = jest.fn(() => false);

jest.mock('@/lib/websiteEntryStorage', () => ({
    loadWebsiteEntryContext: () => loadWebsiteEntryContext(),
    isWebsiteEntryPreviewSession: () => isWebsiteEntryPreviewSession(),
}));

jest.mock('@/lib/userSettings/persistAccountSettings', () => ({
    queueAccountSettingsSync: jest.fn(),
}));

import { isProductTourDismissed, markProductTourDismissed } from '@/lib/onboarding/productTourStore';

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    loadWebsiteEntryContext.mockReturnValue(null as never);
    isWebsiteEntryPreviewSession.mockReturnValue(false as never);
    (isProductTourDismissed as jest.Mock).mockReturnValue(false);
    (markProductTourDismissed as jest.Mock).mockImplementation(() => {
        localStorage.setItem('saimor_product_tour_dismissed', '1');
    });
});

afterEach(() => {
    jest.useRealTimers();
});

it('does not auto-show in regular HQ sessions', async () => {
    render(<FirstRunTour />);
    act(() => { jest.advanceTimersByTime(3800); });
    expect(screen.queryByRole('heading', { name: /Dein Home/i })).not.toBeInTheDocument();
});

it('shows first MÔRA step after explicit restart', async () => {
    render(<FirstRunTour />);
    act(() => {
        window.dispatchEvent(new Event('saimor:product-tour-restart'));
    });
    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Dein Home/i })).toBeInTheDocument();
        expect(screen.getByText(/^MÔRA$/i)).toBeInTheDocument();
    });
});

it('advances on weiter button', async () => {
    render(<FirstRunTour />);
    act(() => {
        window.dispatchEvent(new Event('saimor:product-tour-restart'));
    });
    await waitFor(() => screen.getByRole('heading', { name: /Dein Home/i }));
    fireEvent.click(screen.getByRole('button', { name: /weiter/i }));
    expect(screen.getByRole('heading', { name: /Dein Universe/i })).toBeInTheDocument();
});

it('persists permanent dismissal via nicht mehr anzeigen', async () => {
    render(<FirstRunTour />);
    act(() => {
        window.dispatchEvent(new Event('saimor:product-tour-restart'));
    });
    await waitFor(() => screen.getByRole('heading', { name: /Dein Home/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /nicht mehr anzeigen/i }));
    fireEvent.click(screen.getByRole('button', { name: /ausblenden/i }));
    expect(markProductTourDismissed).toHaveBeenCalled();
});

it('shows faster for website entry demo path', async () => {
    loadWebsiteEntryContext.mockReturnValue({ companyName: 'Acme', title: 'Scan' } as never);

    render(<FirstRunTour />);
    act(() => { jest.advanceTimersByTime(2200); });
    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Dein Home/i })).toBeInTheDocument();
    });
});
