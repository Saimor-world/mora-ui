import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingScreen, ErrorScreen } from '@/components/os/shell/ShellStatusScreens';
import { coreUnreachableUserMessage } from '@/lib/api/coreReachability';

describe('LoadingScreen', () => {
  it('shows the OS booting state', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('SAIMÔR OS')).toBeInTheDocument();
    expect(screen.getByText('Môra hört zu...')).toBeInTheDocument();
  });

  it('uses the real session name instead of Demo', () => {
    const { container } = render(<LoadingScreen name="Acme GmbH" role="owner" />);
    expect(container.textContent).not.toMatch(/\bDemo\b/);
  });
});

describe('ErrorScreen', () => {
  it('shows the connection error and the passed message', () => {
    render(<ErrorScreen message="Backend nicht erreichbar" />);
    expect(screen.getByText('Verbindung unterbrochen')).toBeInTheDocument();
    expect(screen.getByText('Backend nicht erreichbar')).toBeInTheDocument();
  });

  it('keeps connection guidance free of local server commands', () => {
    const message = coreUnreachableUserMessage();
    render(<ErrorScreen message={message} />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/start-local-truth/i)).not.toBeInTheDocument();
  });

  it('offers a retry button', () => {
    render(<ErrorScreen message="x" />);
    expect(screen.getByRole('button', { name: /Erneut verbinden/ })).toBeEnabled();
  });
});
