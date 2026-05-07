// __tests__/components/content/VisibilityModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisibilityModal } from '@/components/content/VisibilityModal';

describe('VisibilityModal', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    beforeEach(() => jest.clearAllMocks());

    it('shows the file name', () => {
        render(<VisibilityModal fileName="bericht.pdf" onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText(/bericht\.pdf/i)).toBeInTheDocument();
    });

    it('defaults to department visibility', () => {
        render(<VisibilityModal fileName="doc.pdf" onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole('radio', { name: /Bereich/i })).toBeChecked();
    });

    it('shows all 4 visibility options', () => {
        render(<VisibilityModal fileName="doc.pdf" onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByRole('radio', { name: /Nur ich/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Bereich/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Workspace/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Freigabelink/i })).toBeInTheDocument();
    });

    it('calls onConfirm with selected visibility on apply', () => {
        render(<VisibilityModal fileName="doc.pdf" onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('radio', { name: /Nur ich/i }));
        fireEvent.click(screen.getByRole('button', { name: /Anwenden/i }));
        expect(onConfirm).toHaveBeenCalledWith('private');
    });

    it('calls onCancel when aborted', () => {
        render(<VisibilityModal fileName="doc.pdf" onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /Abbrechen/i }));
        expect(onCancel).toHaveBeenCalled();
    });

    it('respects defaultVisibility prop', () => {
        render(
            <VisibilityModal
                fileName="doc.pdf"
                defaultVisibility="private"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );
        expect(screen.getByRole('radio', { name: /Nur ich/i })).toBeChecked();
    });
});
