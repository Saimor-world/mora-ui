'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOrbStore } from '@/lib/store/orbStore';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import {
    getEffectiveRitualScene,
    RITUAL_SCENES,
    resolveRitualSettings,
    type RitualSceneId,
} from '@/lib/os/ritualMode';
import {
    AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT,
    resolveAmbientAudioSettings,
} from '@/lib/audio/ambientAudio';

type TimeBand = 'morning' | 'day' | 'evening' | 'night';

const getTimeBand = (date: Date): TimeBand => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'day';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
};

const BAND_BACKGROUNDS: Record<TimeBand, string> = {
    morning: 'radial-gradient(circle at 18% 20%, rgba(251,191,36,0.18), transparent 34%), radial-gradient(circle at 82% 18%, rgba(34,211,238,0.16), transparent 32%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.12), transparent 42%)',
    day: 'radial-gradient(circle at 22% 18%, rgba(34,211,238,0.14), transparent 34%), radial-gradient(circle at 76% 24%, rgba(59,130,246,0.12), transparent 30%), radial-gradient(circle at 52% 84%, rgba(251,191,36,0.10), transparent 46%)',
    evening: 'radial-gradient(circle at 18% 26%, rgba(251,146,60,0.18), transparent 36%), radial-gradient(circle at 80% 18%, rgba(244,114,182,0.12), transparent 30%), radial-gradient(circle at 52% 82%, rgba(168,85,247,0.12), transparent 44%)',
    night: 'radial-gradient(circle at 16% 18%, rgba(16,185,129,0.12), transparent 32%), radial-gradient(circle at 82% 16%, rgba(139,92,246,0.16), transparent 34%), radial-gradient(circle at 56% 86%, rgba(34,211,238,0.09), transparent 44%)',
};

const ORB_ACCENTS: Record<string, string> = {
    thinking: 'rgba(59,130,246,0.18)',
    alert: 'rgba(248,113,113,0.16)',
    insight: 'rgba(251,191,36,0.18)',
    focus: 'rgba(16,185,129,0.18)',
    demo: 'rgba(20,184,166,0.18)',
    idle: 'rgba(255,255,255,0.06)',
};

const SCENE_PROFILES: Record<RitualSceneId, {
    haze: string;
    orbAccent: string;
    lineAngle: number;
    grainOpacity: number;
    motionScale: number;
}> = {
    flow: {
        // Emerald-cyan: energetisch, frisch — spürbar anders als night/lounge
        haze: 'radial-gradient(circle at 20% 74%, rgba(16,185,129,0.42), transparent 38%), radial-gradient(circle at 82% 28%, rgba(34,211,238,0.34), transparent 34%)',
        orbAccent: 'rgba(34,211,238,0.40)',
        lineAngle: 115,
        grainOpacity: 0.26,
        motionScale: 1,
    },
    build: {
        // Blau-amber: strukturiert, fokussiert — warmer Gelb-Akzent gegen kühl-blaue Basis
        haze: 'radial-gradient(circle at 18% 72%, rgba(59,130,246,0.46), transparent 38%), radial-gradient(circle at 84% 20%, rgba(251,191,36,0.36), transparent 30%)',
        orbAccent: 'rgba(59,130,246,0.46)',
        lineAngle: 102,
        grainOpacity: 0.32,
        motionScale: 1.08,
    },
    lounge: {
        // Orange-rose: warm, entspannt — deutlich wärmer als alle anderen Szenen
        haze: 'radial-gradient(circle at 22% 70%, rgba(251,146,60,0.44), transparent 36%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.38), transparent 32%)',
        orbAccent: 'rgba(244,114,182,0.44)',
        lineAngle: 126,
        grainOpacity: 0.22,
        motionScale: 0.96,
    },
    night: {
        // Indigo-violet: dunkel, ruhig — klar kühler/dunkler als alle anderen
        haze: 'radial-gradient(circle at 18% 74%, rgba(99,102,241,0.48), transparent 36%), radial-gradient(circle at 84% 18%, rgba(139,92,246,0.32), transparent 32%)',
        orbAccent: 'rgba(99,102,241,0.48)',
        lineAngle: 134,
        grainOpacity: 0.28,
        motionScale: 0.9,
    },
};

