import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileTab } from '@/apps/settings/ProfileTab';

jest.mock('@/lib/api/coreClient', () => ({ corePost: jest.fn() }));
jest.mock('@/lib/toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const user = { name: 'Marius Fahrländer', email: 'm@saimor.world', role: 'owner' };

describe('ProfileTab', () => {
  it('shows the user identity', () => {
    render(<ProfileTab user={user} />);
    expect(screen.getByText('Marius Fahrländer')).toBeInTheDocument();
    expect(screen.getByText('m@saimor.world')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('renders the change-password form', () => {
    render(<ProfileTab user={user} />);
    expect(screen.getByText('Passwort ändern')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Aktuelles Passwort')).toBeInTheDocument();
  });

  it('disables the submit button until all fields are filled', () => {
    render(<ProfileTab user={user} />);
    expect(screen.getByRole('button', { name: /Passwort aktualisieren/ })).toBeDisabled();
  });
});
