import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MoraChat from '@/components/chat/MoraChat';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { useChatData } from '@/lib/hooks/useChatData';
import { useSessionStore } from '@/store/session';
import { isSemanticEnabled, getSemanticAnswer } from '@/lib/api/semantic';

jest.mock('@/lib/hooks/useChatData', () => ({
  useChatData: jest.fn(),
}));
jest.mock('@/lib/hooks/useApi', () => ({
  useHealthCheck: jest.fn(),
}));
jest.mock('@/lib/api/semantic', () => ({
  isSemanticEnabled: jest.fn(),
  getSemanticAnswer: jest.fn(),
}));

const mockedUseHealth = useHealthCheck as jest.Mock;
const mockedUseChatData = useChatData as jest.Mock;
const mockedSemanticEnabled = isSemanticEnabled as jest.Mock;
const mockedSemanticAnswer = getSemanticAnswer as jest.Mock;

function buildChatData(overrides: Partial<ReturnType<typeof useChatData>> = {}) {
  return {
    source: 'objects',
    hasData: false,
    getStats: jest.fn().mockResolvedValue({ total: 0, byType: {} }),
    list: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('MoraChat', () => {
  beforeEach(() => {
    mockedUseHealth.mockReset();
    mockedUseChatData.mockReset();
    mockedSemanticEnabled.mockReset();
    mockedSemanticAnswer.mockReset();
    mockedSemanticEnabled.mockReturnValue(false);
    useSessionStore.getState().clearMyceliumSelection?.();
  });

  it('shows auth banner when JWT invalid', () => {
    mockedUseHealth.mockReturnValue({
      data: { status: 'unauthorized', timestamp: '2025-11-12T10:00:00Z' },
      refetch: jest.fn(),
    });
    mockedUseChatData.mockReturnValue(buildChatData());

    render(<MoraChat />);
    const toggle = screen.getByLabelText(/Mora Chat/i);
    fireEvent.click(toggle);
    expect(screen.getAllByText(/JWT/i).length).toBeGreaterThan(0);
  });

  it('responds with demo hint when sending a message without data', async () => {
    mockedUseHealth.mockReturnValue({
      data: { status: 'online', timestamp: '2025-11-12T10:00:00Z' },
      refetch: jest.fn(),
    });
    mockedUseChatData.mockReturnValue(buildChatData());
    mockedSemanticEnabled.mockReturnValue(false);

    render(<MoraChat />);
    fireEvent.click(screen.getByLabelText(/Mora Chat/i));

    const input = screen.getByPlaceholderText(/Frag nach Objects/i);
    fireEvent.change(input, { target: { value: 'Zeig mir alles' } });
    fireEvent.click(screen.getByText(/Senden/i));

    await waitFor(() =>
      expect(
        screen.getByText(/Demo-Modus: Es sind noch keine Objekte geladen/i)
      ).toBeInTheDocument()
    );
  });

  it('shows context chip when a node is selected', () => {
    mockedUseHealth.mockReturnValue({
      data: { status: 'online', timestamp: '2025-11-12T10:00:00Z' },
      refetch: jest.fn(),
    });
    mockedUseChatData.mockReturnValue(buildChatData());
    mockedSemanticEnabled.mockReturnValue(false);
    useSessionStore.getState().setMyceliumSelection({
      kind: 'node',
      node: { id: 'n1', label: 'Node One', type: 'document' },
      object: undefined,
    });

    render(<MoraChat />);
    fireEvent.click(screen.getByLabelText(/Mora Chat/i));
    expect(screen.getAllByText(/Node One/).length).toBeGreaterThan(0);
  });

  it('uses semantic answer when feature flag is on and request succeeds', async () => {
    mockedUseHealth.mockReturnValue({
      data: { status: 'online', timestamp: '2025-11-12T10:00:00Z' },
      refetch: jest.fn(),
    });
    mockedUseChatData.mockReturnValue(buildChatData({ hasData: true }));
    mockedSemanticEnabled.mockReturnValue(true);
    mockedSemanticAnswer.mockResolvedValue({ answer: 'Semantic Antwort' });

    render(<MoraChat />);
    fireEvent.click(screen.getByLabelText(/Mora Chat/i));
    const input = screen.getByPlaceholderText(/Frag nach Objects/i);
    fireEvent.change(input, { target: { value: 'Hallo' } });
    fireEvent.click(screen.getByText(/Senden/i));

    await waitFor(() => expect(screen.getByText(/Semantic Antwort/)).toBeInTheDocument());
  });

  it('falls back to demo when semantic errors', async () => {
    mockedUseHealth.mockReturnValue({
      data: { status: 'online', timestamp: '2025-11-12T10:00:00Z' },
      refetch: jest.fn(),
    });
    mockedUseChatData.mockReturnValue(buildChatData());
    mockedSemanticEnabled.mockReturnValue(true);
    mockedSemanticAnswer.mockResolvedValue(null);

    render(<MoraChat />);
    fireEvent.click(screen.getByLabelText(/Mora Chat/i));
    const input = screen.getByPlaceholderText(/Frag nach Objects/i);
    fireEvent.change(input, { target: { value: 'Frag etwas' } });
    fireEvent.click(screen.getByText(/Senden/i));

    await waitFor(() =>
      expect(
        screen.getByText(/Semantische Auswertung gerade nicht erreichbar/i)
      ).toBeInTheDocument()
    );
  });
});
