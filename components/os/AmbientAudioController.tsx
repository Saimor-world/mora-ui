'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    AMBIENT_AUDIO_LIBRARY_UPDATED_EVENT,
    AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT,
    getAmbientAudioTrackBlob,
    resolveAmbientAudioSettings,
    resolveAmbientSceneTrackMap,
} from '@/lib/audio/ambientAudio';
import { useMoraStore } from '@/lib/store/moraState';
import { getEffectiveRitualScene, resolveRitualSettings, RITUAL_SCENES } from '@/lib/os/ritualMode';

export const AmbientAudioController: React.FC = () => {
    const userSettings = useMoraStore((state) => state.user?.settings);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
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
                } catch {
                    // Browsers may block autoplay until the user has interacted with the page.
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
            // Browsers may block autoplay until the user has interacted with the page.
        });
    }, [ambientAudio.enabled]);

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
