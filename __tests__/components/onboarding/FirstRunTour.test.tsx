import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the firstRunStore so tour appears immediately (no 9s delay in tests)
jest.mock('@/lib/onboarding/firstRunStore', () => ({
    isFirstRunTourDone: jest.fn(() => false),
    markFirstRunTourDone: jest.fn(),
}));

jest.mock('@/lib/store/navStore', () => {
    const actual = jest.requireActual('@/lib/store/navStore');
    return {
        ...actual,
        useNavStore: (selector: (s: unknown) => unknown) => selector({
            activeMode: 'tenant_hq',
            coreMode: 'home',
        }),
    };
});

import { isFirstRunTourDone, markFirstRunTourDone } from '@/lib/onboarding/firstRunStore';

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    (isFirstRunTourDone as jest.Mock).mockReturnValue(false);
    (markFirstRunTourDone as jest.Mock).mockImplementation(() => {
        localStorage.setItem('saimor_first_run_tour_v1', 'done');
    });
});

afterEach(() => {
    jest.useRealTimers();
});

it('shows first step on mount', async () => {
    render(<FirstRunTour />);
    act(() => { jest.advanceTimersByTime(12000); });
    await waitFor(() => {
        expect(screen.getByText(/Dein Home/i)).toBeInTheDocument();
    });
});

it('advances on next button', async () => {
    render(<FirstRunTour />);
    act(() => { jest.advanceTimersByTime(12000); });
    await waitFor(() => screen.getByText(/Dein Home/i));
    fireEvent.click(screen.getByRole('button', { name: /weiter/i }));
    expect(screen.getByRole('heading', { name: /Mora/i })).toBeInTheDocument();
});

it('persists dismissal to localStorage', async () => {
    render(<FirstRunTour />);
    act(() => { jest.advanceTimersByTime(12000); });
    await waitFor(() => screen.getByText(/Dein Home/i));
    // Two Überspringen targets exist (icon btn + text btn); click the text one
    const skipButtons = screen.getAllByRole('button', { name: /überspringen/i });
    fireEvent.click(skipButtons[0]);
    expect(localStorage.getItem('saimor_first_run_tour_v1')).toBe('done');
});
