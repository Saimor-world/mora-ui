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
import { useMoraStore } from '@/lib/store/moraState';
import { getEffectiveRitualScene, resolveRitualSettings, RITUAL_SCENES } from '@/lib/os/ritualMode';

export const AmbientAudioController: React.FC = () => {
    const userSettings = useMoraStore((state) => state.user?.settings);
    const coreMode = useMoraStore((state) => state.coreMode);
    const viewLevel = useMoraStore((state) => state.viewLevel);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const currentTrackIdRef = useRef<string | null>(null);
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
        ? (coreMode === 'home' ? 0.18 : 1)
        : 0.08;
    const effectiveVolume = Math.max(0, Math.min(1, baseVolume * surfaceVolumeMultiplier));

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
            return () => {
                cancelled = true;
            };
        }

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
            audioElement.volume = 0.001;

            if (ambientAudio.enabled) {
                try {
                    await audioElement.play();
                    autoplayBlockedRef.current = false;
                } catch {
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
            audioElement.volume = startVolume + ((targetVolume - startVolume) * eased);
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
            return;
        }

        if (!audioElement.src) return;

        audioElement.play().catch(() => {
            autoplayBlockedRef.current = true;
        });
    }, [ambientAudio.enabled]);

    useEffect(() => {
        if (!ambientAudio.enabled) return;

        const tryResume = () => {
            interactionReadyRef.current = true;
            const audioElement = audioRef.current;
            if (!audioElement || !audioElement.src) return;

            audioElement.play()
                .then(() => {
                    autoplayBlockedRef.current = false;
                })
                .catch(() => {
                    autoplayBlockedRef.current = true;
                });
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

            audioElement.play()
                .then(() => {
                    autoplayBlockedRef.current = false;
                    window.removeEventListener('pointerdown', tryResume);
                    window.removeEventListener('keydown', tryResume);
                })
                .catch(() => {
                    // Keep waiting for a browser-accepted gesture.
                });
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
        };
    }, []);

    return <audio ref={audioRef} hidden aria-hidden="true" />;
};
