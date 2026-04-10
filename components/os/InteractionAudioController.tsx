'use client';

import React, { useEffect, useRef } from 'react';

const CLICKABLE_SELECTOR = [
    'button',
    'a',
    '[role="button"]',
    '[data-interaction-sound]',
].join(',');

export const InteractionAudioController: React.FC = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastPlayedAtRef = useRef(0);

    useEffect(() => {
        const ensureContext = async () => {
            if (typeof window === 'undefined') return null;
            if (audioContextRef.current) {
                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume().catch(() => null);
                }
                return audioContextRef.current;
            }

            const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctx) return null;

            const context = new Ctx();
            if (context.state === 'suspended') {
                await context.resume().catch(() => null);
            }
            audioContextRef.current = context;
            return context;
        };

        const playUiTick = async (intensity: 'soft' | 'firm' = 'soft') => {
            const now = performance.now();
            if (now - lastPlayedAtRef.current < 48) return;
            lastPlayedAtRef.current = now;

            const context = await ensureContext();
            if (!context) return;

            const startedAt = context.currentTime;
            const oscillator = context.createOscillator();
            const harmonic = context.createOscillator();
            const gain = context.createGain();
            const harmonicGain = context.createGain();
            const filter = context.createBiquadFilter();

            oscillator.type = intensity === 'firm' ? 'triangle' : 'sine';
            oscillator.frequency.setValueAtTime(intensity === 'firm' ? 520 : 420, startedAt);
            oscillator.frequency.exponentialRampToValueAtTime(intensity === 'firm' ? 740 : 560, startedAt + 0.055);
            harmonic.type = 'sine';
            harmonic.frequency.setValueAtTime(intensity === 'firm' ? 880 : 640, startedAt);
            harmonic.frequency.exponentialRampToValueAtTime(intensity === 'firm' ? 1160 : 820, startedAt + 0.05);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, startedAt);

            gain.gain.setValueAtTime(0.0001, startedAt);
            gain.gain.exponentialRampToValueAtTime(intensity === 'firm' ? 0.048 : 0.032, startedAt + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + (intensity === 'firm' ? 0.19 : 0.15));
            harmonicGain.gain.setValueAtTime(0.0001, startedAt);
            harmonicGain.gain.exponentialRampToValueAtTime(intensity === 'firm' ? 0.014 : 0.009, startedAt + 0.018);
            harmonicGain.gain.exponentialRampToValueAtTime(0.0001, startedAt + (intensity === 'firm' ? 0.17 : 0.13));

            oscillator.connect(filter);
            harmonic.connect(filter);
            filter.connect(gain);
            filter.connect(harmonicGain);
            gain.connect(context.destination);
            harmonicGain.connect(context.destination);

            oscillator.start(startedAt);
            harmonic.start(startedAt);
            oscillator.stop(startedAt + (intensity === 'firm' ? 0.18 : 0.14));
            harmonic.stop(startedAt + (intensity === 'firm' ? 0.16 : 0.12));
        };

        const resolveTarget = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return null;
            return target.closest(CLICKABLE_SELECTOR);
        };

        const onPointerDown = (event: PointerEvent) => {
            const target = resolveTarget(event.target);
            if (!target) return;
            if (target instanceof HTMLInputElement && target.type === 'range') return;
            void playUiTick(target.matches('[data-interaction-sound="firm"]') ? 'firm' : 'soft');
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const target = resolveTarget(event.target);
            if (!target) return;
            void playUiTick(target.matches('[data-interaction-sound="firm"]') ? 'firm' : 'soft');
        };

        window.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('keydown', onKeyDown, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, []);

    return null;
};
