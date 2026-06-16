import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitorHomeSurface } from '@/components/home/VisitorHomeSurface';
import { submitDossierToWall } from '@/lib/api/wallClient';
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
import { useNavStore } from '@/lib/store/navStore';

jest.mock('@/lib/api/wallClient', () => ({
    submitDossierToWall: jest.fn(),
}));

jest.mock('@/lib/hooks/useCreateDossierNode', () => ({
    useCreateDossierNode: jest.fn(),
}));

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

jest.mock('@/lib/queries/useDossierView', () => ({
    useDossierView: () => ({
        data: {
            company: { name: 'Acme GmbH' },
            audit: {
                domain: 'acme.de',
                score: 64,
                level: 'mittel',
                summary: 'CSP fehlt.',
                logo_url: null,
                expires_at: null,
                findings: [{ title: 'CSP fehlt', severity: 'risk', desc: 'Header nicht gesetzt.' }],
            },
        },
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
    (useCreateDossierNode as jest.Mock).mockReturnValue({ nodeId: 'node-audit-1', isCreating: false });
    (submitDossierToWall as jest.Mock).mockResolvedValue({ success: true, wall_status: 'pending' });
});

it('opens the tenant-scoped Simple Coffee demo without using the public playground', async () => {
    render(<VisitorHomeSurface />);

    await userEvent.click(screen.getByRole('button', { name: /Geführte Simple Coffee Demo öffnen/i }));

    expect(useNavStore.getState().activeCompanyId).toBe('company-simple-coffee');
    expect(useNavStore.getState().coreMode).toBe('explore');
});

it('submits the visitor dossier node to the Wall queue', async () => {
    render(<VisitorHomeSurface />);

    await userEvent.click(screen.getByRole('button', { name: /Signal veröffentlichen/i }));

    expect(submitDossierToWall).toHaveBeenCalledWith(expect.objectContaining({
        node_id: 'node-audit-1',
        visibility: 'domain-only',
    }));
    await waitFor(() => {
        expect(screen.getByText(/Wall-Signal ist vorgemerkt/i)).toBeInTheDocument();
    });
});
