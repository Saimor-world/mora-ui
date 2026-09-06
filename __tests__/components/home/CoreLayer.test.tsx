/**
 * CoreLayer.test.tsx
 *
 * CoreLayer surface router:
 * coreMode='home'    → renders HomeSurfaceNext only
 * coreMode='explore' → renders UniverseView only
 * coreMode changes   → surface switches accordingly
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavStore } from '@/lib/store/navStore';
import { CoreLayer } from '@/components/home/CoreLayer';

// Lightweight stubs so the test doesn't pull in heavy canvas/WebGL deps.
jest.mock('@/components/home/HomeSurfaceNext', () => ({
    HomeSurfaceNext: () => <div data-testid="home-surface">HomeSurfaceNext</div>,
}));

jest.mock('@/components/home/UniverseView', () => ({
    __esModule: true,
    default: () => <div data-testid="universe-view">UniverseView</div>,
}));

jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@/components/home/UniverseView');
        return mod.default || mod;
    },
}));

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

const setCoreMode = (mode: 'home' | 'explore' | 'mindfield') => {
    useNavStore.setState({ coreMode: mode });
};

describe('CoreLayer', () => {
    beforeEach(() => {
        useNavStore.setState({
            coreMode: 'home',
            viewLevel: 'core',
            activeMode: 'real_hq',
        } as any);
    });

    it('renders the next Home surface when coreMode is home', () => {
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

    it('keeps the Universe surface mounted when the Gewebe lens is active', () => {
        setCoreMode('mindfield');
        render(<CoreLayer />);

        expect(screen.getByTestId('universe-view')).toBeInTheDocument();
        expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();
    });

    it('removes the Home surface when coreMode changes to explore', () => {
        setCoreMode('home');
        render(<CoreLayer />);

        expect(screen.getByTestId('home-surface')).toBeInTheDocument();

        act(() => {
            setCoreMode('explore');
        });

        expect(screen.getByTestId('universe-view')).toBeInTheDocument();
        expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();
    });

    it('adds the Home surface when coreMode changes to home', () => {
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
