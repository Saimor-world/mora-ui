import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, resetAllStores } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Loader2: ({ className }: any) => <div className={`loader2 ${className}`} data-testid="loader" />,
    Sparkles: ({ className }: any) => <div className={`sparkles ${className}`} data-testid="sparkles" />,
    WifiOff: () => <div data-testid="wifi-off" />,
    RefreshCw: () => <div data-testid="refresh-cw" />,
    BookmarkPlus: () => <div data-testid="bookmark-plus" />,
    Check: () => <div data-testid="check" />,
    Lightbulb: () => <div data-testid="lightbulb" />,
    Brain: () => <div data-testid="brain" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
        span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
        button: ({ children, className, ...props }: any) => <button className={className} {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock API clients
import { learnInsight } from '@/lib/api/coreClient';
jest.mock('@/lib/api/coreClient', () => ({
    learnInsight: jest.fn(),
}));

// Mock query hooks
import { useMemories, useMemorySearch } from '@/lib/queries/useMemories';
jest.mock('@/lib/queries/useMemories', () => ({
    useMemories: jest.fn(),
    useMemorySearch: jest.fn(),
}));

import { useDepartments } from '@/lib/queries/useDepartments';
jest.mock('@/lib/queries/useDepartments', () => ({
    useDepartments: jest.fn(),
}));

// Import the extracted components
import { MemoriesView } from '@/apps/chat/components/MemoriesView';
import { SaveInsightButton, MemoryHint, RelevantMemories } from '@/apps/chat/components/MemoryComponents';
import { SetupRequiredCard, InputLoadingPlaceholder, OfflineCard, ChatSuggestions } from '@/apps/chat/components/ChatStatusCards';

describe('Chat extracted components tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetAllStores();
        (useMemories as jest.Mock).mockReturnValue({ data: [], isLoading: false });
        (useMemorySearch as jest.Mock).mockReturnValue({ data: [], isLoading: false });
        (useDepartments as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    });

    describe('MemoriesView', () => {
        it('renders loading state when loading list', () => {
            (useMemories as jest.Mock).mockReturnValue({ data: null, isLoading: true });
            renderWithProviders(<MemoriesView searchQuery="" onSearchQueryChange={jest.fn()} isStandardMode={false} />);
            expect(screen.getByTestId('loader')).toBeInTheDocument();
        });

        it('renders empty list state when no memories', () => {
            renderWithProviders(<MemoriesView searchQuery="" onSearchQueryChange={jest.fn()} isStandardMode={false} />);
            expect(screen.getByText(/Noch keine Erinnerungen/)).toBeInTheDocument();
        });

        it('renders list of memories', () => {
            const mockMemories = [
                { id: '1', summary: 'Marius does not like olives', created_at: '2026-06-01T10:00:00Z', similarity: 0.85 },
            ];
            (useMemories as jest.Mock).mockReturnValue({ data: mockMemories, isLoading: false });
            renderWithProviders(<MemoriesView searchQuery="" onSearchQueryChange={jest.fn()} isStandardMode={false} />);
            expect(screen.getByText('Marius does not like olives')).toBeInTheDocument();
            expect(screen.getByText('Ähnlichkeit: 85%')).toBeInTheDocument();
        });

        it('calls onSearchQueryChange when typing in search field', () => {
            const handleSearchChange = jest.fn();
            renderWithProviders(<MemoriesView searchQuery="ol" onSearchQueryChange={handleSearchChange} isStandardMode={false} />);
            const input = screen.getByPlaceholderText('Erinnerungen durchsuchen…');
            fireEvent.change(input, { target: { value: 'olive' } });
            expect(handleSearchChange).toHaveBeenCalledWith('olive');
        });
    });

    describe('SaveInsightButton', () => {
        it('renders "Merken" button when not saved', () => {
            renderWithProviders(<SaveInsightButton content="Marius dislikes coffee" companyId="c1" onSaved={jest.fn()} isSaved={false} />);
            expect(screen.getByText('Merken')).toBeInTheDocument();
        });

        it('displays "Gespeichert" when isSaved is true', () => {
            renderWithProviders(<SaveInsightButton content="Marius dislikes coffee" companyId="c1" onSaved={jest.fn()} isSaved={true} />);
            expect(screen.getByText('Gespeichert')).toBeInTheDocument();
        });

        it('shows category select dropdown and calls learnInsight on click', async () => {
            const mockOnSaved = jest.fn();
            (learnInsight as jest.Mock).mockResolvedValue({});
            renderWithProviders(<SaveInsightButton content="Marius dislikes coffee" companyId="c1" onSaved={mockOnSaved} isSaved={false} />);

            fireEvent.click(screen.getByText('Merken'));
            expect(screen.getByText('Kategorie:')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Fakt'));
            expect(learnInsight).toHaveBeenCalledWith({
                insight: 'Marius dislikes coffee',
                category: 'fact',
                auto_commit: true,
                company_id: 'c1',
            });
            await waitFor(() => expect(mockOnSaved).toHaveBeenCalled());
        });
    });

    describe('MemoryHint', () => {
        it('renders message and calls handlers', () => {
            const onConfirm = jest.fn();
            const onDismiss = jest.fn();
            renderWithProviders(<MemoryHint onConfirm={onConfirm} onDismiss={onDismiss} />);
            expect(screen.getByText('Soll ich das speichern?')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Ja'));
            expect(onConfirm).toHaveBeenCalled();

            fireEvent.click(screen.getByText('Nein'));
            expect(onDismiss).toHaveBeenCalled();
        });
    });

    describe('RelevantMemories', () => {
        it('does not render when no memories and isMemoryBasis is false', () => {
            const { container } = renderWithProviders(<RelevantMemories memories={[]} onDismiss={jest.fn()} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders memories list', () => {
            const mockMemories = [
                { id: '1', summary: 'Memory 1', score: 0.9, category: 'fact' as const, tags: [], timestamp: '2026-06-02T06:00:00Z', source: 'manual' as const },
            ];
            renderWithProviders(<RelevantMemories memories={mockMemories} onDismiss={jest.fn()} />);
            expect(screen.getByText('Relevante Erinnerungen')).toBeInTheDocument();
            expect(screen.getByText('Memory 1')).toBeInTheDocument();
            expect(screen.getByText('90%')).toBeInTheDocument();
        });

        it('renders memory basis message when isMemoryBasis is true', () => {
            renderWithProviders(<RelevantMemories memories={[]} isMemoryBasis={true} onDismiss={jest.fn()} />);
            expect(screen.getByText('Gedächtnisbasis dieser Antwort')).toBeInTheDocument();
            expect(screen.getByText(/Mora hat diese Antwort auf gespeichertes Wissen gestützt/)).toBeInTheDocument();
        });
    });

    describe('SetupRequiredCard', () => {
        it('renders message and calls settings handler', () => {
            const onOpenSettings = jest.fn();
            renderWithProviders(<SetupRequiredCard onOpenSettings={onOpenSettings} />);
            expect(screen.getByText('Mora ist noch nicht eingerichtet')).toBeInTheDocument();
            fireEvent.click(screen.getByText('Einstellungen öffnen'));
            expect(onOpenSettings).toHaveBeenCalled();
        });
    });

    describe('InputLoadingPlaceholder', () => {
        it('renders container', () => {
            const { container } = renderWithProviders(<InputLoadingPlaceholder />);
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('OfflineCard', () => {
        it('renders message and calls retry handler', () => {
            const onRetry = jest.fn();
            renderWithProviders(<OfflineCard onRetry={onRetry} />);
            expect(screen.getByText('Mora ist nicht erreichbar')).toBeInTheDocument();
            fireEvent.click(screen.getByText('Erneut versuchen'));
            expect(onRetry).toHaveBeenCalled();
        });
    });

    describe('ChatSuggestions', () => {
        it('renders department suggestion when viewLevel is department', () => {
            useNavStore.setState({
                viewLevel: 'department',
                activeDepartmentId: 'd1',
            });
            const mockDepts = [{ id: 'd1', name: 'Sales' }];
            (useDepartments as jest.Mock).mockReturnValue({ data: mockDepts, isLoading: false });

            const onSelect = jest.fn();
            renderWithProviders(<ChatSuggestions onSelect={onSelect} />);

            expect(screen.getByText('Was gibt es Neues in Sales?')).toBeInTheDocument();
            fireEvent.click(screen.getByText('Was gibt es Neues in Sales?'));
            expect(onSelect).toHaveBeenCalledWith('Was gibt es Neues in Sales?');
        });

        it('renders alert suggestion when orbState is alert', () => {
            useNavStore.setState({
                viewLevel: 'core',
            });
            useOrbStore.setState({
                orbState: 'alert',
            });

            renderWithProviders(<ChatSuggestions onSelect={jest.fn()} />);
            expect(screen.getByText('Was braucht Aufmerksamkeit?')).toBeInTheDocument();
        });
    });
});
