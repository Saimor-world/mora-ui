"use client";

/**
 * AmbientRoom — Môra Field v0.2
 *
 * Voice interface of Saimôr OS. A presence, not a form.
 *
 * State machine:
 *   idle → listening → thinking → responding → executing → done → idle (loop)
 *                                                                  ↓ error
 *
 * Key rules:
 *   - The room NEVER auto-navigates. User decides when to leave (ESC / Zurück).
 *   - done state: 1.5 s success flash → auto-resets to idle.
 *   - error state: Môra explains verbally + retry option.
 */

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, RotateCcw } from 'lucide-react';

import { MoraOrb }             from '@/components/mora/MoraOrb';
import { AmbientDust }          from '@/components/organic/AmbientDust';
import { AmbientIntentCard }    from '@/components/ambient/AmbientIntentCard';
import { VoiceModeIndicator, type VoiceIndicatorState } from '@/components/ambient/VoiceModeIndicator';
import { useAmbientMora }       from '@/lib/hooks/useAmbientMora';
import { useSpeechSynthesis }   from '@/lib/hooks/useSpeechSynthesis';
import { closeVoiceOverlay }    from '@/lib/os/openVoiceOverlay';
import { useNavStore }          from '@/lib/store/navStore';
import { useTree }              from '@/lib/queries/useTree';

// ─── Types ────────────────────────────────────────────────────────────────────

type AmbientState =
    | 'idle'
    | 'listening'
    | 'thinking'
    | 'responding'   // Môra replied — intent card visible
    | 'executing'    // tool running
    | 'done'         // success flash
    | 'error';       // failure

interface FlatFolder { id: string; name: string; spaceName: string; deptName: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBackgroundStyle = (state: AmbientState) => {
    const baseGradients = [
        'radial-gradient(circle at 24% 38%, rgba(33,211,184,0.08), transparent 32%)',
        'radial-gradient(circle at 76% 45%, rgba(82,197,255,0.06), transparent 35%)',
        'linear-gradient(145deg, #02050a 0%, #070a14 42%, #05040d 100%)',
    ];

    let stateGradient = '';
    switch (state) {
        case 'listening':
            stateGradient = 'radial-gradient(ellipse 55% 45% at 50% 25%, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 42%, transparent 72%)';
            break;
        case 'thinking':
        case 'executing':
            stateGradient = 'radial-gradient(ellipse 55% 45% at 50% 25%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.04) 42%, transparent 72%)';
            break;
        case 'responding':
            stateGradient = 'radial-gradient(ellipse 55% 45% at 50% 25%, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.04) 42%, transparent 72%)';
            break;
        case 'done':
            stateGradient = 'radial-gradient(ellipse 55% 45% at 50% 25%, rgba(52,211,153,0.22) 0%, rgba(52,211,153,0.05) 42%, transparent 72%)';
            break;
        case 'error':
            stateGradient = 'radial-gradient(ellipse 55% 45% at 50% 25%, rgba(239,68,68,0.20) 0%, rgba(239,68,68,0.05) 42%, transparent 72%)';
            break;
        case 'idle':
        default:
            stateGradient = 'radial-gradient(ellipse 55% 45% at 50% 25%, rgba(178,142,255,0.20) 0%, rgba(83,54,159,0.06) 42%, transparent 72%)';
            break;
    }

