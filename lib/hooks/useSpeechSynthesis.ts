"use client";

/**
 * useSpeechSynthesis — wraps the Web Speech Synthesis API.
 *
 * - Default lang: de-DE
 * - Falls back silently when window.speechSynthesis is unavailable
 * - Cancels any in-progress utterance before starting a new one
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseSpeechSynthesisReturn {
    speak: (text: string, lang?: string) => void;
    cancel: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const isSupported =
        typeof window !== 'undefined' && Boolean(window.speechSynthesis);

    const cancel = useCallback(() => {
        if (!isSupported) return;
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        setIsSpeaking(false);
    }, [isSupported]);

    const speak = useCallback(
        (text: string, lang = 'de-DE') => {
            if (!isSupported || !text.trim()) return;

            // Cancel any currently playing utterance
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend   = () => {
                setIsSpeaking(false);
                utteranceRef.current = null;
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
                utteranceRef.current = null;
            };

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        },
        [isSupported],
    );

    // Cancel on unmount — re-check at cleanup time (isSupported may have changed in tests)
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return { speak, cancel, isSpeaking, isSupported };
}
