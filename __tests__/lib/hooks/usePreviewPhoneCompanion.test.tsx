/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useNavStore } from '@/lib/store/navStore';
import { BEGLEITER_DEMO_HREF, PREVIEW_PHONE_MQ, usePreviewPhoneCompanion } from '@/lib/hooks/usePreviewPhoneCompanion';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace, push: jest.fn(), refresh: jest.fn() }),
}));

function setMatchMedia(matches: boolean) {
    const listeners: Array<() => void> = [];
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: (query: string) => ({
            matches: query === PREVIEW_PHONE_MQ ? matches : false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: (_: string, fn: () => void) => listeners.push(fn),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        }),
    });
}

describe('usePreviewPhoneCompanion', () => {
    beforeEach(() => {
        replace.mockReset();
        useNavStore.setState({ activeMode: 'real_hq' } as any);
    });

    it('leaves desktop preview on Home', () => {
        setMatchMedia(false);
        useNavStore.setState({ activeMode: 'private_preview' } as any);
        const { result } = renderHook(() => usePreviewPhoneCompanion());
        expect(result.current.handoff).toBe(false);
        expect(replace).not.toHaveBeenCalled();
    });

    it('routes phone preview / visitor to the existing Companion demo', () => {
        setMatchMedia(true);
        useNavStore.setState({ activeMode: 'visitor' } as any);
        const { result } = renderHook(() => usePreviewPhoneCompanion());
        expect(result.current.handoff).toBe(true);
        expect(replace).toHaveBeenCalledWith(BEGLEITER_DEMO_HREF);
    });

    it('does not send real HQ to the Companion', () => {
        setMatchMedia(true);
        useNavStore.setState({ activeMode: 'real_hq' } as any);
        const { result } = renderHook(() => usePreviewPhoneCompanion());
        expect(result.current.handoff).toBe(false);
        expect(replace).not.toHaveBeenCalled();
    });

    it('hands off private_preview at the 767px phone gate', () => {
        setMatchMedia(true);
        useNavStore.setState({ activeMode: 'private_preview' } as any);
        renderHook(() => usePreviewPhoneCompanion());
        expect(replace).toHaveBeenCalledWith(BEGLEITER_DEMO_HREF);
    });

    it('does not treat missing matchMedia as a phone', () => {
        // @ts-expect-error test override
        delete window.matchMedia;
        useNavStore.setState({ activeMode: 'private_preview' } as any);
        const { result } = renderHook(() => usePreviewPhoneCompanion());
        expect(result.current.handoff).toBe(false);
        expect(replace).not.toHaveBeenCalled();
    });
});
