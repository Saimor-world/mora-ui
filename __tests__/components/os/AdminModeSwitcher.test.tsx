import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminModeSwitcher } from '@/components/os/AdminModeSwitcher';
import { useContextStore } from '@/lib/store/contextStore';
import { useSessionStore } from '@/lib/store/sessionStore';

describe('AdminModeSwitcher', () => {
    beforeEach(() => {
        useContextStore.getState().setAdminMode(false);
    });

    it('renders for owner role', () => {
        useSessionStore.setState({ user: { id: 'u-1', name: 'Owner', email: 'o@firma.de', role: 'owner' } });
        render(<AdminModeSwitcher />);
        expect(screen.getByTitle(/Admin/i)).toBeInTheDocument();
    });

    it('renders for admin role', () => {
        useSessionStore.setState({ user: { id: 'u-2', name: 'Admin', email: 'a@firma.de', role: 'admin' } });
        render(<AdminModeSwitcher />);
        expect(screen.getByTitle(/Admin/i)).toBeInTheDocument();
    });

    it('does not render for member role', () => {
        useSessionStore.setState({ user: { id: 'u-3', name: 'Member', email: 'm@firma.de', role: 'member' } });
        const { container } = render(<AdminModeSwitcher />);
        expect(container.firstChild).toBeNull();
    });

    it('clicking enters admin mode', () => {
        useSessionStore.setState({ user: { id: 'u-1', name: 'Owner', email: 'o@firma.de', role: 'owner' } });
        render(<AdminModeSwitcher />);
        fireEvent.click(screen.getByTitle(/Admin/i));
        expect(useContextStore.getState().isAdminMode).toBe(true);
    });

    it('shows exit label when in admin mode', () => {
        useSessionStore.setState({ user: { id: 'u-1', name: 'Owner', email: 'o@firma.de', role: 'owner' } });
        useContextStore.getState().setAdminMode(true);
        render(<AdminModeSwitcher />);
        expect(screen.getByTitle(/Administration verlassen/i)).toBeInTheDocument();
    });

    it('clicking exits admin mode when active', () => {
        useSessionStore.setState({ user: { id: 'u-1', name: 'Owner', email: 'o@firma.de', role: 'owner' } });
        useContextStore.getState().setAdminMode(true);
        render(<AdminModeSwitcher />);
        fireEvent.click(screen.getByTitle(/Administration verlassen/i));
        expect(useContextStore.getState().isAdminMode).toBe(false);
    });
});
