import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MoraChat from '@/components/chat/MoraChat';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { useChatData } from '@/lib/hooks/useChatData';

jest.mock('@/lib/hooks/useChatData', () => ({
  useChatData: jest.fn(),
}));
jest.mock('@/lib/hooks/useApi', () => ({
  useHealthCheck: jest.fn(),
}));

const mockedUseHealth = useHealthCheck as jest.Mock;
const mockedUseChatData = useChatData as jest.Mock;

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
});
