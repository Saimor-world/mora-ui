import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToolTrace } from '@/components/chat/ToolTrace';
import { toToolTrace } from '@/lib/chat/toolTrace';

jest.mock('lucide-react', () => ({
    Search: ({ className }: any) => <span data-testid="icon-search" className={className} />,
    BookOpen: ({ className }: any) => <span data-testid="icon-book" className={className} />,
    GitCompare: ({ className }: any) => <span data-testid="icon-compare" className={className} />,
    ListChecks: ({ className }: any) => <span data-testid="icon-checks" className={className} />,
    Sparkles: ({ className }: any) => <span data-testid="icon-sparkles" className={className} />,
    AlertTriangle: ({ className }: any) => <span data-testid="icon-warning" className={className} />,
    Wrench: ({ className }: any) => <span data-testid="icon-wrench" className={className} />,
    ChevronRight: () => <span data-testid="chevron-right" />,
    ChevronDown: () => <span data-testid="chevron-down" />,
}));

jest.mock('@/lib/ui/status', () => ({
    TONES: {
        success: { text: 'text-emerald-400' },
        warning: { text: 'text-amber-400' },
    },
}));

describe('ToolTrace component', () => {
    it('returns null for empty steps', () => {
        const { container } = render(<ToolTrace steps={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('returns null for undefined steps', () => {
        const { container } = render(<ToolTrace steps={undefined} />);
        expect(container.firstChild).toBeNull();
    });

    it('shows collapsed view by default with step count', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'test' } },
            { tool: 'read_node', success: true, params: {} },
        ]);
        render(<ToolTrace steps={steps} />);
        expect(screen.getByText('2 Schritte')).toBeInTheDocument();
        expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    });

    it('shows singular "Schritt" for single step', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'test' } },
        ]);
        render(<ToolTrace steps={steps} />);
        expect(screen.getByText('1 Schritt')).toBeInTheDocument();
    });

    it('expands on click to show details', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'Kundenakte' } },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('1 Schritt'));
        
        expect(screen.getByText(/Gesucht/)).toBeInTheDocument();
        expect(screen.getByText(/Kundenakte/)).toBeInTheDocument();
        expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    });

    it('collapses again when clicking expanded header', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'test' } },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('1 Schritt'));
        expect(screen.getByText(/Gesucht/)).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('1 Schritt'));
        expect(screen.queryByText(/Gesucht/)).not.toBeInTheDocument();
    });

    it('shows failed step with warning styling', () => {
        const steps = toToolTrace([
            { tool: 'search', success: false, params: { query: 'test' }, error: 'Failed' },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('1 Schritt'));
        
        expect(screen.getByText(/Nicht abgeschlossen/)).toBeInTheDocument();
        expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
    });

    it('displays amber color for failed steps in collapsed view', () => {
        const steps = toToolTrace([
            { tool: 'search', success: false, params: {}, error: 'Failed' },
        ]);
        render(<ToolTrace steps={steps} />);
        
        const button = screen.getByTestId('tool-trace');
        expect(button.className).toContain('amber');
    });

    it('displays duration when available in milliseconds', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'test' }, duration_ms: 150 },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('1 Schritt'));
        
        expect(screen.getByText(/150ms/)).toBeInTheDocument();
    });

    it('displays duration in seconds when >= 1000ms', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'test' }, duration_ms: 2500 },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('1 Schritt'));
        
        expect(screen.getByText(/2\.5s/)).toBeInTheDocument();
    });

    it('does not show duration when not available', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: { query: 'test' } },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('1 Schritt'));
        
        expect(screen.queryByText(/ms/)).not.toBeInTheDocument();
        expect(screen.queryByText(/\ds/)).not.toBeInTheDocument();
    });

    it('maps tool names to plain language labels', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: {} },
            { tool: 'read_node', success: true, params: {} },
            { tool: 'create_node', success: true, params: {} },
            { tool: 'work_session_plan', success: true, params: {} },
        ]);
        render(<ToolTrace steps={steps} />);
        
        fireEvent.click(screen.getByText('4 Schritte'));
        
        expect(screen.getByText(/Gesucht/)).toBeInTheDocument();
        expect(screen.getByText(/Gelesen/)).toBeInTheDocument();
        expect(screen.getByText(/Gehandelt/)).toBeInTheDocument();
        expect(screen.getByText(/Geplant/)).toBeInTheDocument();
    });

    it('handles multiple failed tools showing hasFailure styling', () => {
        const steps = toToolTrace([
            { tool: 'search', success: true, params: {} },
            { tool: 'read_node', success: false, params: {}, error: 'error' },
            { tool: 'create_node', success: false, params: {}, error: 'error' },
        ]);
        render(<ToolTrace steps={steps} />);
        
        const button = screen.getByTestId('tool-trace');
        expect(button.className).toContain('amber');
    });
});

describe('toToolTrace function', () => {
    it('returns empty array for null input', () => {
        expect(toToolTrace(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
        expect(toToolTrace(undefined)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
        expect(toToolTrace([])).toEqual([]);
    });

    it('preserves duration_ms in output', () => {
        const result = toToolTrace([
            { tool: 'search', success: true, params: {}, duration_ms: 500 },
        ]);
        expect(result[0].durationMs).toBe(500);
    });

    it('preserves duration_ms even on failed steps', () => {
        const result = toToolTrace([
            { tool: 'search', success: false, params: {}, error: 'err', duration_ms: 300 },
        ]);
        expect(result[0].durationMs).toBe(300);
    });
});
