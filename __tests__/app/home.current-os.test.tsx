import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/home/page';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockQuery = '';
let mockEnabled = true;
let mockInternal = false;
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter, useSearchParams: () => new URLSearchParams(mockQuery) }));
jest.mock('next/dynamic', () => () => () => <div data-testid="classic-shell" />);
jest.mock('@/lib/universe/morgen', () => ({ isUniverseV2Enabled: () => false }));
jest.mock('@/lib/os-prototype/flags', () => ({ isOsPrototypeEnabled: () => mockEnabled }));
jest.mock('@/lib/hooks/useIsSaimorInternal', () => ({ useIsSaimorInternal: () => mockInternal }));

beforeEach(() => {
  jest.clearAllMocks(); mockEnabled = true; mockInternal = false; mockQuery = '';
  window.history.replaceState(null, '', '/home');
});

it('moves a bookmarked /home to the current protected OS without rendering the legacy shell', async () => {
  render(<HomePage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/os'));
  expect(screen.queryByTestId('classic-shell')).not.toBeInTheDocument();
});

it('preserves the document/context handoff and feature hash', async () => {
  mockQuery = 'company=example&open_node=node-1';
  window.history.replaceState(null, '', '/home#universe');
  render(<HomePage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/os?company=example&open_node=node-1#universe'));
});

it('does not let a customer select the classic surface by editing the URL', async () => {
  mockQuery = 'classic=1';
  render(<HomePage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/os'));
  expect(screen.queryByTestId('classic-shell')).not.toBeInTheDocument();
});

it('retains the explicit classic choice for an established internal session', () => {
  mockQuery = 'classic=1'; mockInternal = true;
  render(<HomePage />);
  expect(screen.getByTestId('classic-shell')).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('keeps the previous entry when the new OS is not enabled in the build', () => {
  mockEnabled = false;
  render(<HomePage />);
  expect(screen.getByTestId('classic-shell')).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
});
