'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getAmbientAudioTrackBlob, resolveAmbientAudioSettings } from '@/lib/audio/ambientAudio';
import { useMoraStore } from '@/lib/store/moraState';

export const AmbientAudioController: React.FC = () => {
    const userSettings = useMoraStore((state) => state.user?.settings);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [ambientAudio, setAmbientAudio] = useState(() => resolveAmbientAudioSettings());

    useEffect(() => {
        setAmbientAudio(resolveAmbientAudioSettings(userSettings));
    }, [userSettings]);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return;
        audioElement.loop = true;
        audioElement.volume = ambientAudio.volume;
    }, [ambientAudio.volume]);

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

        if (!ambientAudio.trackId) {
            clearSource();
            return () => {
                cancelled = true;
            };
        }

        const syncTrack = async () => {
            audioElement.pause();
            revokeCurrentObjectUrl();

            const trackBlob = await getAmbientAudioTrackBlob(ambientAudio.trackId as string);
            if (cancelled) return;

            if (!trackBlob) {
                clearSource();
                return;
            }

            const objectUrl = URL.createObjectURL(trackBlob);
            objectUrlRef.current = objectUrl;
            audioElement.src = objectUrl;
            audioElement.volume = ambientAudio.volume;

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
        };
    }, [ambientAudio.trackId]);

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
        return () => {
            const audioElement = audioRef.current;
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
