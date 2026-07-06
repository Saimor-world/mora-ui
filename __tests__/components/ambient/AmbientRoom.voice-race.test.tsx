import React from 'react';
import { fireEvent, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AmbientRoom } from '@/components/ambient/AmbientRoom';
import { renderWithProviders, resetAllStores, createTestQueryClient } from '../../test-utils';
import { useNavStore } from '@/lib/store/navStore';

// Mock framer-motion to bypass animations
jest.mock('framer-motion', () => {
    const React = require('react');
    const passthrough = (tag: string) =>
        React.forwardRef(({ children, initial, animate, exit, transition, layoutId, whileHover, whileTap, ...props }: any, ref: React.Ref<any>) =>
            React.createElement(tag, { ref, ...props }, children)
        );

    return {
        motion: {
            div: passthrough('div'),
            button: passthrough('button'),
            span: passthrough('span'),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

// Mock dependencies
jest.mock('@/components/mora/MoraOrb', () => ({
    MoraOrb: () => <div data-testid="mora-orb" />,
}));

jest.mock('@/components/organic/AmbientDust', () => ({
    AmbientDust: () => <div data-testid="ambient-dust" />,
}));

jest.mock('@/components/ambient/AmbientIntentCard', () => ({
    AmbientIntentCard: () => <div data-testid="intent-card" />,
}));

const mockSendToMora = jest.fn();
const mockExecuteMoraTools = jest.fn();
const mockRandomUUID = jest.fn();
jest.mock('@/lib/hooks/useAmbientMora', () => ({
    useAmbientMora: () => ({
        sendToMora: mockSendToMora,
        executeMoraTools: mockExecuteMoraTools,
        isLoading: false,
        error: null,
    }),
}));

const mockSpeak = jest.fn();
const mockCancel = jest.fn();
jest.mock('@/lib/hooks/useSpeechSynthesis', () => ({
    useSpeechSynthesis: () => ({
        speak: mockSpeak,
        cancel: mockCancel,
        isSpeaking: false,
        isSupported: true,
    }),
}));

jest.mock('@/lib/queries/useTree', () => ({
    useTree: () => ({ data: [], isFetching: false }),
}));

// Mock SpeechRecognition API
class MockSpeechRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    static lastInstance: MockSpeechRecognition | null = null;

    constructor() {
        MockSpeechRecognition.lastInstance = this;
    }

    start = jest.fn();
    stop = jest.fn();
    abort = jest.fn();

    onresult = null as any;
    onerror = null as any;
    onend = null as any;
}

beforeAll(() => {
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(window, 'crypto', {
        value: { randomUUID: mockRandomUUID },
        configurable: true,
    });

    Object.defineProperty(navigator, 'permissions', {
        value: {
            query: jest.fn().mockResolvedValue({
                state: 'granted',
                onchange: null,
            }),
        },
        configurable: true,
    });
});

beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    MockSpeechRecognition.lastInstance = null;
    mockRandomUUID.mockReturnValue('ambient-session-default');
    mockSendToMora.mockResolvedValue({
        text: 'Antwort von Mora',
        toolCalls: [],
        intent: 'test',
    });
});

describe('AmbientRoom voice input lifecycle and race prevention', () => {
    it('does not immediately clear text on normal stop, waits for finalization and onend', async () => {
        const qc = createTestQueryClient();
        renderWithProviders(<AmbientRoom />, { queryClient: qc });

        // 1. Trigger listening via Space key
        await act(async () => {
            fireEvent.keyDown(window, { code: 'Space' });
        });

        const instance = MockSpeechRecognition.lastInstance;
        expect(instance).not.toBeNull();
        expect(instance!.start).toHaveBeenCalledTimes(1);

        // 2. Emit interim speech results
        act(() => {
            instance!.onresult({
                resultIndex: 0,
                results: [
                    Object.assign([
                        { transcript: 'Hallo Mora' }
                    ], { isFinal: false })
                ]
            });
        });

        // Transcript bubble should show live interim text
        expect(screen.getByText('Hallo Mora')).toBeInTheDocument();

        // 3. User stops speaking (Space keyUp)
        await act(async () => {
            fireEvent.keyUp(window, { code: 'Space' });
        });

        // verify stop was called on API but we did not clear state or go to thinking immediately
        expect(instance!.stop).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Hallo Mora')).toBeInTheDocument(); // still visible!
        expect(mockSendToMora).not.toHaveBeenCalled();

        // 4. Emit final results and call onend
        act(() => {
            instance!.onresult({
                resultIndex: 0,
                results: [
                    Object.assign([
                        { transcript: 'Hallo Mora' }
                    ], { isFinal: true })
                ]
            });
        });

        await act(async () => {
            instance!.onend();
        });

        // 5. Verify it transitioned to thinking and processed correctly
        expect(mockSendToMora).toHaveBeenCalledWith('Hallo Mora', null, expect.any(String));
        
        // Wait for async processing in useEffect
        await act(async () => {
            await Promise.resolve();
        });

        // Bubble must remain visible in responding state (non-idle)
        expect(screen.getByText('Hallo Mora')).toBeInTheDocument();
    });

    it('processes a final result even when onend fires in the same browser tick', async () => {
        const qc = createTestQueryClient();
        renderWithProviders(<AmbientRoom />, { queryClient: qc });

        await act(async () => {
            fireEvent.keyDown(window, { code: 'Space' });
        });

        const instance = MockSpeechRecognition.lastInstance;
        expect(instance).not.toBeNull();

        await act(async () => {
            fireEvent.keyUp(window, { code: 'Space' });
            instance!.onresult({
                resultIndex: 0,
                results: [
                    Object.assign([
                        { transcript: 'Direkt finalisiert' }
                    ], { isFinal: true })
                ]
            });
            instance!.onend();
        });

        expect(mockSendToMora).toHaveBeenCalledWith('Direkt finalisiert', null, expect.any(String));
    });

    it('immediately aborts and resets on cancel/abort stop', async () => {
        const qc = createTestQueryClient();
        renderWithProviders(<AmbientRoom />, { queryClient: qc });

        // 1. Trigger listening
        await act(async () => {
            fireEvent.keyDown(window, { code: 'Space' });
        });

        const instance = MockSpeechRecognition.lastInstance;

        // 2. Emit interim result
        act(() => {
            instance!.onresult({
                resultIndex: 0,
                results: [
                    Object.assign([
                        { transcript: 'Ungewollte Eingabe' }
                    ], { isFinal: false })
                ]
            });
        });

        expect(screen.getByText('Ungewollte Eingabe')).toBeInTheDocument();

        // 3. Abort via Escape key
        await act(async () => {
            fireEvent.keyDown(window, { code: 'Escape' });
        });

        // Verify immediate clear
        expect(instance!.abort).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Ungewollte Eingabe')).not.toBeInTheDocument();
        expect(mockSendToMora).not.toHaveBeenCalled();

        // 4. Later onend from browser does not trigger thinking
        await act(async () => {
            instance!.onend();
        });

        expect(mockSendToMora).not.toHaveBeenCalled();
        expect(screen.queryByText('Ungewollte Eingabe')).not.toBeInTheDocument();
    });

    it('does not artificially end: keeps Môra answer and returns to a talk-ready idle after a text-only reply', async () => {
        jest.useFakeTimers();
        try {
            const qc = createTestQueryClient();
            renderWithProviders(<AmbientRoom />, { queryClient: qc });

            // Turn: speak → finalize → onend → thinking → sendToMora (text-only reply)
            await act(async () => { fireEvent.keyDown(window, { code: 'Space' }); });
            const inst = MockSpeechRecognition.lastInstance;
            await act(async () => {
                fireEvent.keyUp(window, { code: 'Space' });
                inst!.onresult({
                    resultIndex: 0,
                    results: [Object.assign([{ transcript: 'Was ist neu' }], { isFinal: true })],
                });
                inst!.onend();
            });
            // Flush the thinking-effect IIFE + the resolved sendToMora continuation.
            await act(async () => {
                await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
            });
            expect(mockSendToMora).toHaveBeenCalledWith('Was ist neu', null, expect.any(String));
            // Visible in the responding flash.
            expect(screen.getByText('Antwort von Mora')).toBeInTheDocument();

            // Short responding flash → idle, but the answer must NOT be erased
            // (old code cleared it after 4 s; that was the one-shot end).
            await act(async () => { jest.advanceTimersByTime(1300); });
            expect(screen.getByText('Antwort von Mora')).toBeInTheDocument();
            expect(screen.getByText(/Drücken & halten/i)).toBeInTheDocument();
        } finally {
            jest.useRealTimers();
        }
    });

    it('keeps one server-held session id across turns and rotates it on reset', async () => {
        mockRandomUUID
            .mockReturnValueOnce('ambient-session-a')
            .mockReturnValueOnce('ambient-session-b');
        jest.useFakeTimers();
        try {
            const qc = createTestQueryClient();
            renderWithProviders(<AmbientRoom />, { queryClient: qc });

            await act(async () => { await Promise.resolve(); });

            await act(async () => { fireEvent.keyDown(window, { code: 'Space' }); });
            let inst = MockSpeechRecognition.lastInstance;
            await act(async () => {
                fireEvent.keyUp(window, { code: 'Space' });
                inst!.onresult({
                    resultIndex: 0,
                    results: [Object.assign([{ transcript: 'Erste Frage' }], { isFinal: true })],
                });
                inst!.onend();
            });
            await act(async () => {
                await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
            });
            await act(async () => { jest.advanceTimersByTime(1300); });

            await act(async () => { fireEvent.keyDown(window, { code: 'Space' }); });
            inst = MockSpeechRecognition.lastInstance;
            await act(async () => {
                fireEvent.keyUp(window, { code: 'Space' });
                inst!.onresult({
                    resultIndex: 0,
                    results: [Object.assign([{ transcript: 'Bezug darauf' }], { isFinal: true })],
                });
                inst!.onend();
            });
            await act(async () => {
                await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
            });

            expect(mockSendToMora).toHaveBeenNthCalledWith(1, 'Erste Frage', null, 'ambient-session-a');
            expect(mockSendToMora).toHaveBeenNthCalledWith(2, 'Bezug darauf', null, 'ambient-session-a');

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
            });
            await act(async () => { jest.advanceTimersByTime(1300); });

            await act(async () => { fireEvent.keyDown(window, { code: 'Space' }); });
            inst = MockSpeechRecognition.lastInstance;
            await act(async () => {
                fireEvent.keyUp(window, { code: 'Space' });
                inst!.onresult({
                    resultIndex: 0,
                    results: [Object.assign([{ transcript: 'Neue Session' }], { isFinal: true })],
                });
                inst!.onend();
            });
            await act(async () => {
                await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
            });

            expect(mockSendToMora).toHaveBeenNthCalledWith(3, 'Neue Session', null, 'ambient-session-b');
            expect(mockSpeak).toHaveBeenCalledWith('Gesprächsverlauf zurückgesetzt.');
        } finally {
            jest.useRealTimers();
        }
    });

    it('stops push-to-talk even when pointer up happens before the next render', async () => {
        const qc = createTestQueryClient();
        renderWithProviders(<AmbientRoom />, { queryClient: qc });

        const mic = screen.getByRole('button', { name: /Spracherkennung starten/i });
        await act(async () => {
            fireEvent.pointerDown(mic);
            fireEvent.pointerUp(mic);
        });

        const instance = MockSpeechRecognition.lastInstance;
        expect(instance).not.toBeNull();
        expect(instance!.start).toHaveBeenCalledTimes(1);
        expect(instance!.stop).toHaveBeenCalledTimes(1);
    });

    it('falls back to text input when browser speech recognition has a network error', async () => {
        const qc = createTestQueryClient();
        renderWithProviders(<AmbientRoom />, { queryClient: qc });

        await act(async () => {
            fireEvent.keyDown(window, { code: 'Space' });
        });

        const instance = MockSpeechRecognition.lastInstance;
        expect(instance).not.toBeNull();

        await act(async () => {
            instance!.onerror({ error: 'network' });
        });

        expect(screen.getByText(/Spracherkennung ist gerade nicht erreichbar/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Gedanken eingeben/i)).toBeInTheDocument();
    });
});
