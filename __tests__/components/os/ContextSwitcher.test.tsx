import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextSwitcher } from '@/components/os/ContextSwitcher';
import { useContextStore } from '@/lib/store/contextStore';

describe('ContextSwitcher', () => {
    beforeEach(() => {
        useContextStore.getState().setOsContext('company');
    });

    it('shows "Mein Bereich" label when in company context', () => {
        render(<ContextSwitcher />);
        expect(screen.getByTitle(/Mein Bereich/i)).toBeInTheDocument();
    });

    it('switches to personal context on click', () => {
        render(<ContextSwitcher />);
        fireEvent.click(screen.getByTitle(/Mein Bereich/i));
        expect(useContextStore.getState().osContext).toBe('personal');
    });

    it('shows "Unternehmen" label when in personal context', () => {
        useContextStore.getState().setOsContext('personal');
        render(<ContextSwitcher />);
        expect(screen.getByTitle(/Unternehmen/i)).toBeInTheDocument();
    });

    it('switches back to company context on click from personal', () => {
        useContextStore.getState().setOsContext('personal');
        render(<ContextSwitcher />);
        fireEvent.click(screen.getByTitle(/Unternehmen/i));
        expect(useContextStore.getState().osContext).toBe('company');
    });
});
