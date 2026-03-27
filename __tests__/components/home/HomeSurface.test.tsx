import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeSurface } from '@/components/home/HomeSurface';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import { useAccountStore } from '@/lib/auth/useAccount';
import * as coreClient from '@/lib/api/coreClient';
import * as sessionLifecycle from '@/lib/auth/sessionLifecycle';

jest.mock('@/lib/api/coreClient', () => ({
    fetchNodesByCompany: jest.fn(),
    fetchMyContent: jest.fn(),
    authLogout: jest.fn(),
    coreGet: jest.fn(),
}));

jest.mock('@/lib/auth/sessionLifecycle', () => ({
    clearClientSessionArtifacts: jest.fn(),
}));

jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
    useReducedMotion: () => false,
}));

const mockFetchNodes = coreClient.fetchNodesByCompany as jest.MockedFunction<typeof coreClient.fetchNodesByCompany>;
const mockFetchMyContent = coreClient.fetchMyContent as jest.MockedFunction<typeof coreClient.fetchMyContent>;
const mockAuthLogout = coreClient.authLogout as jest.MockedFunction<typeof coreClient.authLogout>;
const mockClearArtifacts = sessionLifecycle.clearClientSessionArtifacts as jest.MockedFunction<typeof sessionLifecycle.clearClientSessionArtifacts>;

const openPane = jest.fn();
const accountLogout = jest.fn();
const resetStore = jest.fn();
const setUser = jest.fn();

const setStore = (patch: any) => useMoraStore.setState(patch);

beforeEach(() => {
    jest.clearAllMocks();

    mockFetchNodes.mockResolvedValue([]);
    mockFetchMyContent.mockResolvedValue(null);
    mockAuthLogout.mockResolvedValue({ success: true } as any);

    usePaneStore.setState({ openPane } as any);
    useAccountStore.setState({ logout: accountLogout } as any);

    setStore({
        activeCompanyId: 'co-1',
        coreMode: 'home',
        user: { id: 'u-1', name: 'Anna Mueller', role: 'member' },
        isStandardMode: false,
        resetStore,
        setUser,
    } as any);
});

describe('HomeSurface - rendering', () => {
    it('renders the user greeting', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText(/Guten Tag, Anna/i)).toBeInTheDocument();
        });
    });

    it('renders Arbeitsplatz heading when no user name exists', async () => {
        setStore({ user: null } as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText('Arbeitsplatz')).toBeInTheDocument();
        });
    });

    it('renders a visible logout button on Home', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('home-logout')).toBeInTheDocument();
        });
    });
});

describe('HomeSurface - Recent Docs', () => {
    const nodes = [
        { id: 'n-1', title: 'Jahresbericht', type: 'document', updated_at: '2026-03-26T10:00:00Z' },
        { id: 'n-2', title: 'Projektplan Q2', type: 'document', updated_at: '2026-03-27T08:00:00Z' },
        { id: 'n-3', title: 'Meeting Notes', type: 'document', updated_at: '2026-03-25T15:00:00Z' },
    ];

    it('shows recent document titles', async () => {
        mockFetchNodes.mockResolvedValue(nodes as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText('Projektplan Q2')).toBeInTheDocument();
            expect(screen.getByText('Jahresbericht')).toBeInTheDocument();
        });
    });

    it('shows most recently updated document first', async () => {
        mockFetchNodes.mockResolvedValue(nodes as any);
        render(<HomeSurface />);
        await waitFor(() => {
            const items = screen.getAllByTestId('recent-doc-item');
            expect(items[0]).toHaveTextContent('Projektplan Q2');
        });
    });

    it('calls fetchNodesByCompany with activeCompanyId and limit=8', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(mockFetchNodes).toHaveBeenCalledWith('co-1', { limit: 8 });
        });
    });

    it('shows empty state when no recent documents', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('recent-docs-empty')).toBeInTheDocument();
        });
    });

    it('hides Recent Docs section on API error', async () => {
        mockFetchNodes.mockResolvedValue(null as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.queryByTestId('recent-docs-section')).not.toBeInTheDocument();
        });
    });

    it('still shows Personal Area when Recent Docs request fails', async () => {
        mockFetchNodes.mockRejectedValue(new Error('nodes failed'));
        mockFetchMyContent.mockResolvedValue({
            counts: { folders: 1, nodes: 2, files: 3 },
        } as any);

        render(<HomeSurface />);

        await waitFor(() => {
            expect(screen.queryByTestId('recent-docs-section')).not.toBeInTheDocument();
            expect(screen.getByTestId('personal-area-section')).toBeInTheDocument();
        });
    });

    it('clicking a document opens the document pane', async () => {
        mockFetchNodes.mockResolvedValue(nodes as any);
        render(<HomeSurface />);
        await waitFor(() => screen.getByText('Jahresbericht'));
        fireEvent.click(screen.getByText('Jahresbericht'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'document', data: expect.objectContaining({ nodeId: 'n-1' }) })
        );
    });
});

