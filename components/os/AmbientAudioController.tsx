'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT,
    AMBIENT_AUDIO_STORAGE_KEYS,
    AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT,
    DEFAULT_AMBIENT_AUDIO_VOLUME,
    getAmbientAudioTrackBlob,
    listAmbientAudioTracks,
    persistAmbientSceneTrackMap,
    persistAmbientAudioSettings,
    resolveAmbientAudioSettings,
    resolveAmbientSceneTrackMap,
} from '@/lib/audio/ambientAudio';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { getEffectiveRitualScene, resolveRitualSettings, RITUAL_SCENES, type RitualSceneId } from '@/lib/os/ritualMode';

// Per-scene chord voicings: [freq Hz, waveform, relative gain]
const SCENE_VOICES: Record<RitualSceneId, Array<[number, OscillatorType, number]>> = {
    // Amaj9 open — meditative, emerald clarity
    flow: [
        [55,     'sine',     0.20],
        [110,    'sine',     0.17],
        [164.81, 'triangle', 0.11],
        [220,    'sine',     0.13],
        [277.18, 'triangle', 0.09],
        [329.63, 'sine',     0.08],
        [392,    'triangle', 0.055],
        [440,    'sine',     0.04],
    ],
    // Dmaj9 — focused, sky-blue precision
    build: [
        [36.71,  'sine',     0.22],
        [73.42,  'sine',     0.18],
        [110,    'triangle', 0.10],
        [146.83, 'sine',     0.14],
        [185.00, 'triangle', 0.08],
        [220,    'sine',     0.07],
        [293.66, 'triangle', 0.05],
        [329.63, 'sine',     0.035],
    ],
    // Fmaj9 — warm, jazzy, amber glow
    lounge: [
        [43.65,  'sine',     0.21],
        [87.31,  'sine',     0.17],
        [130.81, 'triangle', 0.12],
        [174.61, 'sine',     0.13],
        [220,    'triangle', 0.09],
        [261.63, 'sine',     0.08],
        [329.63, 'triangle', 0.06],
        [392,    'sine',     0.04],
    ],
    // Am11 — mysterious, deep indigo space
    night: [
        [27.50,  'sine',     0.24],
        [55,     'sine',     0.19],
        [82.41,  'triangle', 0.10],
        [110,    'sine',     0.12],
        [146.83, 'triangle', 0.07],
        [196,    'sine',     0.06],
        [261.63, 'triangle', 0.04],
        [293.66, 'sine',     0.03],
    ],
};

