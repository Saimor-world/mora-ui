import { screen } from '@testing-library/react';
import { renderWithProviders, resetAllStores } from '../../test-utils';
import { CoreLayer } from '@/components/home/CoreLayer';
import { useNavStore } from '@/lib/store/navStore';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, variants, initial, animate, exit, transition, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
}));

jest.mock('@/components/home/HomeSurface', () => ({
    HomeSurface: () => <div data-testid="home-surface">normal home</div>,
}));

jest.mock('@/components/home/UniverseView', () => ({
    __esModule: true,
    default: () => <div data-testid="universe-view">universe</div>,
}));

jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@/components/home/UniverseView');
        return mod.default || mod;
    },
}));

jest.mock('@/components/home/VisitorHomeSurface', () => ({
    VisitorHomeSurface: () => <div data-testid="visitor-home-surface">visitor home</div>,
}));

beforeEach(resetAllStores);

it('renders the dedicated visitor home surface instead of the normal home surface', () => {
    useNavStore.setState({
        coreMode: 'home',
        activeMode: 'visitor',
    } as any);

    renderWithProviders(<CoreLayer />);

    expect(screen.getByTestId('visitor-home-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();
});

it('renders the dedicated visitor home for a private preview account', () => {
    useNavStore.setState({
        coreMode: 'home',
        activeMode: 'private_preview',
    } as any);

    renderWithProviders(<CoreLayer />);

    expect(screen.getByTestId('visitor-home-surface')).toBeInTheDocument();
    expect(screen.queryByTestId('home-surface')).not.toBeInTheDocument();
});
