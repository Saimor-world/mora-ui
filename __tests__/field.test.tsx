import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FieldMode from '@/components/canvas/FieldMode';
import * as ApiHooks from '@/lib/hooks/useApi';

jest.mock('@/lib/hooks/useApi', () => ({
  useSnapshots: jest.fn(),
  useHealthCheck: jest.fn(() => ({
    data: { status: 'online', timestamp: '2025-11-17T10:00:00Z' },
    refetch: jest.fn(),
  })),
}));
jest.mock('@/lib/hooks/useSemanticEvents', () => ({
  useSemanticEvents: jest.fn(() => ({ data: [] })),
}));
jest.mock('@/components/ui/FilterBadge', () => () => <div data-testid="filter-badge" />);
const mockNode = {
  id: 'n1',
  title: 'Demo Node',
  type: 'document',
  path: '/demo',
  tags: ['demo'],
};

jest.mock('@/components/canvas/FieldMode/MyceliumGraph2D', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(({ onNodeClick }: any, ref: any) => (
      <div ref={ref} data-testid="graph" onClick={() => onNodeClick && onNodeClick(mockNode)} />
    )),
  };
});
jest.mock('@/components/canvas/FieldMode/Timeline', () => ({
  __esModule: true,
  default: ({ snapshots }: { snapshots: string[] }) => (
    <div data-testid="timeline">snapshots:{snapshots.length}</div>
  ),
}));
jest.mock('@/lib/hooks/useRole', () => ({
  useRole: () => ({ definition: { fieldHint: 'Demo-Feld' } }),
}));
jest.mock('@/store/session', () => ({
  useSessionStore: (selector?: (state: any) => any) => {
    const state = {
      setLastSnapshotId: jest.fn(),
      setMyceliumSelection: jest.fn(),
      clearMyceliumSelection: jest.fn(),
      myceliumSelection: { kind: 'none' },
    };
    return selector ? selector(state) : state;
  },
}));
jest.mock('@/lib/mockData', () => ({
  mockSnapshots: [
    {
      ts: 'mock',
      nodes: [],
      edges: [],
    },
  ],
}));
jest.mock('@/lib/hooks/useMindloopSynthesis', () => ({
  useMindloopSynthesis: jest.fn(() => ({ items: [], summary: undefined, isLoading: false, error: null })),
}));

const mockedUseSnapshots = ApiHooks.useSnapshots as jest.Mock;

describe('FieldMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows friendly loading state', () => {
    mockedUseSnapshots.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<FieldMode />);
    expect(screen.getByText(/Mora sammelt Snapshot-Daten/i)).toBeInTheDocument();
  });

  it('renders empty state when no nodes are present', () => {
    mockedUseSnapshots.mockReturnValue({
      data: [{ ts: 't0', nodes: [], edges: [] }],
      isLoading: false,
      error: null,
    });
    render(<FieldMode />);
    expect(screen.getByText(/Keine Objekte im aktuellen Snapshot/i)).toBeInTheDocument();
  });

  it('shows node detail when graph node is selected', () => {
    mockedUseSnapshots.mockReturnValue({
      data: [{ ts: 't0', nodes: [mockNode], edges: [] }],
      isLoading: false,
      error: null,
    });
    render(<FieldMode />);
    fireEvent.click(screen.getByTestId('graph'));
    expect(screen.getByText(/Demo Node/)).toBeInTheDocument();
  });
});

