import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react';
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
        expect(mockSendToMora).toHaveBeenCalledWith('Hallo Mora', null);
        
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

        expect(mockSendToMora).toHaveBeenCalledWith('Direkt finalisiert', null);
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
});
