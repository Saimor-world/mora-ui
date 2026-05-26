/**
 * useSpeechSynthesis.test.ts
 *
 * Tests the Web Speech Synthesis wrapper:
 *   - speak() calls window.speechSynthesis.speak()
 *   - cancel() calls window.speechSynthesis.cancel()
 *   - isSpeaking tracks onstart/onend lifecycle
 *   - Falls back silently when API is unavailable
 */

import { renderHook, act } from '@testing-library/react';
import { useSpeechSynthesis } from '@/lib/hooks/useSpeechSynthesis';

// ── Mock window.speechSynthesis ───────────────────────────────────────────────

let lastUtterance: SpeechSynthesisUtterance | null = null;

const mockSynth = {
    speak:   jest.fn((u: SpeechSynthesisUtterance) => { lastUtterance = u; }),
    cancel:  jest.fn(),
    speaking: false,
};

beforeEach(() => {
    jest.clearAllMocks();
    lastUtterance = null;
    Object.defineProperty(window, 'speechSynthesis', {
        value:        mockSynth,
        configurable: true,
        writable:     true,
    });
    // Mock SpeechSynthesisUtterance
    (global as any).SpeechSynthesisUtterance = class {
        text:    string;
        lang:    string = 'de-DE';
        onstart: (() => void) | null = null;
        onend:   (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) { this.text = text; }
    };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSpeechSynthesis', () => {

    it('isSupported is true when speechSynthesis is available', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        expect(result.current.isSupported).toBe(true);
    });

    it('isSupported is false when speechSynthesis is absent', () => {
        Object.defineProperty(window, 'speechSynthesis', {
            value: undefined, configurable: true, writable: true,
        });
        const { result } = renderHook(() => useSpeechSynthesis());
        expect(result.current.isSupported).toBe(false);
    });

    it('speak() calls window.speechSynthesis.speak with an utterance', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Hallo Môra'); });
        expect(mockSynth.speak).toHaveBeenCalledTimes(1);
        expect(lastUtterance?.text).toBe('Hallo Môra');
    });

    it('speak() sets lang to de-DE by default', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Test'); });
        expect(lastUtterance?.lang).toBe('de-DE');
    });

    it('speak() respects a custom lang', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Test', 'en-US'); });
        expect(lastUtterance?.lang).toBe('en-US');
    });

    it('speak() cancels previous utterance before starting new one', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Erster'); });
        act(() => { result.current.speak('Zweiter'); });
        // cancel called once per speak (before each new utterance)
        expect(mockSynth.cancel).toHaveBeenCalledTimes(2);
    });

    it('isSpeaking becomes true on utterance onstart', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Test'); });
        act(() => { (lastUtterance as any)?.onstart?.(); });
        expect(result.current.isSpeaking).toBe(true);
    });

    it('isSpeaking becomes false on utterance onend', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Test'); });
        act(() => { (lastUtterance as any)?.onstart?.(); });
        act(() => { (lastUtterance as any)?.onend?.(); });
        expect(result.current.isSpeaking).toBe(false);
    });

    it('cancel() calls speechSynthesis.cancel and resets isSpeaking', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak('Test'); });
        act(() => { (lastUtterance as any)?.onstart?.(); });
        act(() => { result.current.cancel(); });
        expect(mockSynth.cancel).toHaveBeenCalled();
        expect(result.current.isSpeaking).toBe(false);
    });

    it('speak() does nothing when text is empty', () => {
        const { result } = renderHook(() => useSpeechSynthesis());
        act(() => { result.current.speak(''); });
        // cancel is still called (cleanup), but speak is NOT
        expect(mockSynth.speak).not.toHaveBeenCalled();
    });

    it('speak() is a no-op when API is unavailable', () => {
        Object.defineProperty(window, 'speechSynthesis', {
            value: undefined, configurable: true, writable: true,
        });
        const { result } = renderHook(() => useSpeechSynthesis());
        expect(() => act(() => { result.current.speak('Test'); })).not.toThrow();
    });
});
