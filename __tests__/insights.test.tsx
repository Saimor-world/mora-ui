import { render, screen } from '@testing-library/react';
import Insights from '@/components/insights/Insights';
import { useHealthCheck } from '@/lib/hooks/useApi';

jest.mock('@/lib/hooks/useApi', () => ({
  useMemoryFacts: jest.fn(() => ({ data: [], isLoading: false })),
  useSnapshots: jest.fn(() => ({ data: [], isLoading: false })),
  useHealthCheck: jest.fn(),
}));
jest.mock('@/lib/contexts', () => ({
  useAppContext: () => ({
    selectedObject: null,
    orb: 'all',
    activeTagFilter: null,
    setActiveTagFilter: jest.fn(),
  }),
}));
jest.mock('@/lib/hooks/useRole', () => ({
  useRole: () => ({ definition: { label: 'Owner', insightsTone: '', fieldHint: '', folderHint: '' } }),
}));
jest.mock('@/components/insights/ContextPanel', () => () => <div data-testid="context-panel" />);
jest.mock('@/components/insights/QuickActions', () => () => <div data-testid="quick-actions" />);
jest.mock('@/components/insights/WorkflowRunner', () => () => <div data-testid="workflow-runner" />);
jest.mock('@/components/insights/Broadcast/BroadcastInbox', () => () => <div data-testid="broadcast" />);
jest.mock('@/components/insights/DataUploadPlaceholder', () => () => <div data-testid="upload" />);
jest.mock('@/components/insights/MonitoringPlaceholder', () => () => <div data-testid="monitoring" />);

const mockedUseHealth = useHealthCheck as jest.Mock;
const { default: RealContextPanel } = jest.requireActual('@/components/insights/ContextPanel');

describe('Insights offline handling', () => {
  it('shows core status banner when health is offline', () => {
    mockedUseHealth.mockReturnValue({
      data: { status: 'unreachable', timestamp: '2025-11-12T10:00:00Z' },
      refetch: jest.fn(),
    });

    render(<Insights />);
    expect(screen.getByRole('button', { name: /Erneut/i })).toBeInTheDocument();
    expect(screen.queryByTestId('context-panel')).not.toBeInTheDocument();
  });
});

describe('ContextPanel states', () => {
  it('renders intro text when no object is selected', () => {
    render(<RealContextPanel selectedObject={null} />);
    expect(screen.getByText(/Kein Objekt ausgewaehlt/i)).toBeInTheDocument();
  });

  it('renders object details when selection exists', () => {
    render(
      <RealContextPanel
        selectedObject={{
          id: '1',
          title: 'Demo File',
          type: 'file',
          spaceId: 'demo',
          path: '/demo/file',
          tags: ['demo'],
        } as any}
      />
    );
    expect(screen.getByText(/Demo File/)).toBeInTheDocument();
    expect(screen.getAllByText(/file/i).length).toBeGreaterThan(0);
  });
});
