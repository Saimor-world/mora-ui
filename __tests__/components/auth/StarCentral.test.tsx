import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { StarCentral, StarCentralPause, moraPose, starAlpha } from '@/components/auth/StarCentral';

describe('StarCentral', () => {
    it('rendert alle Modi ohne Auth-Logik', () => {
        for (const mode of ['login', 'lock', 'pause', 'screensaver'] as const) {
            const { container, unmount } = render(<StarCentral mode={mode} firm="Blumen Lindner" />);
            expect(container.querySelector(`[data-star-central="${mode}"]`)).not.toBeNull();
            unmount();
        }
    });

    it('MÔRA-Bewegung und Sternen-Alpha sind stetig (keine Sprünge bei 120 Hz)', () => {
        let maxDy = 0, maxDa = 0;
        for (let i = 1; i < 120 * 20; i++) {
            const a = i / 120, b = (i - 1) / 120;
            maxDy = Math.max(maxDy, Math.abs(moraPose(a).y - moraPose(b).y));
            maxDa = Math.max(maxDa, Math.abs(starAlpha(a, 0.7, 1) - starAlpha(b, 0.7, 1)));
        }
        expect(maxDy).toBeLessThan(0.5);
        expect(maxDa).toBeLessThan(0.002);
    });

    it('Pause: Eingabe ruft onResume (nach kurzer Schutzzeit)', () => {
        jest.useFakeTimers();
        const onResume = jest.fn();
        render(<StarCentralPause onResume={onResume} />);
        expect(screen.getByTestId('star-central-pause')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'a' });
        expect(onResume).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(700); });
        fireEvent.keyDown(window, { key: 'a' });
        expect(onResume).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
    });
});
