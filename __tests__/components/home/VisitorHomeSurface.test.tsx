import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitorHomeSurface } from '@/components/home/VisitorHomeSurface';
import { useNavStore } from '@/lib/store/navStore';

jest.mock('@/lib/hooks/useWebsiteEntryContext', () => ({
    useWebsiteEntryContext: () => ({
        id: 'audit-123',
        companyName: 'Acme GmbH',
        domain: 'acme.de',
        email: 'lead@acme.de',
        score: 64,
        grade: 'B',
        title: 'Nightwatch',
        rooms: [],
        documents: [],
        tasks: [{ title: 'CSP setzen', priority: 'hoch' }],
    }),
}));

jest.mock('@/lib/queries/useCompanies', () => {
    const companies = [
        { id: 'company-acme', name: 'Acme GmbH', is_demo: false },
        { id: 'company-simple-coffee', name: 'Simple Coffee Group', is_demo: true },
    ];
    return { useCompanies: () => ({ data: companies }) };
});

jest.mock('@/lib/store/paneStore', () => ({
    usePaneStore: () => jest.fn(),
}));

jest.mock('framer-motion', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    const skip = new Set(['animate','exit','initial','transition','variants','whileHover','whileTap','whileInView']);
    const strip = (props: any) => Object.fromEntries(Object.entries(props).filter(([k]) => !skip.has(k)));
    const m = (tag: string) => ({ children, ...p }: any) => React.createElement(tag, strip(p), children);
    return {
        motion: { div: m('div'), span: m('span'), p: m('p'), section: m('section'), button: m('button') },
        AnimatePresence: ({ children }: any) => children,
        useInView: () => true,
        useMotionValue: (v: any) => ({ set: jest.fn(), get: () => v, on: jest.fn() }),
        useSpring: (v: any) => ({ set: jest.fn(), get: () => (typeof v === 'object' ? v?.get?.() ?? 0 : v), on: jest.fn() }),
    };
});

beforeEach(() => {
    jest.clearAllMocks();
    useNavStore.setState({ activeCompanyId: 'company-acme', coreMode: 'home' } as any);
});

it('renders the unified preview home with UV2 design tokens', () => {
    render(<VisitorHomeSurface />);

    expect(screen.getByTestId('visitor-home-surface')).toBeInTheDocument();
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getByText('Score 64')).toBeInTheDocument();
    expect(screen.getByText('CSP setzen')).toBeInTheDocument();
});

it('opens the tenant-scoped Simple Coffee demo', async () => {
    render(<VisitorHomeSurface />);

    const demoButton = screen.getByRole('button', { name: /Simple Coffee Group/i });
    await userEvent.click(demoButton);

    expect(useNavStore.getState().activeCompanyId).toBe('company-simple-coffee');
    expect(useNavStore.getState().coreMode).toBe('explore');
});

it('navigates to Universe explore mode', async () => {
    render(<VisitorHomeSurface />);

    const universeButton = screen.getByRole('button', { name: /Topographie erkunden/i });
    await userEvent.click(universeButton);

    expect(useNavStore.getState().coreMode).toBe('explore');
});
