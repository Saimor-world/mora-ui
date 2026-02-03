import { useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';

const HIL_TOGGLE_KEY = 'mora_hil_enabled';

export function useHilToggle() {
    const hilEnabled = useMoraStore((state) => state.hilEnabled);
    const setHilEnabled = useMoraStore((state) => state.setHilEnabled);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(HIL_TOGGLE_KEY);
        if (stored === 'true' || stored === 'false') {
            setHilEnabled(stored === 'true');
        }
    }, [setHilEnabled]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(HIL_TOGGLE_KEY, hilEnabled ? 'true' : 'false');
    }, [hilEnabled]);

    return { hilEnabled, setHilEnabled };
}