    return [stateGradient, ...baseGradients].join(', ');
};

function flattenFolders(tree: any[]): FlatFolder[] {
    const result: FlatFolder[] = [];
    for (const dept of tree) {
        for (const space of dept.children ?? []) {
            for (const folder of space.children ?? []) {
                result.push({
                    id:        folder.id,
                    name:      folder.name ?? folder.title ?? '',
                    spaceName: space.name  ?? space.title  ?? '',
                    deptName:  dept.name   ?? dept.title   ?? '',
                });
            }
        }
    }
    return result;
}

function matchFolder(transcript: string, folders: FlatFolder[]): string | null {
    const lower = transcript.toLowerCase();
    const match = folders.find(f => lower.includes(f.name.toLowerCase()) && f.name.length > 2);
    return match?.id ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AmbientRoomProps {
    /** overlay = glass panel above active surface; room = legacy fullscreen (unused). */
    variant?: 'overlay' | 'room';
    onClose?: () => void;
}

export const AmbientRoom: React.FC<AmbientRoomProps> = ({ variant = 'overlay', onClose }) => {
    const handleClose = onClose ?? closeVoiceOverlay;
    const activeCompanyId = useNavStore(s => s.activeCompanyId);

    const { data: tree = [] }                                = useTree(activeCompanyId);
    const folders                                            = flattenFolders(tree);
    const { sendToMora, executeMoraTools, isLoading }        = useAmbientMora();
    const { speak }                                          = useSpeechSynthesis();

    // ── UI state ──────────────────────────────────────────────────────────────
    const [ambientState,   setAmbientState]  = useState<AmbientState>('idle');
    // Ref mirrors ambientState synchronously so key-handler closures never go stale
    // between setState() call and the React re-render that updates the closure.
    const ambientStateRef = useRef<AmbientState>('idle');
    useEffect(() => { ambientStateRef.current = ambientState; }, [ambientState]);

    const [transcript,     setTranscript]    = useState('');
    const [liveText,       setLiveText]      = useState('');
    const [speechSupported, setSpeechSupported] = useState(true);
    const [fallbackMode,   setFallbackMode]  = useState(false);
    const [fallbackInput,  setFallbackInput] = useState('');
    const [errorMsg,       setErrorMsg]      = useState('');
    const [micPermission,  setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [sessionId,      setSessionId]     = useState<string>('');

    useEffect(() => {
        setSessionId(typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : `session-${Math.random().toString(36).substring(2, 15)}`);
    }, []);

    // Môra's response — drives AmbientIntentCard
    const [moraText,    setMoraText]    = useState('');
    const [moraIntent,  setMoraIntent]  = useState('');
    const [moraTools,   setMoraTools]   = useState<ReturnType<typeof useAmbientMora>['executeMoraTools'] extends (calls: infer T) => any ? T : never>([]);

    const recognitionRef = useRef<any>(null);
    const spaceHeldRef   = useRef(false);
    const stopModeRef    = useRef<'stop' | 'abort' | null>(null);
    const transcriptRef  = useRef('');
    const liveTextRef    = useRef('');

    // Keep refs updated to avoid stale closures inside event handlers
    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        liveTextRef.current = liveText;
    }, [liveText]);

    // ── Speech recognition init ───────────────────────────────────────────────
    const SpeechAPI = typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)
        : null;

    useEffect(() => {
        if (!SpeechAPI) {
            setSpeechSupported(false);
            setFallbackMode(true);
            return;
        }
        // Proactively check mic permission so the UI can reflect it before first tap.
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' as PermissionName })
                .then((result) => {
                    setMicPermission(result.state as 'prompt' | 'granted' | 'denied');
                    result.onchange = () => {
                        setMicPermission(result.state as 'prompt' | 'granted' | 'denied');
                        if (result.state === 'denied') {
                            setFallbackMode(true);
                            setSpeechSupported(false);
                        }
                    };
                })
                .catch(() => { /* permissions API not available — no-op */ });
        }
    }, [SpeechAPI]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Start / Stop listening ─────────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (!SpeechAPI || ambientState === 'listening') return;

        stopModeRef.current = null;

        // If mic was explicitly denied, go straight to text fallback
        if (micPermission === 'denied') {
            setFallbackMode(true);
            setSpeechSupported(false);
            return;
        }

        const recognition = new SpeechAPI();
        recognition.lang           = 'de-DE';
        recognition.continuous     = true;
        recognition.interimResults = true;
        // maxAlternatives helps accuracy; lang fallback ensures English content also works
        recognition.maxAlternatives = 1;

