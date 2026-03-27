/**
 * HomeSurface.test.tsx
 *
 * TDD RED → GREEN for Commit B: HomeSurface with real data sections.
 *
 * Sections tested:
 *   1. Recent Docs  — fetchNodesByCompany, sorted by updatedAt, click opens document pane
 *   2. Quick Access — Finder, Meine Dateien, Mora, Erkunden buttons
 *   3. My Content   — fetchMyContent counts, click opens meine-dateien pane
 *   4. Empty states — each section degrades independently (isOptional pattern)
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeSurface } from '@/components/home/HomeSurface';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';
import * as coreClient from '@/lib/api/coreClient';

// ── API mocks ────────────────────────────────────────────────────────────────
jest.mock('@/lib/api/coreClient', () => ({
    fetchNodesByCompany: jest.fn(),
    fetchMyContent: jest.fn(),
    coreGet: jest.fn(),
}));

const mockFetchNodes = coreClient.fetchNodesByCompany as jest.MockedFunction<typeof coreClient.fetchNodesByCompany>;
const mockFetchMyContent = coreClient.fetchMyContent as jest.MockedFunction<typeof coreClient.fetchMyContent>;

// ── framer-motion: disable animations ───────────────────────────────────────
jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
    useReducedMotion: () => false,
}));

// ── Store helpers ────────────────────────────────────────────────────────────
const setStore = (patch: any) => useMoraStore.setState(patch);
const openPane = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    openPane.mockClear();

    // Default: no data
    mockFetchNodes.mockResolvedValue([]);
    mockFetchMyContent.mockResolvedValue(null);

    // Inject openPane spy into paneStore
    usePaneStore.setState({ openPane } as any);

    setStore({
        activeCompanyId: 'co-1',
        coreMode: 'home',
        user: { id: 'u-1', name: 'Anna Müller', role: 'member' },
        isStandardMode: false,
    } as any);
});

// ── 1. Rendering ─────────────────────────────────────────────────────────────

describe('HomeSurface — rendering', () => {
    it('renders the user greeting', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText(/Guten Tag, Anna/i)).toBeInTheDocument();
        });
    });

    it('renders "Arbeitsplatz" heading when no user name', async () => {
        setStore({ user: null } as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByText('Arbeitsplatz')).toBeInTheDocument();
        });
    });
});

// ── 2. Recent Docs ───────────────────────────────────────────────────────────

describe('HomeSurface — Recent Docs', () => {
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
        mockFetchNodes.mockResolvedValue([]);
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

// ── 3. Quick Access ──────────────────────────────────────────────────────────

describe('HomeSurface — Quick Access', () => {
    it('renders all four quick access buttons', async () => {
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('qa-finder')).toBeInTheDocument();
            expect(screen.getByTestId('qa-meine-dateien')).toBeInTheDocument();
            expect(screen.getByTestId('qa-mora')).toBeInTheDocument();
            expect(screen.getByTestId('qa-explore')).toBeInTheDocument();
        });
    });

    it('Finder button opens finder pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-finder'));
        fireEvent.click(screen.getByTestId('qa-finder'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'finder', id: 'finder-main' })
        );
    });

    it('Meine Dateien button opens meine-dateien pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-meine-dateien'));
        fireEvent.click(screen.getByTestId('qa-meine-dateien'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'meine-dateien' })
        );
    });

    it('Mora button opens chat pane', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-mora'));
        fireEvent.click(screen.getByTestId('qa-mora'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'chat', id: 'chat-main' })
        );
    });

    it('Erkunden button calls setCoreMode explore', async () => {
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('qa-explore'));
        fireEvent.click(screen.getByTestId('qa-explore'));
        expect(useMoraStore.getState().coreMode).toBe('explore');
    });
});

// ── 4. My Content Summary ────────────────────────────────────────────────────

describe('HomeSurface — My Content Summary', () => {
    it('shows counts from fetchMyContent', async () => {
        mockFetchMyContent.mockResolvedValue({
            counts: { folders: 3, nodes: 12, files: 5 },
        } as any);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.getByTestId('my-content-card')).toBeInTheDocument();
            expect(screen.getByText(/12 Dokumente/i)).toBeInTheDocument();
        });
    });

    it('hides My Content card when fetchMyContent returns null', async () => {
        mockFetchMyContent.mockResolvedValue(null);
        render(<HomeSurface />);
        await waitFor(() => {
            expect(screen.queryByTestId('my-content-card')).not.toBeInTheDocument();
        });
    });

    it('clicking My Content card opens meine-dateien pane', async () => {
        mockFetchMyContent.mockResolvedValue({ counts: { nodes: 5 } } as any);
        render(<HomeSurface />);
        await waitFor(() => screen.getByTestId('my-content-card'));
        fireEvent.click(screen.getByTestId('my-content-card'));
        expect(openPane).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'meine-dateien' })
        );
    });
});
