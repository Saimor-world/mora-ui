/**
 * PlasmaOrb - MÔRA's body in dock, popups, search, spotlight and rooms.
 *
 * Decided 2026-09-14: MÔRA is the jade stone from the Saimôr sigil. The former
 * canvas plasma render is replaced by that exact artwork
 * (public/brand/mora-stone-v1.png, same image as MoraOrb and saimor.world).
 * The name and props stay so every caller keeps working; `color` and `state`
 * only tint the light around the stone - the stone itself is never redrawn.
 */

import React from 'react';

interface PlasmaOrbProps {
    color: string;
    state: 'idle' | 'thinking' | 'alert' | 'focus' | 'demo' | 'curious' | 'learning' | 'insight';
    size?: number;
    onClick?: () => void;
}

const PULSE: Record<string, string> = {
    thinking: '1.6s',
    alert: '0.9s',
    curious: '1.3s',
    insight: '1.1s',
    learning: '2.4s',
    focus: '2.8s',
};

function glowColor(color: string, state: PlasmaOrbProps['state']) {
    if (state === 'alert') return '#EF4444';
    if (state === 'insight') return '#F59E0B';
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#10B981';
}

export const PlasmaOrb: React.FC<PlasmaOrbProps> = ({ color, state, size = 120, onClick }) => {
    const glow = glowColor(color, state);
    const pulse = PULSE[state] ?? '4s';
    const active = state !== 'idle' && state !== 'demo';

    return (
        <div
            className="relative cursor-pointer select-none"
            style={{ width: size, height: size }}
            onClick={onClick}
            data-orb-state={state}
        >
            {/* Light around the stone: state colour, breathing. */}
            <div
                className="absolute rounded-full pointer-events-none"
                style={{
                    inset: '-22%',
                    background: `radial-gradient(circle at center, ${glow}55 0%, ${glow}1f 42%, transparent 72%)`,
                    filter: `blur(${Math.max(6, Math.round(size * 0.14))}px)`,
                    opacity: active ? 0.85 : 0.55,
                    animation: `pulse ${pulse} ease-in-out infinite`,
                }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset rendered at many small sizes */}
            <img
                src="/brand/mora-stone-v1.png"
                alt=""
                width={size}
                height={size}
                draggable={false}
                className="relative h-full w-full pointer-events-none"
                style={{ filter: `drop-shadow(0 ${Math.max(2, Math.round(size * 0.06))}px ${Math.max(4, Math.round(size * 0.16))}px rgba(0,0,0,0.45))` }}
            />
            {/* State tint inside the gold ring (not for idle - pure jade). */}
            {active && (
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        inset: '9%',
                        backgroundColor: glow,
                        mixBlendMode: 'soft-light',
                        opacity: 0.28,
                        animation: `pulse ${pulse} ease-in-out infinite`,
                    }}
                />
            )}
        </div>
    );
};
