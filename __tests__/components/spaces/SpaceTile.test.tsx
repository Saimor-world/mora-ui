import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { SpaceTile } from '@/components/spaces/SpaceTile';
import { renderWithProviders, resetAllStores } from '../../test-utils';

jest.mock('framer-motion', () => ({
    motion: {
        button: ({
            children,
            initial,
            animate,
            transition,
            whileHover,
            whileTap,
            ...props
        }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
            <button {...props}>{children}</button>
        ),
    },
}));

beforeEach(resetAllStores);

describe('SpaceTile', () => {
    const space = {
        id: 'space-1',
        tenant_id: 'tenant-1',
        department_id: 'department-1',
        name: 'Produkt',
        slug: 'produkt',
        folder_count: 3,
        order: 0,
        is_default: false,
    };

    it('exposes the entire tile as one semantic action without a fake menu button', () => {
        const onClick = jest.fn();
        renderWithProviders(<SpaceTile space={space} onClick={onClick} />);

        const tile = screen.getByRole('button', { name: 'Bereich Produkt öffnen' });
        expect(tile).toHaveAttribute('type', 'button');
        expect(within(tile).queryByRole('button')).not.toBeInTheDocument();

        fireEvent.click(tile);
        expect(onClick).toHaveBeenCalledWith('space-1');
    });

    it('shows the localized folder count without inventing an update time', () => {
        renderWithProviders(<SpaceTile space={space} onClick={jest.fn()} />);

        expect(screen.getByText('3 Ordner')).toBeInTheDocument();
        expect(screen.queryByText(/folders/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/aktualisiert/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/ago/i)).not.toBeInTheDocument();
    });

    it('uses singular folder copy and a real updated_at date when available', () => {
        renderWithProviders(
            <SpaceTile
                space={{
                    ...space,
                    folder_count: 1,
                    updated_at: '2026-07-23T12:00:00.000Z',
                }}
                onClick={jest.fn()}
            />
        );

        expect(screen.getByText('1 Ordner')).toBeInTheDocument();
        expect(screen.getByText('Aktualisiert 23.07.2026')).toBeInTheDocument();
    });
});
