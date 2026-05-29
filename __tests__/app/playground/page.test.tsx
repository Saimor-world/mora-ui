/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

// Mock sonner
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Mock corePost (not used in audit_session path, but imported)
jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn() }));

// Mock websiteEntryStorage
jest.mock('@/lib/websiteEntryStorage', () => ({
  clearWebsiteEntryActiveContext: jest.fn(),
}));

// Mock navStore
jest.mock('@/lib/store/navStore', () => ({
  useNavStore: { getState: () => ({ setActiveMode: jest.fn() }) },
}));

describe('PlaygroundPage — audit_session param', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Set audit_session and node params in URL
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        search: '?audit_session=test-token-abc&node=node-123',
        href: 'http://localhost/playground?audit_session=test-token-abc&node=node-123',
        assign: jest.fn(),
      },
    });
  });

  it('sets localStorage and redirects when audit_session param is present', async () => {
    const PlaygroundPage = (await import('@/app/playground/page')).default;
    await act(async () => {
      render(<PlaygroundPage />);
    });

    // Should set session token in localStorage
    expect(localStorage.getItem('saimor_playground_session')).toBe('test-token-abc');
    // Should redirect to /home with open_node param
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/home'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('open_node=node-123'));
  });

  it('shows the email form when no audit_session param', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '', href: 'http://localhost/playground' },
    });
    const PlaygroundPage = (await import('@/app/playground/page')).default;
    const { getByPlaceholderText } = render(<PlaygroundPage />);
    expect(getByPlaceholderText(/name@firma\.de/i)).toBeInTheDocument();
  });
});
