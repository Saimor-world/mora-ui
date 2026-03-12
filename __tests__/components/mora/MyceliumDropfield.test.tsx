import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MyceliumDropfield } from '@/components/mora/MyceliumDropfield';

jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: new Proxy({}, {
        get: () => {
            return ({ children, ...props }: any) => <div {...props}>{children}</div>;
        }
    }),
    useReducedMotion: () => false,
}));

describe('MyceliumDropfield', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('renders the intake burst copy for dropped files', () => {
        render(
            <MyceliumDropfield
                active={true}
                files={[
                    { id: 'f-1', name: 'campaign.pdf', type: 'application/pdf', size: 1024 },
                    { id: 'f-2', name: 'hero.png', type: 'image/png', size: 2048 },
                ]}
            />
        );

        expect(screen.getByText('Mycelium Intake')).toBeInTheDocument();
        expect(screen.getByText('2 Dateien aufgenommen')).toBeInTheDocument();
        expect(screen.getByText(/Batch wird in Mycelium Intake ueberfuehrt/i)).toBeInTheDocument();
    });

    it('calls onComplete after the burst settles', () => {
        const onComplete = jest.fn();
        render(
            <MyceliumDropfield
                active={true}
                files={[{ id: 'f-1', name: 'campaign.pdf', type: 'application/pdf', size: 1024 }]}
                onComplete={onComplete}
            />
        );

        act(() => {
            jest.advanceTimersByTime(2200);
        });

        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
