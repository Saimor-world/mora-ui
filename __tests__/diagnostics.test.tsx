import { render, screen } from '@testing-library/react';
import CoreStatusBanner from '@/components/status/CoreStatusBanner';
import { StatusItem } from '@/components/diagnostics/DiagnosticsPanel';
import { announceHealthTransition } from '@/lib/health';

jest.mock('@/lib/toast', () => ({
  showToast: jest.fn(),
}));

const { showToast } = jest.requireMock('@/lib/toast') as { showToast: jest.Mock };

describe('Diagnostics UI helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders online health item with green badge and checkmark', () => {
    const { container } = render(
      <StatusItem label="Core API" status="online" message="all good" />
    );
    const badge = container.querySelector('span.font-medium');
    expect(badge).toHaveClass('text-green-500');
    expect(badge).toHaveTextContent('✓ online');
    expect(screen.getByText(/all good/)).toBeInTheDocument();
  });

  it('renders offline health item with red badge and cross icon', () => {
    const { container } = render(<StatusItem label="Core API" status="unreachable" />);
    const badge = container.querySelector('span.font-medium');
    expect(badge).toHaveClass('text-red-500');
    expect(badge).toHaveTextContent('✕ unreachable');
  });

  it('shows offline banner copy with retry button', () => {
    const handleRetry = jest.fn();
    render(<CoreStatusBanner state="offline" onRetry={handleRetry} lastChecked="2025-11-12T10:00:00Z" />);
    expect(screen.getByText(/Môra hört nichts vom Core/)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /Erneut prüfen/i });
    retry.click();
    expect(handleRetry).toHaveBeenCalled();
  });

  it('shows auth specific hint in banner', () => {
    render(<CoreStatusBanner state="auth" />);
    expect(screen.getByText(/JWT ungültig/)).toBeInTheDocument();
  });

  it('announces unauthorized state via toast', () => {
    announceHealthTransition('unauthorized');
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/Core erreichbar.*Zugangstoken/),
        variant: 'warning',
      })
    );
  });
});
