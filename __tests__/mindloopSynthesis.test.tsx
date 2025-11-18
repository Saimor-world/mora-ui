import { render, renderHook, waitFor, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMindloopSynthesis } from '@/lib/hooks/useMindloopSynthesis';
import { isSemanticEnabled } from '@/lib/api/semantic';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { getMindloopSynthesis } from '@/lib/api/mindloop';
import SignalCard, { deriveMindloopHints } from '@/components/home/SignalCard';
import { computeAmbientStrength } from '@/components/canvas/FieldMode';

jest.mock('@/lib/api/semantic', () => ({
  isSemanticEnabled: jest.fn(),
}));

jest.mock('@/lib/hooks/useApi', () => ({
  useHealthCheck: jest.fn(),
}));

jest.mock('@/lib/api/mindloop', () => ({
  getMindloopSynthesis: jest.fn(),
}));

const mockedSemanticEnabled = isSemanticEnabled as jest.Mock;
const mockedUseHealth = useHealthCheck as jest.Mock;
const mockedGetMindloop = getMindloopSynthesis as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useMindloopSynthesis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseHealth.mockReturnValue({
      data: { status: 'online', timestamp: '2025-11-17T10:00:00Z' },
      refetch: jest.fn(),
    });
  });

  it('does not fetch when semantic is disabled', async () => {
    mockedSemanticEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useMindloopSynthesis(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(mockedGetMindloop).not.toHaveBeenCalled();
  });

  it('loads synthesis when semantic is enabled and online', async () => {
    mockedSemanticEnabled.mockReturnValue(true);
    mockedGetMindloop.mockResolvedValue({
      items: [{ id: 's1', type: 'semantic', severity: 0.9 }],
      summary: { highest_severity: 0.9, total: 1, breakdown: { semantic: 1 } },
    });

    const { result } = renderHook(() => useMindloopSynthesis(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.items.length).toBe(1));
    expect(result.current.summary?.highest_severity).toBe(0.9);
    expect(mockedGetMindloop).toHaveBeenCalled();
  });
});

describe('SignalCard', () => {
  it('renders summary metrics when signals exist', () => {
    render(
      <SignalCard
        items={[{ id: 's1', type: 'semantic', severity: 0.8 }]}
        summary={{ highest_severity: 0.8, total: 3, breakdown: { semantic: 2, awareness: 1 } }}
      />
    );

    expect(screen.getByText(/Mind Loop Synthese/i)).toBeInTheDocument();
    expect(screen.getByText(/Signale/i)).toBeInTheDocument();
    expect(screen.getByText(/semantic: 2 \u2022 awareness: 1/i)).toBeInTheDocument();
  });

  it('renders derived hints and supports navigation click', () => {
    const onNavigate = jest.fn();
    render(
      <SignalCard
        items={[
          { id: 's1', type: 'semantic', severity: 0.6, tags: ['kaffee'], entity_id: 'n2' },
          { id: 's2', type: 'semantic', severity: 0.5, tags: ['kaffee'], entity_id: 'n3' },
          { id: 's3', type: 'anomaly', severity: 0.9, entity_id: 'n4' },
        ]}
        summary={{ highest_severity: 0.9, total: 3, breakdown: { semantic: 2, anomaly: 1 } }}
        onNavigateToTargets={onNavigate}
      />
    );

    const hintButton = screen.getByRole('button', { name: /Resonanz/i });
    fireEvent.click(hintButton);
    expect(onNavigate).toHaveBeenCalled();
  });
});

describe('Ambient shimmer intensity', () => {
  it('activates only above threshold', () => {
    expect(computeAmbientStrength(0.9)).toBeGreaterThan(0);
    expect(computeAmbientStrength(0.6)).toBe(0);
  });
});

describe('deriveMindloopHints', () => {
  it('creates up to three calm suggestions from synthesis items', () => {
    const hints = deriveMindloopHints([
      { id: 'a', type: 'semantic', tags: ['umsatz'], entity_id: 'n2', severity: 0.4 },
      { id: 'b', type: 'semantic', tags: ['umsatz'], entity_id: 'n3', severity: 0.5 },
      { id: 'c', type: 'anomaly', entity_id: 'n4', severity: 0.95 },
    ]);
    expect(hints.length).toBeGreaterThan(0);
    expect(hints.some((h) => h.tone === 'theme')).toBe(true);
    expect(hints.some((h) => h.tone === 'anomaly')).toBe(true);
  });

  it('returns empty suggestions when no signals exist and caps at three when crowded', () => {
    expect(deriveMindloopHints([])).toHaveLength(0);
    const crowded = deriveMindloopHints([
      { id: 'a', type: 'semantic', tags: ['kaffee'], entity_id: 'n1', severity: 0.4 },
      { id: 'b', type: 'semantic', tags: ['kaffee'], entity_id: 'n2', severity: 0.5 },
      { id: 'c', type: 'anomaly', entity_id: 'n3', severity: 0.9 },
      { id: 'd', type: 'opportunity', entity_id: 'n4', severity: 0.6 },
      { id: 'e', type: 'semantic', tags: ['umsatz'], entity_id: 'n5', severity: 0.6 },
    ]);
    expect(crowded.length).toBeLessThanOrEqual(3);
  });
});
