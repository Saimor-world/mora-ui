/**
 * CoreLayer.test.tsx
 *
 * CoreLayer surface router:
 * coreMode='home'    → renders HomeSurface only (UniverseView duplicate removed,
 *                       MoraLivingBackground provides cosmic depth behind Home)
 * coreMode='explore' → renders UniverseView only (no HomeSurface)
 * coreMode changes   → surface switches accordingly
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavStore } from '@/lib/store/navStore';
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

// next/dynamic → resolve loader sync via require path used in CoreLayer
jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@/components/home/UniverseView');
        return mod.default || mod;
    },
}));

// ── framer-motion: disable animations in tests ───────────────────────────────
jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: any) => {
            const motionProps = new Set(['animate', 'exit', 'initial', 'transition']);
            const domProps = Object.fromEntries(
                Object.entries(props).filter(([key]) => !motionProps.has(key))
            );
            return <div {...domProps}>{children}</div>;
        },
    },
    useReducedMotion: () => false,
}));

// ── Store helpers ────────────────────────────────────────────────────────────
const setCoreMode = (mode: 'home' | 'explore') => {
    useNavStore.setState({ coreMode: mode });
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CoreLayer', () => {
    beforeEach(() => {
        // Reset to default state before each test
        useNavStore.setState({
            coreMode: 'home',
            viewLevel: 'core',
            activeMode: 'real_hq',
        } as any);
    });

    it('renders HomeSurface when coreMode is home (no UniverseView duplicate)', () => {
        setCoreMode('home');
        render(<CoreLayer />);

        expect(screen.getByTestId('home-surface')).toBeInTheDocument();
        expect(screen.queryByTestId('universe-view')).not.toBeInTheDocument();
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
        expect(screen.queryByTestId('universe-view')).not.toBeInTheDocument();
    });
});
