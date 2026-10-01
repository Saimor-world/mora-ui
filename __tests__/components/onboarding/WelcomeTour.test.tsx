import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WelcomeTour } from '@/components/onboarding/WelcomeTour';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/onboarding/welcomeTourStore', () => ({
    isWelcomeTourDismissed: jest.fn(() => false),
    markWelcomeTourDismissed: jest.fn(),
    migrateWelcomeTourDismissToServer: jest.fn(),
    WELCOME_TOUR_RESTART_EVENT: 'saimor:welcome-tour-restart',
    WELCOME_TOUR_STATE_EVENT: 'saimor:welcome-tour-state-changed',
}));

jest.mock('@/lib/store/navStore', () => {
    const actual = jest.requireActual('@/lib/store/navStore');
    return {
        ...actual,
        useNavStore: (selector: (s: unknown) => unknown) => selector({
            coreMode: 'home',
        }),
    };
});

jest.mock('@/lib/store/sessionStore', () => ({
    useSessionStore: (selector: (s: unknown) => unknown) => selector({ user: { settings: {} } }),
}));

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: (selector: (s: unknown) => unknown) => selector({
        openPane: jest.fn(),
    }),
}));

jest.mock('@/lib/userSettings/persistAccountSettings', () => ({
    queueAccountSettingsSync: jest.fn(),
}));

import { isWelcomeTourDismissed, markWelcomeTourDismissed } from '@/lib/onboarding/welcomeTourStore';

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    (isWelcomeTourDismissed as jest.Mock).mockReturnValue(false);
    (markWelcomeTourDismissed as jest.Mock).mockImplementation(() => {
        localStorage.setItem('saimor_welcome_tour_v1', 'done');
    });
});

afterEach(() => {
    jest.useRealTimers();
});

it('shows first welcome step after delay', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => {
        expect(screen.getByText(/Willkommen bei Môra|Welcome to Môra/i)).toBeInTheDocument();
    });
});

it('shows step indicator with correct step count', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => {
        expect(screen.getByText(/Schritt 1 von 3|Step 1 of 3/i)).toBeInTheDocument();
    });
});

it('advances on Weiter button click', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => screen.getByText(/Willkommen bei Môra|Welcome to Môra/i));
    fireEvent.click(screen.getByRole('button', { name: /weiter|next/i }));
    expect(screen.getByRole('heading', { name: /Dein Tag|Your Day/i })).toBeInTheDocument();
});

it('advances through all steps and shows integration offer', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => screen.getByText(/Willkommen bei Môra|Welcome to Môra/i));
    
    fireEvent.click(screen.getByRole('button', { name: /weiter|next/i }));
    expect(screen.getByRole('heading', { name: /Dein Tag|Your Day/i })).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /weiter|next/i }));
    expect(screen.getByRole('heading', { name: /Sprich mit mir|Talk to me/i })).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /weiter|continue/i }));
    await waitFor(() => {
        expect(screen.getByText(/Kalender und Mail verbinden|connect your calendar/i)).toBeInTheDocument();
    });
});

it('persists dismissal when skip is clicked', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => screen.getByText(/Willkommen bei Môra|Welcome to Môra/i));
    const skipButtons = screen.getAllByRole('button', { name: /überspringen|skip/i });
    fireEvent.click(skipButtons[0]);
    expect(markWelcomeTourDismissed).toHaveBeenCalled();
});

it('closes on Escape key', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => screen.getByText(/Willkommen bei Môra|Welcome to Môra/i));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(markWelcomeTourDismissed).toHaveBeenCalled();
});

it('advances with ArrowRight key', async () => {
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => screen.getByText(/Willkommen bei Môra|Welcome to Môra/i));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: /Dein Tag|Your Day/i })).toBeInTheDocument();
});

it('shows restart event re-opens tour', async () => {
    render(<WelcomeTour />);
    act(() => {
        window.dispatchEvent(new Event('saimor:welcome-tour-restart'));
    });
    await waitFor(() => {
        expect(screen.getByText(/Willkommen bei Môra|Welcome to Môra/i)).toBeInTheDocument();
    });
});

it('does not show when already dismissed', async () => {
    (isWelcomeTourDismissed as jest.Mock).mockReturnValue(true);
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    expect(screen.queryByText(/Willkommen bei Môra|Welcome to Môra/i)).not.toBeInTheDocument();
});

it('uses separate localStorage key from onboarding_complete', async () => {
    localStorage.setItem('onboarding_complete', 'true');
    (isWelcomeTourDismissed as jest.Mock).mockReturnValue(false);
    render(<WelcomeTour />);
    act(() => { jest.advanceTimersByTime(2800); });
    await waitFor(() => {
        expect(screen.getByText(/Willkommen bei Môra|Welcome to Môra/i)).toBeInTheDocument();
    });
});