export const TemporalAtmosphere: React.FC<{ paused?: boolean }> = ({ paused = false }) => {
    const orbState = useOrbStore((state) => state.orbState);
    const viewLevel = useNavStore((state) => state.viewLevel);
    const isStandardMode = useNavStore((state) => state.isStandardMode);
    const userSettings = useSessionStore((state) => state.user?.settings);
    const [now, setNow] = useState(() => new Date());
    // Reactive ambient audio state — updates when user toggles audio in settings
    const [audioActive, setAudioActive] = useState(() => {
        if (typeof window === 'undefined') return false;
        return resolveAmbientAudioSettings().enabled;
    });

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleAudioUpdate = () => setAudioActive(resolveAmbientAudioSettings().enabled);
        window.addEventListener(AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT, handleAudioUpdate);
        return () => window.removeEventListener(AMBIENT_AUDIO_SETTINGS_UPDATED_EVENT, handleAudioUpdate);
    }, []);

    const timeBand = useMemo(() => getTimeBand(now), [now]);
    const ritualSettings = useMemo(() => resolveRitualSettings(userSettings), [userSettings]);
    const ritualSceneId = useMemo(() => getEffectiveRitualScene(ritualSettings, now), [ritualSettings, now]);
    const sceneProfile = SCENE_PROFILES[ritualSceneId];
    const sceneDefinition = RITUAL_SCENES[ritualSceneId];
    const baseOpacity = viewLevel === 'core' ? 1 : viewLevel === 'space' ? 0.7 : 0.62;
    const orbAccent = ORB_ACCENTS[orbState] || sceneProfile.orbAccent || ORB_ACCENTS.idle;
    // Amplify atmosphere when ambient audio is playing (not paused)
    const liveAudio = audioActive && !paused;
    // Focus mode: orb is in 'focus' state (e.g. during guided work session)
    // Reduces peripheral drift, increases center presence — intentional & contained
    const isFocused = orbState === 'focus' && !paused;

    if (isStandardMode) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-[-8] overflow-hidden">
            {/* Layer 1: Band + scene haze — slow drift, amplified when audio is on */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `${BAND_BACKGROUNDS[timeBand]}, ${sceneProfile.haze}, radial-gradient(circle at 28% 78%, ${sceneDefinition.accent} 0%, transparent 36%), radial-gradient(circle at 84% 22%, ${sceneDefinition.aura} 0%, transparent 32%)`,
                    mixBlendMode: 'screen',
                    willChange: 'transform, opacity',
                }}
                animate={paused ? {
                    opacity: 0.50 * baseOpacity,
                    scale: 1,
                    x: '0%',
                    y: '0%',
                } : liveAudio ? {
                    // Audio on: wider drift, vivid
                    opacity: [0.80 * baseOpacity, 1.0 * baseOpacity, 0.86 * baseOpacity],
                    scale: [1, 1.10 * sceneProfile.motionScale, 1],
                    x: ['-3%', '3%', '-1.5%'],
                    y: ['0%', '-2%', '0%'],
                } : isFocused ? {
                    // Focus mode: contained, centered, minimal drift
                    opacity: [0.72 * baseOpacity, 0.92 * baseOpacity, 0.76 * baseOpacity],
                    scale: [1, 1.03 * sceneProfile.motionScale, 1],
                    x: ['-0.5%', '0.5%', '0%'],
                    y: ['0%', '-0.5%', '0%'],
                } : {
                    opacity: [0.68 * baseOpacity, 0.96 * baseOpacity, 0.72 * baseOpacity],
                    scale: [1, 1.06 * sceneProfile.motionScale, 1],
                    x: ['-2%', '2%', '-1%'],
                    y: ['0%', '-1%', '0%'],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: liveAudio ? 18 : isFocused ? 30 : 24,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    times: [0, 0.55, 1],
                }}
            />

            {/* Layer 2: Orb accent pulse — richer beat when audio active */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${orbAccent} 0%, transparent 44%)`,
                    filter: 'blur(24px)',
                    mixBlendMode: 'screen',
                    willChange: 'transform, opacity',
                }}
                animate={paused ? {
                    opacity: 0.30 * baseOpacity,
                    scale: 1,
                } : liveAudio ? {
                    // Audio: wider pulse range, more energetic
                    opacity: [0.50 * baseOpacity, 0.84 * baseOpacity, 0.55 * baseOpacity],
                    scale: [0.90, 1.18, 0.94],
                } : isFocused ? {
                    // Focus: strong, stable center glow — breathing slowly
                    opacity: [0.52 * baseOpacity, 0.78 * baseOpacity, 0.56 * baseOpacity],
                    scale: [0.96, 1.06, 0.98],
                } : {
                    opacity: [0.38 * baseOpacity, 0.68 * baseOpacity, 0.42 * baseOpacity],
                    scale: [0.92, 1.12, 0.96],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: orbState === 'alert' ? 6 : liveAudio ? 10 : isFocused ? 8 : 14,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Layer 3: Grid texture drift — unchanged, serves as structure */}
            <motion.div
                className="absolute inset-0"
                style={{
                    backgroundImage: `repeating-linear-gradient(${sceneProfile.lineAngle}deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 42px)`,
                    maskImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8) 22%, rgba(255,255,255,0.5) 78%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8) 22%, rgba(255,255,255,0.5) 78%, transparent)',
                    opacity: viewLevel === 'core' ? sceneProfile.grainOpacity : sceneProfile.grainOpacity * 0.7,
                    mixBlendMode: 'overlay',
                    willChange: paused ? 'auto' : 'transform, opacity',
                }}
                animate={paused ? { x: '0%', opacity: 0.10 } : {
                    x: ['0%', '1.5%', '0%'],
                    opacity: [0.08, 0.16, 0.08],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: 18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Layer 4: Deep scene orb glow — blooms wider with audio */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at 50% 56%, ${sceneProfile.orbAccent} 0%, transparent 52%)`,
                    filter: 'blur(70px)',
                    mixBlendMode: 'screen',
                    willChange: 'transform, opacity',
                }}
                animate={paused ? {
                    opacity: 0.18 * baseOpacity,
                    scale: 1,
                } : liveAudio ? {
                    // Audio: deep glow blooms with the music
                    opacity: [0.32 * baseOpacity, 0.58 * baseOpacity, 0.36 * baseOpacity],
                    scale: [0.92, 1.14, 0.98],
                } : isFocused ? {
                    // Focus: warm, steady glow at center — grounding presence
                    opacity: [0.30 * baseOpacity, 0.50 * baseOpacity, 0.34 * baseOpacity],
                    scale: [0.96, 1.04, 0.98],
                } : {
                    opacity: [0.24 * baseOpacity, 0.46 * baseOpacity, 0.28 * baseOpacity],
                    scale: [0.94, 1.08, 0.98],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: liveAudio ? 15 : isFocused ? 12 : 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
};
