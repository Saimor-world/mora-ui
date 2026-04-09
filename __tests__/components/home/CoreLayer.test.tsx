/**
 * CoreLayer.test.tsx
 *
 * CoreLayer overlay architecture:
 * coreMode='home'    → renders UniverseView (background) + HomeSurface (overlay)
 * coreMode='explore' → renders UniverseView only (no HomeSurface overlay)
 * coreMode changes   → overlay switches accordingly
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useMoraStore } from '@/lib/store/moraState';
import { CoreLayer } from '@/components/home/CoreLayer';

// ── Mock child surfaces ──────────────────────────────────────────────────────
// Lightweight stubs so the test doesn't pull in heavy canvas/WebGL deps.

jest.mock('@/components/home/HomeSurface', () => ({
    HomeSurface: () => <div data-testid="home-surface">HomeSurface</div>,
}));

jest.mock('@/components/home/UniverseView', () => ({
    __esModule: true,
    default: () => <div data-testid="universe-view">UniverseView</div>,
}));

// ── framer-motion: disable animations in tests ───────────────────────────────
jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    useReducedMotion: () => false,
}));

// ── Store helpers ────────────────────────────────────────────────────────────
const setCoreMode = (mode: 'home' | 'explore') => {
    useMoraStore.setState({ coreMode: mode });
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CoreLayer', () => {
    beforeEach(() => {
        // Reset to default state before each test
        useMoraStore.setState({
            coreMode: 'home',
            viewLevel: 'core',
        } as any);
    });

    it('renders HomeSurface overlay + UniverseView background when coreMode is home', () => {
        setCoreMode('home');
        render(<CoreLayer />);

        expect(screen.getByTestId('home-surface')).toBeInTheDocument();
        expect(screen.getByTestId('universe-view')).toBeInTheDocument();
    });

    it('renders only UniverseView when coreMode is explore', () => {
        setCoreMode('explore');
        render(<CoreLayer />);

        expect(screen.getByTestId('universe-view')).toBeInTheDocument();
        expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();
    });

    it('removes HomeSurface overlay when coreMode changes to explore', () => {
        setCoreMode('home');
        render(<CoreLayer />);

        expect(screen.getByTestId('home-surface')).toBeInTheDocument();

        act(() => {
            setCoreMode('explore');
        });

        expect(screen.getByTestId('universe-view')).toBeInTheDocument();
        expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();
    });

    it('adds HomeSurface overlay when coreMode changes to home', () => {
        setCoreMode('explore');
        render(<CoreLayer />);

        expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();

        act(() => {
            setCoreMode('home');
        });

        expect(screen.getByTestId('home-surface')).toBeInTheDocument();
        expect(screen.getByTestId('universe-view')).toBeInTheDocument();
    });
});
