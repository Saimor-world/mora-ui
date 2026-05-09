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
        haze: 'radial-gradient(circle at 20% 74%, rgba(16,185,129,0.16), transparent 38%), radial-gradient(circle at 82% 28%, rgba(34,211,238,0.12), transparent 34%)',
        orbAccent: 'rgba(34,211,238,0.16)',
        lineAngle: 115,
        grainOpacity: 0.14,
        motionScale: 1,
    },
    build: {
        haze: 'radial-gradient(circle at 18% 72%, rgba(59,130,246,0.18), transparent 38%), radial-gradient(circle at 84% 20%, rgba(251,191,36,0.14), transparent 30%)',
        orbAccent: 'rgba(59,130,246,0.18)',
        lineAngle: 102,
        grainOpacity: 0.18,
        motionScale: 1.08,
    },
    lounge: {
        haze: 'radial-gradient(circle at 22% 70%, rgba(251,146,60,0.16), transparent 36%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.14), transparent 32%)',
        orbAccent: 'rgba(244,114,182,0.16)',
        lineAngle: 126,
        grainOpacity: 0.12,
        motionScale: 0.96,
    },
    night: {
        haze: 'radial-gradient(circle at 18% 74%, rgba(99,102,241,0.18), transparent 36%), radial-gradient(circle at 84% 18%, rgba(34,211,238,0.10), transparent 32%)',
        orbAccent: 'rgba(99,102,241,0.18)',
        lineAngle: 134,
        grainOpacity: 0.16,
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
                    opacity: [0.55 * baseOpacity, 0.88 * baseOpacity, 0.62 * baseOpacity],
                    scale: [1, 1.10 * sceneProfile.motionScale, 1],
                    x: ['-3%', '3%', '-1.5%'],
                    y: ['0%', '-2%', '0%'],
                } : {
                    opacity: [0.45 * baseOpacity, 0.72 * baseOpacity, 0.5 * baseOpacity],
                    scale: [1, 1.06 * sceneProfile.motionScale, 1],
                    x: ['-2%', '2%', '-1%'],
                    y: ['0%', '-1%', '0%'],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: liveAudio ? 18 : 24,
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
                    opacity: 0.25 * baseOpacity,
                    scale: 1,
                } : liveAudio ? {
                    opacity: [0.28 * baseOpacity, 0.58 * baseOpacity, 0.32 * baseOpacity],
                    scale: [0.90, 1.18, 0.94],
                } : {
                    opacity: [0.18 * baseOpacity, 0.42 * baseOpacity, 0.2 * baseOpacity],
                    scale: [0.92, 1.12, 0.96],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: orbState === 'alert' ? 6 : liveAudio ? 10 : 14,
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
                    opacity: 0.10 * baseOpacity,
                    scale: 1,
                } : liveAudio ? {
                    opacity: [0.14 * baseOpacity, 0.30 * baseOpacity, 0.16 * baseOpacity],
                    scale: [0.92, 1.14, 0.98],
                } : {
                    opacity: [0.08 * baseOpacity, 0.18 * baseOpacity, 0.1 * baseOpacity],
                    scale: [0.94, 1.08, 0.98],
                }}
                transition={paused ? { duration: 0.4 } : {
                    duration: liveAudio ? 15 : 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
};