describe('HomeSurface - Quick Access', () => {
    it('renders all five quick access buttons', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('qa-finder')).toBeInTheDocument();
            expect(screen.getByTestId('qa-meine-dateien')).toBeInTheDocument();
            expect(screen.getByTestId('qa-notes')).toBeInTheDocument();
            expect(screen.getByTestId('qa-mora')).toBeInTheDocument();
            expect(screen.getByTestId('qa-explore')).toBeInTheDocument();
        });
    });

    it('Finder button opens finder pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-finder'));
        fireEvent.click(screen.getByTestId('qa-finder'));
        expect(openPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'finder', id: 'finder-main' }));
    });

    it('Meine Dateien button opens meine-dateien pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-meine-dateien'));
        fireEvent.click(screen.getByTestId('qa-meine-dateien'));
        expect(openPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'meine-dateien' }));
    });

    it('Notizen button opens notes pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-notes'));
        fireEvent.click(screen.getByTestId('qa-notes'));
        expect(openPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'notes', id: 'notes-main' }));
    });

    it('Mora button opens chat pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-mora'));
        fireEvent.click(screen.getByTestId('qa-mora'));
        expect(openPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'chat', id: 'chat-main' }));
    });

    it('Erkunden button switches to explore', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-explore'));
        fireEvent.click(screen.getByTestId('qa-explore'));
        expect(useMoraStore.getState().coreMode).toBe('explore');
    });
});

describe('HomeSurface - Personal Area', () => {
    it('shows counts from fetchMyContent', async () => {
        mockFetchMyContent.mockResolvedValue({
            counts: { folders: 3, nodes: 12, files: 5 },
        } as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('personal-area-section')).toBeInTheDocument();
            expect(screen.getByText(/12 Dokumente/i)).toBeInTheDocument();
        });
    });

    it('hides Personal Area when fetchMyContent returns null', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.queryByTestId('personal-area-section')).not.toBeInTheDocument();
        });
    });

    it('clicking My Content card opens meine-dateien pane', async () => {
        mockFetchMyContent.mockResolvedValue({ counts: { nodes: 5 } } as any);
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('my-content-card'));
        fireEvent.click(screen.getByTestId('my-content-card'));
        expect(openPane).toHaveBeenCalledWith(expect.objectContaining({ type: 'meine-dateien' }));
    });

    it('still shows Recent Docs when My Content request fails', async () => {
        mockFetchNodes.mockResolvedValue([
            { id: 'n-1', title: 'Jahresbericht', type: 'document', updated_at: '2026-03-26T10:00:00Z' },
        ] as any);
        mockFetchMyContent.mockRejectedValue(new Error('content failed'));

        render(<HomeSurface />);

        await waitFor(() => {
            expect(screen.getByTestId('recent-docs-section')).toBeInTheDocument();
            expect(screen.queryByTestId('personal-area-section')).not.toBeInTheDocument();
        });
    });
});

describe('HomeSurface - logout', () => {
    it('calls server logout and clears client state', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('home-logout'));
        fireEvent.click(screen.getByTestId('home-logout'));

        await waitFor(() => {
            expect(mockAuthLogout).toHaveBeenCalled();
            expect(mockClearArtifacts).toHaveBeenCalled();
            expect(accountLogout).toHaveBeenCalled();
            expect(resetStore).toHaveBeenCalled();
            expect(setUser).toHaveBeenCalledWith(null);
        });
    });
});