export const AmbientAudioController: React.FC = () => {
    const userSettings = useSessionStore((state) => state.user?.settings);
    const coreMode = useNavStore((state) => state.coreMode);
    const viewLevel = useNavStore((state) => state.viewLevel);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const currentTrackIdRef = useRef<string | null>(null);
    const syntheticContextRef = useRef<AudioContext | null>(null);
    const syntheticNodesRef = useRef<{
        oscillators: AudioScheduledSourceNode[];
        gains: GainNode[];
        master: GainNode;
        lfo: OscillatorNode;
        lfoGain: GainNode;
    } | null>(null);
    const autoplayBlockedRef = useRef(false);
    const fadeFrameRef = useRef<number | null>(null);
    const interactionReadyRef = useRef(false);
    const previousSurfaceKeyRef = useRef<string | null>(null);
    const [ambientAudio, setAmbientAudio] = useState(() => resolveAmbientAudioSettings());
    const [sceneTrackMap, setSceneTrackMap] = useState(() => resolveAmbientSceneTrackMap());
    const ritualSettings = resolveRitualSettings(userSettings);
    const ritualSceneId = getEffectiveRitualScene(ritualSettings);
    const effectiveTrackId = sceneTrackMap[ritualSceneId] || ambientAudio.trackId;
    const baseVolume = Math.max(
        0,
        Math.min(1, ambientAudio.volume * (RITUAL_SCENES[ritualSceneId]?.audioGain ?? 1))
    );
    const surfaceKey = viewLevel === 'core'
        ? coreMode
        : 'secondary';
    const surfaceVolumeMultiplier = viewLevel === 'core'
        ? (coreMode === 'home' ? 0.52 : 1)
        : 0.2;
    const effectiveVolume = Math.max(0, Math.min(1, baseVolume * surfaceVolumeMultiplier));
    const clampVolume = useRef((value: number) => Math.max(0, Math.min(1, value)));
    const effectiveVolumeRef = useRef(effectiveVolume);
    useEffect(() => {
        effectiveVolumeRef.current = effectiveVolume;
    }, [effectiveVolume]);
    const tryPlay = useRef(async () => {
        const audioElement = audioRef.current;
        if (!audioElement || !audioElement.src) return;

        try {
            await audioElement.play();
            autoplayBlockedRef.current = false;
        } catch {
            autoplayBlockedRef.current = true;
        }
    });
    const stopSyntheticAmbient = useRef(() => {
        const nodes = syntheticNodesRef.current;
        if (nodes) {
            nodes.oscillators.forEach((oscillator) => {
                try {
                    oscillator.stop();
                } catch {
                    // Already stopped.
                }
            });
            try {
                nodes.lfo.stop();
            } catch {
                // Already stopped.
            }
            nodes.oscillators.forEach((oscillator) => oscillator.disconnect());
            nodes.gains.forEach((gain) => gain.disconnect());
            nodes.lfo.disconnect();
            nodes.lfoGain.disconnect();
            nodes.master.disconnect();
            syntheticNodesRef.current = null;
        }
    });
    const startSyntheticAmbient = useRef(async (forceScene?: RitualSceneId) => {
        if (syntheticNodesRef.current) return;
        if (typeof window === 'undefined') return;

        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;

        const context = syntheticContextRef.current ?? new Ctx();
        syntheticContextRef.current = context;
        if (context.state === 'suspended') {
            await context.resume().catch(() => null);
        }
        if (context.state !== 'running') return;

        const currentVolume = effectiveVolumeRef.current;

        // Master output
        const master = context.createGain();
        master.gain.value = 0.0001;
        master.connect(context.destination);

        // Reverb — 3 delay lines in parallel for room depth
        const makeDelay = (time: number, feedback: number) => {
            const delay = context.createDelay(2.0);
            const fb = context.createGain();
            const lpf = context.createBiquadFilter();
            delay.delayTime.value = time;
            fb.gain.value = feedback;
            lpf.type = 'lowpass';
            lpf.frequency.value = 3400;
            delay.connect(lpf);
            lpf.connect(fb);
            fb.connect(delay);
            delay.connect(master);
            return delay;
        };
        const rev1 = makeDelay(0.067, 0.42);
        const rev2 = makeDelay(0.149, 0.36);
        const rev3 = makeDelay(0.211, 0.28);
        const reverbBus = context.createGain();
        reverbBus.gain.value = Math.max(0.001, currentVolume * 0.42);
        reverbBus.connect(rev1);
        reverbBus.connect(rev2);
        reverbBus.connect(rev3);

        // Primary LFO — slow breathing
        const lfo = context.createOscillator();
        const lfoGain = context.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.025;
        lfoGain.gain.value = Math.max(0.001, currentVolume * 0.12);
        lfo.connect(lfoGain);
        lfoGain.connect(master.gain);

        // Secondary LFO — subtle shimmer
        const lfo2 = context.createOscillator();
        const lfoGain2 = context.createGain();
        lfo2.type = 'sine';
        lfo2.frequency.value = 0.19;
        lfoGain2.gain.value = Math.max(0.001, currentVolume * 0.035);
        lfo2.connect(lfoGain2);
        lfoGain2.connect(master.gain);

        const activeScene = forceScene ?? ritualSceneId;
        const VOICES = SCENE_VOICES[activeScene] ?? SCENE_VOICES.flow;

        const allSources: AudioScheduledSourceNode[] = [];
        const allGains: GainNode[] = [];

        VOICES.forEach(([freq, waveType, level], i) => {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = waveType;
            osc.frequency.value = freq;
            osc.detune.value = (i - 3.5) * 2.0;
            gain.gain.value = Math.max(0.001, currentVolume * level);
            osc.connect(gain);
            gain.connect(master);
            gain.connect(reverbBus);
            osc.start();
            allSources.push(osc);
            allGains.push(gain);
        });

        // Filtered noise — room breath / air texture
        const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const noise = context.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        const noiseFilter = context.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 260;
        noiseFilter.Q.value = 0.35;
        const noiseGain = context.createGain();
        noiseGain.gain.value = Math.max(0.0001, currentVolume * 0.010);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(master);
        noise.start();
        allSources.push(noise);
        allGains.push(noiseGain);

        lfo.start();
        lfo2.start();
        allSources.push(lfo2);
        allGains.push(lfoGain2);
        allGains.push(reverbBus);

        master.gain.setTargetAtTime(Math.max(0.001, currentVolume * 0.52), context.currentTime, 2.4);
        syntheticNodesRef.current = {
            oscillators: allSources,
            gains: allGains,
            master,
            lfo,
            lfoGain,
        };
    });

    useEffect(() => {
        setAmbientAudio(resolveAmbientAudioSettings(userSettings));
        setSceneTrackMap(resolveAmbientSceneTrackMap(userSettings));
    }, [userSettings]);

    useEffect(() => {
        const syncSettings = () => {
            setAmbientAudio(resolveAmbientAudioSettings(userSettings));
            setSceneTrackMap(resolveAmbientSceneTrackMap(userSettings));
        };

        window.addEventListener(AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT, syncSettings);
        window.addEventListener(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT, syncSettings);
        return () => {
            window.removeEventListener(AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT, syncSettings);
            window.removeEventListener(AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT, syncSettings);
        };
    }, [userSettings]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        audioElement.loop = true;
    }, []);

    // Scene change — restart synthetic ambient with new voicing
    const prevRitualSceneRef = useRef<RitualSceneId>(ritualSceneId);
    useEffect(() => {
        if (prevRitualSceneRef.current === ritualSceneId) return;
        prevRitualSceneRef.current = ritualSceneId;
        if (!ambientAudio.enabled || effectiveTrackId || !interactionReadyRef.current) return;
        const ctx = syntheticContextRef.current;
        if (ctx && syntheticNodesRef.current) {
            // Fade out old synth over 1.8s, then swap in new scene voicing
            syntheticNodesRef.current.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
            setTimeout(() => {
                stopSyntheticAmbient.current();
                void startSyntheticAmbient.current(ritualSceneId);
            }, 1800);
        }
    }, [ritualSceneId, ambientAudio.enabled, effectiveTrackId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const explicitEnabled = window.localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEYS.enabled);
        const explicitTrackId = window.localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEYS.trackId);
        if (explicitEnabled !== null && explicitTrackId !== null) return;

        let cancelled = false;

        const seedAmbientDefaults = async () => {
            try {
                const tracks = await listAmbientAudioTracks();
                if (cancelled || tracks.length === 0) return;
                persistAmbientAudioSettings(null, {
                    ambientAudioEnabled: true,
                    ambientAudioVolume: DEFAULT_AMBIENT_AUDIO_VOLUME,
                    ambientAudioTrackId: explicitTrackId || tracks[0].id,
                });
            } catch {
                // If no local library exists yet, leave the controller idle.
            }
        };

        void seedAmbientDefaults();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!ambientAudio.enabled || effectiveTrackId) return;

        let cancelled = false;

        const ensureDefaultTrack = async () => {
            try {
                const tracks = await listAmbientAudioTracks();
                if (cancelled || tracks.length === 0) return;
                persistAmbientAudioSettings(null, {
                    ambientAudioEnabled: true,
                    ambientAudioTrackId: tracks[0].id,
                });
            } catch {
                // Silent fallback: if no library exists yet, keep the controller idle.
            }
        };

        void ensureDefaultTrack();

        return () => {
            cancelled = true;
        };
    }, [ambientAudio.enabled, effectiveTrackId]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        let cancelled = false;

        const revokeCurrentObjectUrl = () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };

        const clearSource = () => {
            audioElement.pause();
            currentTrackIdRef.current = null;
            revokeCurrentObjectUrl();
            audioElement.removeAttribute('src');
            audioElement.load();
        };

        if (!effectiveTrackId) {
            clearSource();
            if (ambientAudio.enabled && interactionReadyRef.current) {
                void startSyntheticAmbient.current();
            }
            return () => {
                cancelled = true;
            };
        }

        stopSyntheticAmbient.current();

        const syncTrack = async () => {
            if (currentTrackIdRef.current === effectiveTrackId && audioElement.src) {
                return;
            }

            audioElement.pause();
            revokeCurrentObjectUrl();

            const trackBlob = await getAmbientAudioTrackBlob(effectiveTrackId);
            if (cancelled) return;

            if (!trackBlob) {
                const availableTracks = await listAmbientAudioTracks();
                if (cancelled) return;

                const fallbackTrackId =
                    availableTracks.find((track) => track.id === ambientAudio.trackId)?.id
                    || availableTracks[0]?.id
                    || null;

                if (fallbackTrackId) {
                    if (sceneTrackMap[ritualSceneId] === effectiveTrackId) {
                        persistAmbientSceneTrackMap({
                            ...sceneTrackMap,
                            [ritualSceneId]: fallbackTrackId,
                        });
                    } else {
                        persistAmbientAudioSettings(null, {
                            ambientAudioTrackId: fallbackTrackId,
                        });
                    }
                    return;
                }

                clearSource();
                return;
            }

            const objectUrl = URL.createObjectURL(trackBlob);
            currentTrackIdRef.current = effectiveTrackId;
            objectUrlRef.current = objectUrl;
            audioElement.src = objectUrl;
            audioElement.preload = 'auto';
            audioElement.muted = false;
            audioElement.setAttribute('playsinline', 'true');
            audioElement.volume = clampVolume.current(0.001);

            if (ambientAudio.enabled) {
                if (interactionReadyRef.current || !autoplayBlockedRef.current) {
                    await tryPlay.current();
                } else {
                    autoplayBlockedRef.current = true;
                }
            }
        };

        syncTrack();

        return () => {
            cancelled = true;
        };
    }, [ambientAudio.enabled, ambientAudio.trackId, effectiveTrackId, ritualSceneId, sceneTrackMap]);

    useEffect(() => {
        const nodes = syntheticNodesRef.current;
        if (!nodes) return;
        nodes.master.gain.setTargetAtTime(
            ambientAudio.enabled ? Math.max(0.001, effectiveVolume * 0.54) : 0.0001,
            syntheticContextRef.current?.currentTime ?? 0,
            1.2
        );
        nodes.gains.forEach((gain, index) => {
            gain.gain.setTargetAtTime(
                ambientAudio.enabled ? Math.max(0.001, effectiveVolume * (index === 0 ? 0.18 : 0.09)) : 0.0001,
                syntheticContextRef.current?.currentTime ?? 0,
                1.2
            );
        });
        nodes.lfoGain.gain.setTargetAtTime(
            ambientAudio.enabled ? Math.max(0.001, effectiveVolume * 0.16) : 0.0001,
            syntheticContextRef.current?.currentTime ?? 0,
            1.2
        );
    }, [ambientAudio.enabled, effectiveVolume]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        if (fadeFrameRef.current) {
            cancelAnimationFrame(fadeFrameRef.current);
            fadeFrameRef.current = null;
        }

        const startVolume = audioElement.volume;
        const targetVolume = ambientAudio.enabled ? effectiveVolume : 0;
        const previousSurfaceKey = previousSurfaceKeyRef.current;
        previousSurfaceKeyRef.current = surfaceKey;
        const enteringHome = surfaceKey === 'home' && previousSurfaceKey !== 'home';
        const leavingHome = previousSurfaceKey === 'home' && surfaceKey !== 'home';
        const durationMs = enteringHome
            ? 4400
            : leavingHome
                ? 2200
                : surfaceKey === 'home'
                    ? 3600
                    : 1100;
        const startedAt = performance.now();

        const tick = (timestamp: number) => {
            const progress = Math.min(1, (timestamp - startedAt) / durationMs);
            const eased = 1 - Math.pow(1 - progress, 3);
            audioElement.volume = clampVolume.current(startVolume + ((targetVolume - startVolume) * eased));
            if (progress < 1) {
                fadeFrameRef.current = requestAnimationFrame(tick);
            } else {
                fadeFrameRef.current = null;
            }
        };

        fadeFrameRef.current = requestAnimationFrame(tick);

        return () => {
            if (fadeFrameRef.current) {
                cancelAnimationFrame(fadeFrameRef.current);
                fadeFrameRef.current = null;
            }
        };
    }, [ambientAudio.enabled, coreMode, effectiveVolume, surfaceKey, viewLevel]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        if (!ambientAudio.enabled) {
            audioElement.pause();
            stopSyntheticAmbient.current();
            return;
        }

        if (!audioElement.src) {
            if (interactionReadyRef.current && !effectiveTrackId) {
                void startSyntheticAmbient.current();
            }
            return;
        }

        void tryPlay.current();
    }, [ambientAudio.enabled, effectiveTrackId]);

    useEffect(() => {
        if (!ambientAudio.enabled) return;

        const tryResume = () => {
            interactionReadyRef.current = true;
            const audioElement = audioRef.current;
            if (!audioElement) return;

            if (audioElement.src) {
                void tryPlay.current();
            } else if (!effectiveTrackId) {
                void startSyntheticAmbient.current();
            }
        };

        window.addEventListener('pointerdown', tryResume, { passive: true });
        window.addEventListener('touchstart', tryResume, { passive: true });
        window.addEventListener('keydown', tryResume);

        return () => {
            window.removeEventListener('pointerdown', tryResume);
            window.removeEventListener('touchstart', tryResume);
            window.removeEventListener('keydown', tryResume);
        };
    }, [ambientAudio.enabled, effectiveTrackId]);

    useEffect(() => {
        if (!ambientAudio.enabled || !autoplayBlockedRef.current) return;

        const tryResume = () => {
            const audioElement = audioRef.current;
            if (!audioElement || !audioElement.src) return;

            void tryPlay.current();
            if (!autoplayBlockedRef.current) {
                window.removeEventListener('pointerdown', tryResume);
                window.removeEventListener('keydown', tryResume);
            }
        };

        window.addEventListener('pointerdown', tryResume);
        window.addEventListener('keydown', tryResume);

        return () => {
            window.removeEventListener('pointerdown', tryResume);
            window.removeEventListener('keydown', tryResume);
        };
    }, [ambientAudio.enabled, effectiveTrackId]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;

        const handleCanPlay = () => {
            if (!ambientAudio.enabled || !audioElement.src) return;
            if (!interactionReadyRef.current && autoplayBlockedRef.current) return;

            void tryPlay.current();
        };

        audioElement.addEventListener('canplay', handleCanPlay);
        return () => audioElement.removeEventListener('canplay', handleCanPlay);
    }, [ambientAudio.enabled, effectiveTrackId]);

    // Scene change — restart synth with new chord voicing (only when no file track is active)
    useEffect(() => {
        if (effectiveTrackId) return;
        if (!ambientAudio.enabled) return;
        if (!interactionReadyRef.current) return;

        const ctx = syntheticContextRef.current;
        if (!syntheticNodesRef.current || !ctx) return;

        // Fade out current synth over 1.8s, then restart with new scene voicing
        const master = syntheticNodesRef.current.master;
        master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);

        const timer = window.setTimeout(() => {
            stopSyntheticAmbient.current();
            void startSyntheticAmbient.current(ritualSceneId);
        }, 1800);

        return () => window.clearTimeout(timer);
    }, [ritualSceneId, ambientAudio.enabled, effectiveTrackId]);

    useEffect(() => {
        const audioElement = audioRef.current;
        const stopSyntheticAmbientOnCleanup = stopSyntheticAmbient.current;

        return () => {
            if (audioElement) {
                audioElement.pause();
                audioElement.removeAttribute('src');
                audioElement.load();
            }

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            if (fadeFrameRef.current) {
                cancelAnimationFrame(fadeFrameRef.current);
                fadeFrameRef.current = null;
            }

            stopSyntheticAmbientOnCleanup();
            if (syntheticContextRef.current) {
                void syntheticContextRef.current.close();
                syntheticContextRef.current = null;
            }
        };
    }, []);

    return <audio ref={audioRef} hidden aria-hidden="true" />;
};
