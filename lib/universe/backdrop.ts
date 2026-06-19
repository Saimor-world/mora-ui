import type { RitualSceneId } from '@/lib/os/ritualMode';

/** Scene-reactive universe base gradients — shared by Universe + Department surfaces. */
export const UNIVERSE_BASE: Record<RitualSceneId, string> = {
    flow:   'linear-gradient(135deg, rgba(0,12,10,0.98) 0%, rgba(0,8,6,0.96) 48%, rgba(0,10,8,0.98) 100%)',
    build:  'linear-gradient(135deg, rgba(0,5,15,0.98) 0%, rgba(3,9,21,0.96) 48%, rgba(0,5,12,0.98) 100%)',
    lounge: 'linear-gradient(135deg, rgba(12,6,0,0.98) 0%, rgba(8,4,0,0.96) 48%, rgba(10,5,0,0.98) 100%)',
    night:  'linear-gradient(135deg, rgba(5,3,18,0.98) 0%, rgba(8,4,22,0.96) 48%, rgba(4,2,16,0.98) 100%)',
};

export const UNIVERSE_NEBULA: Record<RitualSceneId, string> = {
    flow: `
        radial-gradient(1180px 760px at 52% 54%, rgba(16,185,129,0.22) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(20,184,166,0.16) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(34,211,238,0.10) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(16,185,129,0.09) 0%, transparent 56%)`,
    build: `
        radial-gradient(1180px 760px at 52% 54%, rgba(56,189,248,0.22) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(99,102,241,0.16) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(251,191,36,0.10) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(56,189,248,0.09) 0%, transparent 56%)`,
    lounge: `
        radial-gradient(1180px 760px at 52% 54%, rgba(251,146,60,0.21) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(249,115,22,0.16) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(244,114,182,0.12) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(251,146,60,0.08) 0%, transparent 56%)`,
    night: `
        radial-gradient(1180px 760px at 52% 54%, rgba(99,102,241,0.23) 0%, transparent 64%),
        radial-gradient(1000px 640px at 18% 24%, rgba(139,92,246,0.17) 0%, transparent 56%),
        radial-gradient(880px 540px at 84% 20%, rgba(34,211,238,0.09) 0%, transparent 52%),
        radial-gradient(800px 480px at 22% 78%, rgba(99,102,241,0.10) 0%, transparent 56%)`,
};

export const ACCENT_STARS = Array.from({ length: 72 }, (_, index) => {
    const left = ((index * 19.7) % 96) + 2;
    const top = ((index * 13.4) % 78) + 6;
    const size = [0.9, 1.2, 1.6, 2.2, 2.8][index % 5];
    const color = [
        'rgba(255,255,255,0.92)',
        'rgba(191,219,254,0.88)',
        'rgba(167,243,208,0.78)',
        'rgba(250,204,21,0.58)',
        'rgba(196,181,253,0.64)',
    ][index % 5];
    return {
        id: `accent-star-${index}`,
        left,
        top,
        size,
        color,
        opacity: 0.34 + ((index % 6) * 0.075),
    };
});
