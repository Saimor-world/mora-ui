import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LockedPlanetTooltip } from '@/components/layers/LockedPlanetTooltip';

describe('LockedPlanetTooltip', () => {
    const props = {
        name: 'Finance',
        description: 'Finanzabteilung',
        onDismiss: jest.fn(),
    };

    it('shows the department name', () => {
        render(<LockedPlanetTooltip {...props} />);
        expect(screen.getByText(/Finance/i)).toBeInTheDocument();
    });

    it('shows the description', () => {
        render(<LockedPlanetTooltip {...props} />);
        expect(screen.getByText(/Finanzabteilung/i)).toBeInTheDocument();
    });

    it('shows a membership-required message', () => {
        render(<LockedPlanetTooltip {...props} />);
        expect(screen.getByText(/Mitgliedschaft/i)).toBeInTheDocument();
    });

    it('calls onDismiss when dismissed', () => {
        render(<LockedPlanetTooltip {...props} />);
        fireEvent.click(screen.getByRole('button'));
        expect(props.onDismiss).toHaveBeenCalledTimes(1);
    });
});
