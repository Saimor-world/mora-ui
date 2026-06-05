import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
let mockToken = 'tok-123';

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'token' ? mockToken : null) }),
  useRouter: () => ({ push: mockPush }),
}));

const mockCorePost = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/api/coreClient', () => ({
  corePost: (...args: any[]) => mockCorePost(...args),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => (props: any) => {
    const { children, whileHover, whileTap, initial, animate, ...rest } = props;
    return <button {...rest}>{children}</button>;
  } }),
}));

import ResetPasswordPage from '@/app/reset-password/page';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCorePost.mockClear();
    mockToken = 'tok-123';
  });

  it('marks both password fields as new-password to prevent manager autofill', () => {
    render(<ResetPasswordPage />);
    const fields = [
      screen.getByPlaceholderText(/Mindestens 8 Zeichen/i),
      screen.getByPlaceholderText(/Passwort wiederholen/i),
    ];
    fields.forEach((f) => expect(f).toHaveAttribute('autocomplete', 'new-password'));
  });

  it('sends the exact typed password to the reset endpoint', async () => {
    render(<ResetPasswordPage />);
    const pw = screen.getByPlaceholderText(/Mindestens 8 Zeichen/i);
    const confirm = screen.getByPlaceholderText(/Passwort wiederholen/i);

    fireEvent.change(pw, { target: { value: 'MyReal-Pass-123' } });
    fireEvent.change(confirm, { target: { value: 'MyReal-Pass-123' } });
    fireEvent.click(screen.getByText('Neues Passwort setzen'));

    await waitFor(() => {
      expect(mockCorePost).toHaveBeenCalledWith(
        '/v3/auth/reset-password',
        { token: 'tok-123', new_password: 'MyReal-Pass-123' },
        { skipAuth: true },
      );
    });
  });

  it('blocks submit when confirmation does not match', () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText(/Mindestens 8 Zeichen/i), { target: { value: 'MyReal-Pass-123' } });
    fireEvent.change(screen.getByPlaceholderText(/Passwort wiederholen/i), { target: { value: 'different-456' } });
    fireEvent.click(screen.getByText('Neues Passwort setzen'));
    expect(mockCorePost).not.toHaveBeenCalled();
  });

  it('shows invalid-token state when token missing', () => {
    mockToken = '';
    render(<ResetPasswordPage />);
    expect(screen.getByText(/Ungültiger oder fehlender Reset-Token/i)).toBeInTheDocument();
  });
});
