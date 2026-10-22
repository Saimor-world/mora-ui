"use client";

import { useOrbStore } from '@/lib/store/orbStore';
import { MoraStone } from '@/components/mora/MoraStone';
import React, { useEffect, useState, useRef } from 'react';

interface MoraOrbProps {
    role?: 'admin' | 'member' | 'manager';
    state?: 'idle' | 'watch' | 'focus' | 'thinking' | 'alert' | 'insight' | 'demo' | 'curious' | 'learning' | 'watching' | 'listening';
    demoMode?: boolean;
    onClick?: () => void;
    interactive?: boolean;
    size?: 'sm' | 'md' | 'lg';
    companyLogo?: string;
    accentColor?: string;
    notifications?: Array<{ id: string, type: 'task' | 'email' | 'insight' | 'alert', message: string }>;
    onPaneSpawn?: (type: string, position: { x: number, y: number }) => void;
    onCursorSpawn?: (action: string, target: { x: number, y: number }) => void;
}

/**
 * THE ORB — MÔRA as the stylebook stone (decided 22.10.2026).
 *
 * The stone itself is components/mora/MoraStone: matte jade, oval eyes, calm blink and
 * breath. States no longer tint or glow (stylebook: no glow, everything matte); they
 * stay readable through data-mora-state / data-mora-presence and the hover label.
 * The wrapper sizes are unchanged so layouts keep their space; the stone is capped at
 * the stylebook maximum of 96 px.
 */
const SIZE_CLASSES: Record<NonNullable<MoraOrbProps['size']>, { wrapper: string; stone: number }> = {
    sm: { wrapper: 'w-[80px] h-[80px]', stone: 64 },
    md: { wrapper: 'w-[140px] h-[140px]', stone: 96 },
    lg: { wrapper: 'w-[220px] h-[220px]', stone: 96 },
};

const STATE_LABELS: Record<string, string> = {
    idle: 'Bereit', thinking: 'Denkt nach', watch: 'Beobachtet', focus: 'Fokussiert', alert: 'Alarm',
    insight: 'Erkenntnis', demo: 'Demo', curious: 'Neugierig', learning: 'Lernt', watching: 'Beobachtet', listening: 'Hört zu',
};

export function MoraOrb({
    state = 'idle',
    size = 'md',
    companyLogo,
    onClick,
}: MoraOrbProps) {
    const [mounted, setMounted] = useState(false);
    const moraPresence = useOrbStore((s) => s.moraPresence?.state ?? "calm");
    const orbRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const sz = SIZE_CLASSES[size ?? 'md'];

    if (!mounted) return null;

    return (
        <div
            className={`relative select-none pointer-events-auto ${sz.wrapper} flex items-center justify-center`}
            ref={orbRef}
            data-mora-state={state}
            data-mora-presence={moraPresence}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <span className="sb-press relative flex cursor-pointer items-center justify-center rounded-full">
                <MoraStone size={sz.stone} thinking={state === 'thinking'} halo={isHovered} label="MÔRA" />

                {isHovered && (
                    <span className="sb-meta pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border px-4 py-2"
                        style={{ background: 'var(--sb-card)', borderColor: 'var(--sb-line)' }}>
                        MÔRA: {STATE_LABELS[state ?? ''] || state}
                    </span>
                )}

                {companyLogo && (
                    <span className="absolute z-20 flex h-12 w-12 items-center justify-center rounded-full border"
                        style={{ background: 'var(--sb-card)', borderColor: 'var(--sb-line)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- company logos can come from arbitrary upload URLs */}
                        <img src={companyLogo} alt="Logo" className="h-8 w-8 object-contain" />
                    </span>
                )}
            </span>
        </div>
    );
}