        recognition.onresult = (e: any) => {
            let interim = '';
            let final   = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) final += t;
                else interim += t;
            }
            liveTextRef.current = interim;
            setLiveText(interim);
            if (final) {
                transcriptRef.current += final;
                setTranscript(prev => prev + final);
            }
        };

        recognition.onerror = (e: any) => {
            const err = e.error as string;
            if (err === 'not-allowed' || err === 'service-not-allowed') {
                setMicPermission('denied');
                setFallbackMode(true);
                setSpeechSupported(false);
                setErrorMsg('Mikrofon-Zugriff verweigert. Bitte in Browser-Einstellungen erlauben.');
            } else if (err === 'no-speech') {
                // Timeout without input — soft abort, don't show error
                recognitionRef.current = null;
                setAmbientState('idle');
                setLiveText('');
                return;
            } else if (err === 'network') {
                setErrorMsg('Netzwerkfehler bei der Spracherkennung.');
            } else if (err === 'audio-capture') {
                setErrorMsg('Kein Mikrofon gefunden oder nicht erreichbar.');
                setFallbackMode(true);
            }
            recognitionRef.current = null;
            spaceHeldRef.current = false;
            setAmbientState(err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture' ? 'error' : 'idle');
            setLiveText('');
        };

        recognition.onend = () => {
            const hasContent = (transcriptRef.current + ' ' + liveTextRef.current).trim().length > 0;
            setAmbientState(prev => {
                if (stopModeRef.current === 'abort') {
                    return 'idle';
                }
                if (prev !== 'listening') return prev;
                return hasContent ? 'thinking' : 'idle';
            });
            recognitionRef.current = null;
            stopModeRef.current = null;
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch {
            // start() can throw if called twice — guard silently
            recognitionRef.current = null;
            return;
        }
        setAmbientState('listening');
        setTranscript('');
        setLiveText('');
        setMoraText('');
        setMoraIntent('');
        setMoraTools([]);
    }, [SpeechAPI, ambientState, micPermission]); // eslint-disable-line react-hooks/exhaustive-deps

    const stopListening = useCallback((abort = false) => {
        if (abort) {
            stopModeRef.current = 'abort';
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            spaceHeldRef.current   = false;
            setAmbientState('idle');
            setLiveText('');
            setTranscript('');
            liveTextRef.current = '';
            transcriptRef.current = '';
        } else {
            stopModeRef.current = 'stop';
            recognitionRef.current?.stop();
            spaceHeldRef.current   = false;
        }
    }, []);

    // ── thinking → sendToMora ─────────────────────────────────────────────────
    useEffect(() => {
        if (ambientState !== 'thinking') return;

        const finalText = (transcript + ' ' + liveText).trim();
        if (!finalText) {
            setAmbientState('idle');
            return;
        }

        const defaultFolder = matchFolder(finalText, folders) ?? (folders[0]?.id ?? null);

        let cancelled = false;
        (async () => {
            try {
                const result = await sendToMora(finalText, defaultFolder, sessionId);
                if (cancelled) return;

                if (!result.text && result.toolCalls.length === 0) {
                    setAmbientState('idle');
                    return;
                }

                setMoraText(result.text);
                setMoraIntent(result.intent);
                setMoraTools(result.toolCalls as any);

                // Môra speaks
                if (result.text) speak(result.text);

                setAmbientState('responding');
                // Text-only settling is handled by a dedicated effect below, so the
                // transition does not depend on THIS async effect's cancel flag
                // (setting 'responding' here triggers this effect's cleanup, which
                // would otherwise cancel an inline timeout and trap the room).
            } catch {
                if (cancelled) return;
                setErrorMsg('Ich konnte das nicht verarbeiten.');
                speak('Ich konnte das nicht verarbeiten. Bitte versuche es erneut.');
                setAmbientState('error');
            }
        })();

        return () => { cancelled = true; };
    }, [ambientState]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── done → idle (1.5 s) ───────────────────────────────────────────────────
    useEffect(() => {
        if (ambientState !== 'done') return;
        const t = setTimeout(() => setAmbientState('idle'), 1500);
        return () => clearTimeout(t);
    }, [ambientState]);

    // ── text-only response → talk-ready idle (keeps Môra's answer visible) ─────
    // Lives in its own effect (not the thinking IIFE) so the transition is not
    // cancelled by the thinking effect's cleanup. A text-only reply must settle
    // back into idle — where the room stays continuable and the answer remains —
    // instead of getting trapped in 'responding' (which blocks talking again).
    useEffect(() => {
        if (ambientState !== 'responding' || moraTools.length > 0) return;
        const t = setTimeout(() => setAmbientState('idle'), 1200);
        return () => clearTimeout(t);
    }, [ambientState, moraTools.length]);

    // ── Execute confirmed tools ───────────────────────────────────────────────
    const handleExecute = useCallback(async () => {
        setAmbientState('executing');
        try {
            await executeMoraTools(moraTools as any);
            speak('Erledigt.');
            setAmbientState('done');
        } catch {
            setErrorMsg('Ausführung fehlgeschlagen.');
            speak('Die Ausführung ist fehlgeschlagen.');
            setAmbientState('error');
        }
    }, [executeMoraTools, moraTools, speak]);

    const handleDismiss = useCallback(() => {
        setAmbientState('idle');
    }, []);

    const handleSessionReset = useCallback(() => {
        setSessionId(typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : `session-${Math.random().toString(36).substring(2, 15)}`);
        setTranscript('');
        setLiveText('');
        setMoraText('');
        setMoraIntent('');
        setMoraTools([]);
        setErrorMsg('');
        if (ambientStateRef.current === 'listening') {
            stopListening(true);
        } else {
            setAmbientState('idle');
        }
        speak('Gesprächsverlauf zurückgesetzt.');
    }, [speak, stopListening]);

    // ── Spacebar global binding ────────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            // Read from ref — always current, even before React re-renders
            const state = ambientStateRef.current;
            if (e.code === 'Space' && !spaceHeldRef.current) {
                if (state === 'responding' || state === 'executing' || state === 'done') return;
                e.preventDefault();
                spaceHeldRef.current = true;
                startListening();
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                if (state === 'listening') stopListening(true);
                else if (state === 'responding') setAmbientState('idle');
                else if (state === 'error') setAmbientState('idle');
                else handleClose();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && spaceHeldRef.current) {
                e.preventDefault();
                spaceHeldRef.current = false;
                // Use ref so this works even when React hasn't re-rendered yet
                if (ambientStateRef.current === 'listening') stopListening();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup',   onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup',   onKeyUp);
        };
    }, [startListening, stopListening, handleClose]); // ambientState read via ref — no stale closure

    // ── Orb click toggle ──────────────────────────────────────────────────────
    const handleOrbClick = () => {
        if (fallbackMode) return;
        if (ambientState === 'listening') stopListening();
        else if (ambientState === 'idle')  startListening();
    };

    // ── Fallback text submit ──────────────────────────────────────────────────
    const handleFallbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fallbackInput.trim()) return;
        setTranscript(fallbackInput.trim());
        setFallbackInput('');
        setAmbientState('thinking');
    };

    // ── Orb state mapping ─────────────────────────────────────────────────────
    const orbState =
        ambientState === 'listening'  ? 'listening'
        : ambientState === 'thinking' || isLoading ? 'thinking'
        : ambientState === 'responding' ? 'insight'
        : ambientState === 'executing'  ? 'thinking'
        : ambientState === 'done'     ? 'idle'
        : 'idle';

    // ── Status hint text ──────────────────────────────────────────────────────
    const statusHint =
        ambientState === 'idle'       && !fallbackMode ? 'Drücken & halten · oder Leertaste'
        : ambientState === 'idle'     && fallbackMode  ? 'Eingabe unten'
        : ambientState === 'listening'                 ? 'Hört zu … loslassen zum Beenden'
        : ambientState === 'thinking' || isLoading     ? 'Môra verarbeitet …'
        : ambientState === 'responding'                ? 'Bereit zur Ausführung'
        : ambientState === 'executing'                 ? 'Führt aus …'
        : ambientState === 'done'                      ? '✓ Erledigt'
        : ambientState === 'error'                     ? errorMsg
        : '';

    // ─────────────────────────────────────────────────────────────────────────
    const isOverlay = variant === 'overlay';
    const indicatorState: VoiceIndicatorState = ambientState;

    return (
        <div
            data-testid="ambient-room"
            className={`absolute inset-0 flex flex-col items-center select-none ${
                isOverlay ? 'justify-end pb-32 pointer-events-none' : 'justify-start overflow-hidden'
            }`}
            style={isOverlay ? undefined : { background: getBackgroundStyle(ambientState) }}
        >
            <VoiceModeIndicator state={indicatorState} />

            {!isOverlay && (
            <>
            {/* Animated cosmic background glow circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    className="absolute w-[80vw] h-[80vw] rounded-full filter blur-[120px] opacity-40"
                    style={{
                        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                        left: '-10%',
                        top: '10%',
                    }}
                    animate={{
                        x: [0, 50, -30, 0],
                        y: [0, -40, 50, 0],
                        scale: [1, 1.15, 0.9, 1],
                    }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute w-[75vw] h-[75vw] rounded-full filter blur-[100px] opacity-30"
                    style={{
                        background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
                        right: '-5%',
                        bottom: '10%',
                    }}
                    animate={{
                        x: [0, -40, 30, 0],
                        y: [0, 50, -40, 0],
                        scale: [1, 0.95, 1.1, 1],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </div>

            <AmbientDust count={56} color="rgba(150,220,255,0.16)" durationRange={[25, 55]} />
            </>
            )}

            {/* Close / back */}
            <button
                onClick={handleClose}
                className={`absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all text-xs tracking-widest uppercase pointer-events-auto ${
                    isOverlay ? 'top-16' : ''
                }`}
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zurück</span>
            </button>

            {/* Reset button */}
            <button
                onClick={handleSessionReset}
                className={`absolute top-6 right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all text-xs tracking-widest uppercase pointer-events-auto ${
                    isOverlay ? 'top-16' : ''
                }`}
                title="Gesprächsverlauf zurücksetzen"
            >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
            </button>

            {/* Header */}
            {!isOverlay && (
            <div className="mt-16 mb-2 text-[10px] tracking-[0.35em] uppercase text-cyan-200/45 font-medium">
                Môra Field
            </div>
            )}

            {/* Orb section — glass panel in overlay mode */}
            <div className={`flex flex-col items-center gap-6 z-10 w-full px-8 pointer-events-auto ${
                isOverlay
                    ? 'max-w-xl rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(12,24,32,0.88),rgba(8,12,28,0.92))] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl'
                    : 'mt-6'
            }`}>
                {isOverlay && (
                    <div className="text-[10px] tracking-[0.35em] uppercase text-cyan-200/45 font-medium">
                        Môra Voice
                    </div>
                )}

                <div className="relative flex items-center justify-center">
                    {/* Glowing state-responsive halo circle directly behind orb */}
                    <motion.div
                        className="absolute rounded-full filter blur-[60px] pointer-events-none"
                        style={{
                            width: 260,
                            height: 260,
                        }}
                        animate={
                            ambientState === 'listening'
                                ? { background: 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)', scale: [1, 1.15, 1] }
                                : ambientState === 'thinking' || ambientState === 'executing' || isLoading
                                ? { background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)', scale: [1, 1.1, 1] }
                                : ambientState === 'responding'
                                ? { background: 'radial-gradient(circle, rgba(245,158,11,0.28) 0%, transparent 70%)', scale: [1, 1.05, 1] }
                                : ambientState === 'done'
                                ? { background: 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)', scale: [1, 1.25, 1] }
                                : ambientState === 'error'
                                ? { background: 'radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)', scale: [1, 1.15, 1] }
                                : { background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', scale: [1, 1.05, 1] }
                        }
                        transition={
                            ambientState === 'listening'
                                ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                                : ambientState === 'thinking' || ambientState === 'executing' || isLoading
                                ? { duration: 1.0, repeat: Infinity, ease: 'easeInOut' }
                                : { duration: 4.0, repeat: Infinity, ease: 'easeInOut' }
                        }
                    />

                    {/* Ripple rings */}
                    <AnimatePresence>
                        {ambientState === 'listening' && [0, 1, 2].map(i => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full border border-emerald-400/20"
                                style={{ width: 220 + i * 60, height: 220 + i * 60 }}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: [0, 0.35, 0], scale: [0.85, 1.1, 1.2] }}
                                transition={{ duration: 2.4, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Done flash */}
                    <AnimatePresence>
                        {ambientState === 'done' && (
                            <motion.div
                                key="done-flash"
                                className="absolute rounded-full"
                                style={{ width: 220, height: 220, background: 'radial-gradient(circle, rgba(52,211,153,0.22) 0%, transparent 70%)' }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1.1 }}
                                exit={{ opacity: 0, scale: 1.2 }}
                                transition={{ duration: 0.4 }}
                            />
                        )}
                    </AnimatePresence>

                    <MoraOrb
                        state={orbState}
                        size="lg"
                        onClick={handleOrbClick}
                        interactive
                    />
                </div>

                {/* Push-to-talk mic button */}
                <AnimatePresence mode="wait">
                    {(ambientState === 'idle' || ambientState === 'listening') && !fallbackMode && (
                        <motion.button
                            key="mic-btn"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.25 }}
                            onPointerDown={e => { e.preventDefault(); startListening(); }}
                            onPointerUp={e => { e.preventDefault(); if (ambientState === 'listening') stopListening(); }}
                            onPointerLeave={e => { e.preventDefault(); if (ambientState === 'listening') stopListening(); }}
                            className="relative flex items-center justify-center rounded-full transition-all focus:outline-none"
                            style={{
                                width:      64,
                                height:     64,
                                background: ambientState === 'listening'
                                    ? 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0.12) 100%)'
                                    : 'rgba(124,58,237,0.18)',
                                border: ambientState === 'listening'
                                    ? '2px solid rgba(52,211,153,0.55)'
                                    : '2px solid rgba(139,92,246,0.3)',
                                boxShadow: ambientState === 'listening'
                                    ? '0 0 32px rgba(16,185,129,0.4)'
                                    : '0 0 16px rgba(109,40,217,0.2)',
                            }}
                        >
                            {ambientState === 'listening'
                                ? <MicOff className="w-6 h-6 text-emerald-300" />
                                : <Mic    className="w-6 h-6 text-violet-300" />
                            }
                            {ambientState === 'listening' && (
                                <motion.div
                                    className="absolute inset-[-6px] rounded-full border border-emerald-400/30"
                                    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                />
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Status hint */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={ambientState + (isLoading ? '-loading' : '')}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        className="text-[11px] tracking-[0.25em] uppercase font-medium h-5 text-center"
                        style={{
                            color: ambientState === 'done'  ? 'rgba(52,211,153,0.8)'
                                 : ambientState === 'error' ? 'rgba(239,68,68,0.7)'
                                 : 'rgba(255,255,255,0.3)',
                        }}
                    >
                        {statusHint}
                    </motion.div>
                </AnimatePresence>

                {/* Live transcript bubble */}
                <AnimatePresence>
                    {(ambientState !== 'idle') && (liveText || transcript) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="max-w-lg px-5 py-3 rounded-2xl text-sm text-white/70 leading-relaxed text-center"
                            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                        >
                            {transcript && <span className="text-white/90">{transcript}</span>}
                            {liveText   && <span className="text-violet-300/60 italic"> {liveText}</span>}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Môra visible response */}
                <AnimatePresence>
                    {((ambientState === 'idle' && moraText && !moraTools.length) || (ambientState === 'responding' && moraText)) && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-xl px-5 py-4 rounded-2xl text-sm text-white/75 leading-relaxed text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(210,235,255,0.10), rgba(127,94,255,0.09))',
                                border: '1px solid rgba(186,220,255,0.20)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 22px 70px rgba(38,112,160,0.12)',
                                backdropFilter: 'blur(18px) saturate(135%)',
                            }}
                        >
                            <div className="mb-2 text-[10px] tracking-[0.28em] uppercase text-cyan-100/40">
                                Môra
                            </div>
                            {moraText}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Executing progress line */}
                <AnimatePresence>
                    {ambientState === 'executing' && (
                        <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="w-full max-w-md h-0.5 rounded-full origin-left"
                            style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.6) 0%, rgba(52,211,153,0.4) 100%)' }}
                        />
                    )}
                </AnimatePresence>

                {/* Intent card (responding state - only if there are toolcalls) */}
                <AnimatePresence>
                    {(ambientState === 'responding' && moraTools.length > 0) && (
                        <AmbientIntentCard
                            intent={moraIntent}
                            toolCalls={moraTools as any}
                            onExecute={handleExecute}
                            onDismiss={handleDismiss}
                            disabled={false}
                        />
                    )}
                </AnimatePresence>

                {/* Error retry */}
                <AnimatePresence>
                    {ambientState === 'error' && (
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAmbientState('idle')}
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs text-red-300/70 hover:text-red-300 transition-colors"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                        >
                            <RotateCcw className="w-3 h-3" />
                            Erneut versuchen
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Mic permission denied — guide user */}
                {micPermission === 'denied' && speechSupported && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-xs rounded-2xl px-4 py-3 text-center text-xs leading-relaxed text-red-200/70"
                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.16)' }}
                    >
                        Mikrofon-Zugriff verweigert.{' '}
                        <span className="text-white/50">
                            In Chrome: Adressleiste → 🔒 → Mikrofon → Erlauben, dann Seite neu laden.
                        </span>
                    </motion.div>
                )}

                {/* Fallback text input */}
                {fallbackMode && (ambientState === 'idle' || ambientState === 'error') && (
                    <form onSubmit={handleFallbackSubmit} className="flex w-full max-w-md gap-2 mt-2 px-4">
                        <input
                            type="text"
                            value={fallbackInput}
                            onChange={e => setFallbackInput(e.target.value)}
                            placeholder="Gedanken eingeben …"
                            autoFocus
                            className="flex-1 px-4 py-2.5 rounded-full text-sm text-white/80 placeholder-white/25 outline-none"
                            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(139,92,246,0.22)' }}
                        />
                        <button
                            type="submit"
                            disabled={!fallbackInput.trim()}
                            className="px-4 py-2.5 rounded-full text-xs font-medium text-violet-200 disabled:opacity-30 transition-opacity"
                            style={{ background: 'rgba(109,40,217,0.45)', border: '1px solid rgba(139,92,246,0.28)' }}
                        >
                            ↵
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
