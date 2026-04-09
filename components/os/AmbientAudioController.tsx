'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT,
    AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT,
    getAmbientAudioTrackBlob,
    listAmbientAudioTracks,
    persistAmbientAudioSettings,
    resolveAmbientAudioSettings,
    resolveAmbientSceneTrackMap,
} from '@/lib/audio/ambientAudio';
import { useMoraStore } from '@/lib/store/moraState';
import { getEffectiveRitualScene, resolveRitualSettings, RITUAL_SCENES } from '@/lib/os/ritualMode';

export const AmbientAudioController: React.FC = () => {
    const userSettings = useMoraStore((state) => state.user?.settings);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const autoplayBlockedRef = useRef(false);
    const [ambientAudio, setAmbientAudio] = useState(() => resolveAmbientAudioSettings());
    const [sceneTrackMap, setSceneTrackMap] = useState(() => resolveAmbientSceneTrackMap());
    const ritualSettings = resolveRitualSettings(userSettings);
    const ritualSceneId = getEffectiveRitualScene(ritualSettings);
    const effectiveTrackId = sceneTrackMap[ritualSceneId] || ambientAudio.trackId;
    const effectiveVolume = Math.max(
        0,
        Math.min(1, ambientAudio.volume * (RITUAL_SCENES[ritualSceneId]?.audioGain ?? 1))
    );

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
        audioElement.volume = effectiveVolume;
    }, [effectiveVolume]);

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
            audioElement.pause();
            revokeCurrentObjectUrl();

            const trackBlob = await getAmbientAudioTrackBlob(effectiveTrackId);
            if (cancelled) return;

            if (!trackBlob) {
                clearSource();
                return;
            }

            const objectUrl = URL.createObjectURL(trackBlob);
            objectUrlRef.current = objectUrl;
            audioElement.src = objectUrl;
            audioElement.volume = effectiveVolume;

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
            audioElement.pause();
        };
    }, [ambientAudio.enabled, effectiveTrackId, effectiveVolume]);

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
        };
    }, []);

    return <audio ref={audioRef} hidden aria-hidden="true" />;
};
